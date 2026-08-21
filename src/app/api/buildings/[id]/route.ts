import { NextResponse } from 'next/server';
import { getBuildingById, updateBuilding, deleteBuilding } from '../../../../lib/api/buildings';
import { requireAdmin } from '@/lib/api-auth';
import { logActivitySafe } from '@/lib/services/activity-logger';

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
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const buildingData = await request.json();
    const before = await getBuildingById(id);

    if (buildingData.city != null || buildingData.state != null) {
      const regionName = buildingData.state ?? before?.state;
      const cityName = buildingData.city ?? before?.city;
      if (regionName && cityName) {
        const { validateCityInRegion } = await import('@/lib/api/addresses');
        const locationOk = await validateCityInRegion(regionName, cityName);
        if (!locationOk) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid location',
              details: 'Please select a valid region and city from the list',
            },
            { status: 400 }
          );
        }
      }
    }

    const building = await updateBuilding(id, buildingData);

    if (Object.prototype.hasOwnProperty.call(buildingData, 'showOnLandingNearby')) {
      const { invalidatePublicPortfolioCache } = await import('@/lib/cache/memory-cache');
      invalidatePublicPortfolioCache();
    }

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'building.updated',
      category: 'buildings',
      entityType: 'building',
      entityId: id,
      entityLabel: building.name || before?.name || id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: building as unknown as Record<string, unknown>,
      link: `/admin/buildings/${id}`,
      metadata: { link: `/admin/buildings/${id}` },
    });
    
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
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const before = await getBuildingById(id);
    
    await deleteBuilding(id);

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'building.deleted',
      category: 'buildings',
      entityType: 'building',
      entityId: id,
      entityLabel: before?.name || id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: null,
      link: '/admin/buildings',
      metadata: { link: '/admin/buildings' },
    });
    
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