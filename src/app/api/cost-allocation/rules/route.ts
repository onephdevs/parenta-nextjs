import { NextRequest, NextResponse } from 'next/server';
import { getAllocationRules, createOrUpdateAllocationRule } from '../../../../lib/api/costAllocation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId');

    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      );
    }

    const rules = await getAllocationRules(buildingId);

    return NextResponse.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error fetching allocation rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allocation rules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buildingId, utilityType, allocationMethod, includeCommonAreas, commonAreaPercentage } = body;

    if (!buildingId || !utilityType || !allocationMethod) {
      return NextResponse.json(
        { error: 'Building ID, utility type, and allocation method are required' },
        { status: 400 }
      );
    }

    const rule = await createOrUpdateAllocationRule({
      buildingId,
      utilityType,
      allocationMethod,
      includeCommonAreas,
      commonAreaPercentage
    });

    return NextResponse.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Error creating/updating allocation rule:', error);
    return NextResponse.json(
      { error: 'Failed to create/update allocation rule' },
      { status: 500 }
    );
  }
} 