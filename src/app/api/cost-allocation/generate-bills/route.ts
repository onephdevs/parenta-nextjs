import { NextRequest, NextResponse } from 'next/server';
import { generateTenantUtilityBills, calculateCostAllocation } from '../../../../lib/api/costAllocation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      utilityBillId, 
      allocationMethod, 
      includeCommonAreas = true, 
      commonAreaPercentage = 20.0,
      dueDate 
    } = body;

    if (!utilityBillId || !allocationMethod) {
      return NextResponse.json(
        { error: 'Utility bill ID and allocation method are required' },
        { status: 400 }
      );
    }

    // First calculate the allocation
    const allocations = await calculateCostAllocation(
      utilityBillId,
      allocationMethod,
      includeCommonAreas,
      commonAreaPercentage
    );

    // Then generate the tenant bills
    const tenantBills = await generateTenantUtilityBills(
      utilityBillId,
      allocations,
      dueDate ? new Date(dueDate) : undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        tenantBills,
        summary: {
          totalBills: tenantBills.length,
          totalAmount: tenantBills.reduce((sum, bill) => sum + bill.allocatedAmount, 0),
          allocationMethod
        }
      }
    });
  } catch (error) {
    console.error('Error generating tenant utility bills:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate tenant utility bills' },
      { status: 500 }
    );
  }
} 