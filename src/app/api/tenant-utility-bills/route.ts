import { NextRequest, NextResponse } from 'next/server';
import { getTenantUtilityBills, updateTenantUtilityBillStatus } from '../../../lib/api/costAllocation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      tenantId: searchParams.get('tenantId') || undefined,
      buildingId: searchParams.get('buildingId') || undefined,
      utilityType: searchParams.get('utilityType') || undefined,
      billStatus: searchParams.get('billStatus') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    const result = await getTenantUtilityBills(filters);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching tenant utility bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant utility bills' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { billId, status, paidDate } = body;

    if (!billId || !status) {
      return NextResponse.json(
        { error: 'Bill ID and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'sent', 'paid', 'overdue'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updatedBill = await updateTenantUtilityBillStatus(
      billId,
      status,
      paidDate ? new Date(paidDate) : undefined
    );

    return NextResponse.json({
      success: true,
      data: updatedBill
    });
  } catch (error) {
    console.error('Error updating tenant utility bill:', error);
    return NextResponse.json(
      { error: 'Failed to update tenant utility bill' },
      { status: 500 }
    );
  }
} 