import { NextResponse } from 'next/server';
import { getAllBuildings, createBuilding } from '@/lib/api/buildings';
import { requireAdmin } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const buildingsData = await getAllBuildings({ limit: 1000 }); // Get all buildings for API

    return NextResponse.json({
      success: true,
      data: {
        buildings: buildingsData.buildings,
        pagination: buildingsData.pagination,
      },
    });
  } catch (error) {
    console.error('Buildings API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch buildings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const buildingData = await request.json();

    // Basic validation
    if (
      !buildingData.name ||
      !buildingData.addressLine1 ||
      !buildingData.city ||
      !buildingData.state ||
      !buildingData.postalCode
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'Name, address, city, state, and postal code are required',
        },
        { status: 400 }
      );
    }

    const building = await createBuilding(buildingData);

    return NextResponse.json({
      success: true,
      data: building,
      message: 'Building created successfully',
    });
  } catch (error) {
    console.error('Create building error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create building',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
