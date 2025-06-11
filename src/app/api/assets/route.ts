import { NextRequest, NextResponse } from 'next/server';
import { getAllAssets, createAsset } from '@/lib/api/assets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      buildingId: searchParams.get('buildingId') || undefined,
      assetType: searchParams.get('assetType') || undefined,
      assetStatus: searchParams.get('assetStatus') || undefined,
      assetCondition: searchParams.get('assetCondition') || undefined,
      searchTerm: searchParams.get('searchTerm') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const result = await getAllAssets(filters);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch assets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Parse dates if provided
    const assetData = {
      ...body,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
      lastMaintenanceDate: body.lastMaintenanceDate ? new Date(body.lastMaintenanceDate) : undefined,
      nextMaintenanceDate: body.nextMaintenanceDate ? new Date(body.nextMaintenanceDate) : undefined,
      assetCondition: body.assetCondition || 'good',
      assetStatus: body.assetStatus || 'available',
      isActive: body.isActive !== undefined ? body.isActive : true
    };

    const asset = await createAsset(assetData);
    
    return NextResponse.json({
      success: true,
      data: asset
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 