import { NextResponse } from 'next/server';
import { getAllBuildings, createBuilding } from '@/lib/api/buildings';
import { requireAdmin } from '@/lib/api-auth';
import { logActivitySafe } from '@/lib/services/activity-logger';

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const limitRaw = Number(new URL(request.url).searchParams.get('limit') || 100);
    const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 100));
    const buildingsData = await getAllBuildings({ limit });

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
    const { session, error } = await requireAdmin();
    if (error) return error;

    const buildingData = await request.json();

    // Basic validation
    if (
      !buildingData.name ||
      !buildingData.city ||
      !buildingData.state
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'Name, city, and region are required',
        },
        { status: 400 }
      );
    }

    const { validateCityInRegion } = await import('@/lib/api/addresses');
    const locationOk = await validateCityInRegion(buildingData.state, buildingData.city);
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

    const { mapsFieldsFromAdminInput } = await import(
      '@/lib/maps/resolve-google-maps-location'
    );
    const mapsFields = await mapsFieldsFromAdminInput(buildingData);
    if (!mapsFields.ok) {
      return NextResponse.json(
        {
          success: false,
          error: mapsFields.error,
          details: mapsFields.error,
        },
        { status: 400 }
      );
    }
    if (!mapsFields.skipped) {
      buildingData.latitude = mapsFields.latitude;
      buildingData.longitude = mapsFields.longitude;
      buildingData.googleMapsUrl = mapsFields.googleMapsUrl;
    }

    const building = await createBuilding(buildingData);
    const buildingId = String(building.id || '');

    if (!mapsFields.skipped) {
      const { invalidatePublicPortfolioCache } = await import('@/lib/cache/memory-cache');
      invalidatePublicPortfolioCache();
    }

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'building.created',
      category: 'buildings',
      entityType: 'building',
      entityId: buildingId || null,
      entityLabel: building.name || buildingData.name,
      afterData: building as unknown as Record<string, unknown>,
      link: buildingId ? `/admin/buildings/${buildingId}` : '/admin/buildings',
      metadata: { link: buildingId ? `/admin/buildings/${buildingId}` : '/admin/buildings' },
    });

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
