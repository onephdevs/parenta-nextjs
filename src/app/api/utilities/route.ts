import { NextRequest, NextResponse } from 'next/server';
import { getAllUtilityBills, createUtilityBill } from '../../../lib/api/utilities';
import { CreateUtilityBillData } from '../../../types/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters = {
      buildingId: searchParams.get('buildingId') || undefined,
      utilityType: searchParams.get('utilityType') || undefined,
      billStatus: searchParams.get('billStatus') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const result = await getAllUtilityBills(filters);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/utilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch utility bills' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateUtilityBillData = await request.json();
    
    // Validate required fields
    if (!body.buildingId || !body.utilityType || !body.providerName || 
        !body.amount || !body.billingPeriodStart || !body.billingPeriodEnd || !body.dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields: buildingId, utilityType, providerName, amount, billingPeriodStart, billingPeriodEnd, dueDate' },
        { status: 400 }
      );
    }

    // Convert date strings to Date objects
    const utilityData: CreateUtilityBillData = {
      ...body,
      billingPeriodStart: new Date(body.billingPeriodStart),
      billingPeriodEnd: new Date(body.billingPeriodEnd),
      dueDate: new Date(body.dueDate),
    };

    const newBill = await createUtilityBill(utilityData);
    
    return NextResponse.json(newBill, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/utilities:', error);
    return NextResponse.json(
      { error: 'Failed to create utility bill' },
      { status: 500 }
    );
  }
} 