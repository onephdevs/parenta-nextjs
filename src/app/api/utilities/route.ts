import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUtilityBills, createUtilityBill, getUtilityBillSummary } from '@/lib/api/utilities';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Check if summary is requested
    if (searchParams.get('summary') === 'true') {
      const filters = {
        buildingId: searchParams.get('buildingId') ? parseInt(searchParams.get('buildingId')!) : undefined,
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
      };
      
      const summary = await getUtilityBillSummary(filters);
      return NextResponse.json({ success: true, data: summary });
    }

    // Regular listing
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const filters = {
      buildingId: searchParams.get('buildingId') ? parseInt(searchParams.get('buildingId')!) : undefined,
      roomId: searchParams.get('roomId') ? parseInt(searchParams.get('roomId')!) : undefined,
      utilityType: searchParams.get('utilityType') || undefined,
      billStatus: searchParams.get('billStatus') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const result = await getUtilityBills(filters, page, limit);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching utility bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch utility bills' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const { buildingId, utilityType, amount, billingPeriodStart, billingPeriodEnd, dueDate, provider } = body;
    
    if (!buildingId || !utilityType || !amount || !billingPeriodStart || !billingPeriodEnd || !dueDate || !provider) {
      return NextResponse.json(
        { error: 'Missing required fields: buildingId, utilityType, amount, billingPeriodStart, billingPeriodEnd, dueDate, provider' },
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

    // Validate utility type
    const validTypes = ['electricity', 'water', 'gas', 'internet', 'cable', 'waste', 'other'];
    if (!validTypes.includes(utilityType)) {
      return NextResponse.json(
        { error: 'Invalid utility type' },
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
      buildingId: parseInt(buildingId),
      roomId: body.roomId ? parseInt(body.roomId) : undefined,
      utilityType,
      amount: amountNum,
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
      dueDate: dueDateObj,
      billStatus: body.billStatus || 'pending',
      provider,
      accountNumber: body.accountNumber || undefined,
      meterReading: body.meterReading ? parseFloat(body.meterReading) : undefined,
      notes: body.notes || undefined,
    };

    const bill = await createUtilityBill(billData);
    
    return NextResponse.json({ 
      success: true,
      data: bill,
      message: 'Utility bill created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating utility bill:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create utility bill' },
      { status: 500 }
    );
  }
}
