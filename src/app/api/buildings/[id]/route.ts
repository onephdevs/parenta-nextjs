import { NextResponse } from 'next/server';
import { getBuildingById, updateBuilding, deleteBuilding } from '../../../../lib/api/buildings';
import { requireAdmin } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    
    const building = await getBuildingById(id);
    
    if (!building) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Building not found'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: building
    });
  } catch (error) {
    console.error('Get building error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch building',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const buildingData = await request.json();
    
    const building = await updateBuilding(id, buildingData);
    
    return NextResponse.json({
      success: true,
      data: building,
      message: 'Building updated successfully'
    });
  } catch (error) {
    console.error('Update building error:', error);
    
    const status = error instanceof Error && error.message === 'Building not found' ? 404 : 500;
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update building',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    
    await deleteBuilding(id);
    
    return NextResponse.json({
      success: true,
      message: 'Building deleted successfully'
    });
  } catch (error) {
    console.error('Delete building error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete building',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 