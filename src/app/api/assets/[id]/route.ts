import { NextRequest, NextResponse } from 'next/server';
import { getAssetById, updateAsset, deleteAsset } from '@/lib/api/assets';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await getAssetById(id);
    
    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.assetName || !body.assetType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Asset name and type are required' 
        },
        { status: 400 }
      );
    }

    // Parse dates and numbers if provided
    const assetData = {
      ...body,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
      lastMaintenanceDate: body.lastMaintenanceDate ? new Date(body.lastMaintenanceDate) : undefined,
      nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : undefined,
      purchasePrice: body.purchasePrice ? parseFloat(body.purchasePrice) : undefined,
      currentValue: body.currentValue ? parseFloat(body.currentValue) : undefined,
      rentalRate: body.rentalRate ? parseFloat(body.rentalRate) : undefined,
      assetCondition: body.assetCondition || 'good',
      assetStatus: body.assetStatus || 'available',
      isActive: body.isActive !== undefined ? body.isActive : true
    };

    const asset = await updateAsset(id, assetData);
    
    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteAsset(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 