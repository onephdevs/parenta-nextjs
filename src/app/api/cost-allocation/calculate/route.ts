import { NextRequest, NextResponse } from 'next/server';
import { calculateCostAllocation } from '../../../../lib/api/costAllocation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      utilityBillId, 
      allocationMethod, 
      includeCommonAreas = true, 
      commonAreaPercentage = 20.0 
    } = body;

    if (!utilityBillId || !allocationMethod) {
      return NextResponse.json(
        { error: 'Utility bill ID and allocation method are required' },
        { status: 400 }
      );
    }

    const validMethods = ['equal', 'usage', 'room_size', 'custom'];
    if (!validMethods.includes(allocationMethod)) {
      return NextResponse.json(
        { error: 'Invalid allocation method' },
        { status: 400 }
      );
    }

    const allocations = await calculateCostAllocation(
      utilityBillId,
      allocationMethod,
      includeCommonAreas,
      commonAreaPercentage
    );

    return NextResponse.json({
      success: true,
      data: {
        allocations,
        summary: {
          totalTenants: allocations.length,
          totalAmount: allocations.reduce((sum, a) => sum + a.allocatedAmount, 0),
          allocationMethod,
          includeCommonAreas,
          commonAreaPercentage
        }
      }
    });
  } catch (error) {
    console.error('Error calculating cost allocation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate cost allocation' },
      { status: 500 }
    );
  }
} 