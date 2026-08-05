import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getRoomUtilityBills,
  createRoomUtilityBill,
  updateRoomUtilityBill,
  deleteRoomUtilityBill,
} from '@/lib/api/room-utility-bills';
import {
  ALLOCATION_METHODS,
  AllocationMethod,
  normalizeAllocationMethod,
} from '@/lib/constants/bills-expenses';

/**
 * GET /api/utility-bills/room
 * List utility bills (unit-specific and building-wide)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const unitScopedParam = searchParams.get('unitScoped');

    const filters = {
      roomId: searchParams.get('roomId') || undefined,
      buildingId: searchParams.get('buildingId') || undefined,
      utilityType:
        (searchParams.get('utilityType') as 'electricity' | 'water' | undefined) ||
        undefined,
      billStatus: searchParams.get('billStatus') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      unitScoped:
        unitScopedParam === 'true'
          ? true
          : unitScopedParam === 'false'
            ? false
            : undefined,
      includeChildAllocations: searchParams.get('includeChildren') === 'true',
    };

    const result = await getRoomUtilityBills(filters, page, limit);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching utility bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch utility bills' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/utility-bills/room
 * Create a utility bill (unit optional — omit roomId for building-wide / common area)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      roomId,
      buildingId,
      utilityType,
      amount,
      billingPeriodStart,
      billingPeriodEnd,
      dueDate,
      providerName,
      allocationMethod,
      distributeAcrossUnits,
    } = body;

    if (
      !utilityType ||
      amount == null ||
      !billingPeriodStart ||
      !billingPeriodEnd ||
      !dueDate
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: utilityType, amount, billingPeriodStart, billingPeriodEnd, dueDate',
        },
        { status: 400 }
      );
    }

    if (!roomId && !buildingId) {
      return NextResponse.json(
        { error: 'Either roomId or buildingId is required' },
        { status: 400 }
      );
    }

    if (utilityType !== 'electricity' && utilityType !== 'water') {
      return NextResponse.json(
        { error: 'Utility type must be electricity or water' },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const startDate = new Date(billingPeriodStart);
    const endDate = new Date(billingPeriodEnd);
    const dueDateObj = new Date(dueDate);

    if (
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime()) ||
      isNaN(dueDateObj.getTime())
    ) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'Billing period end must be on or after start' },
        { status: 400 }
      );
    }

    let method: AllocationMethod | undefined;
    if (allocationMethod) {
      if (!(ALLOCATION_METHODS as readonly string[]).includes(allocationMethod)) {
        return NextResponse.json(
          { error: `allocationMethod must be one of: ${ALLOCATION_METHODS.join(', ')}` },
          { status: 400 }
        );
      }
      method = allocationMethod as AllocationMethod;
    } else {
      method = normalizeAllocationMethod(undefined, Boolean(roomId));
    }

    const bill = await createRoomUtilityBill({
      roomId: roomId || null,
      buildingId: buildingId || undefined,
      utilityType,
      amount: amountNum,
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
      dueDate: dueDateObj,
      providerName: providerName || undefined,
      providerAccountNumber: body.providerAccountNumber || undefined,
      usageAmount: body.usageAmount ? parseFloat(body.usageAmount) : undefined,
      usageUnit: body.usageUnit || undefined,
      meterReadingPrevious:
        body.meterReadingPrevious != null
          ? parseFloat(body.meterReadingPrevious)
          : undefined,
      meterReadingCurrent:
        body.meterReadingCurrent != null
          ? parseFloat(body.meterReadingCurrent)
          : undefined,
      allocationMethod: method,
      billStatus: body.billStatus || 'pending',
      billUrl: body.billUrl || undefined,
      notes: body.notes || undefined,
      distributeAcrossUnits:
        distributeAcrossUnits === undefined ? true : Boolean(distributeAcrossUnits),
    });

    return NextResponse.json(
      {
        success: true,
        data: bill,
        message: 'Utility bill created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating utility bill:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to create utility bill' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/utility-bills/room
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    const bill = await updateRoomUtilityBill(id, updates);

    return NextResponse.json({
      success: true,
      data: bill,
      message: 'Utility bill updated successfully',
    });
  } catch (error) {
    console.error('Error updating utility bill:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update utility bill' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/utility-bills/room
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    await deleteRoomUtilityBill(id);

    return NextResponse.json({
      success: true,
      message: 'Utility bill deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting utility bill:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to delete utility bill' },
      { status: 500 }
    );
  }
}
