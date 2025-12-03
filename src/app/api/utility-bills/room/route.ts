import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getRoomUtilityBills,
  createRoomUtilityBill,
  updateRoomUtilityBill,
  deleteRoomUtilityBill,
} from '@/lib/api/room-utility-bills';

/**
 * GET /api/utility-bills/room
 * Get room-level utility bills (electric/water)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const filters = {
      roomId: searchParams.get('roomId') || undefined,
      buildingId: searchParams.get('buildingId') || undefined,
      utilityType: (searchParams.get('utilityType') as 'electricity' | 'water' | undefined) || undefined,
      billStatus: searchParams.get('billStatus') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const result = await getRoomUtilityBills(filters, page, limit);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching room utility bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room utility bills' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/utility-bills/room
 * Create a room-level utility bill (electric/water)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const { roomId, utilityType, amount, billingPeriodStart, billingPeriodEnd, dueDate, providerName } = body;
    
    if (!roomId || !utilityType || !amount || !billingPeriodStart || !billingPeriodEnd || !dueDate || !providerName) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, utilityType, amount, billingPeriodStart, billingPeriodEnd, dueDate, providerName' },
        { status: 400 }
      );
    }

    // Validate utility type (only electricity or water for room bills)
    if (utilityType !== 'electricity' && utilityType !== 'water') {
      return NextResponse.json(
        { error: 'Utility type must be electricity or water for room bills' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(billingPeriodStart);
    const endDate = new Date(billingPeriodEnd);
    const dueDateObj = new Date(dueDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(dueDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'Billing period end must be after start' },
        { status: 400 }
      );
    }

    const billData = {
      roomId,
      utilityType,
      amount: amountNum,
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
      dueDate: dueDateObj,
      providerName,
      providerAccountNumber: body.providerAccountNumber || undefined,
      usageAmount: body.usageAmount ? parseFloat(body.usageAmount) : undefined,
      usageUnit: body.usageUnit || undefined,
      billStatus: body.billStatus || 'pending',
      billUrl: body.billUrl || undefined,
      notes: body.notes || undefined,
    };

    const bill = await createRoomUtilityBill(billData);
    
    return NextResponse.json({ 
      success: true,
      data: bill,
      message: 'Room utility bill created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating room utility bill:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create room utility bill' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/utility-bills/room
 * Update a room utility bill
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
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    const bill = await updateRoomUtilityBill(id, updates);
    
    return NextResponse.json({ 
      success: true,
      data: bill,
      message: 'Room utility bill updated successfully'
    });
  } catch (error) {
    console.error('Error updating room utility bill:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update room utility bill' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/utility-bills/room
 * Delete a room utility bill
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
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    await deleteRoomUtilityBill(id);
    
    return NextResponse.json({ 
      success: true,
      message: 'Room utility bill deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room utility bill:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete room utility bill' },
      { status: 500 }
    );
  }
}
