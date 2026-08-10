import { NextRequest, NextResponse } from 'next/server';
import { ensureBuildingCoordinates } from '@/lib/maps/geocode';
import { parseAmenityCategories } from '@/lib/maps/nearby-amenities';
import { getNearbyAmenitiesForBuilding } from '@/lib/maps/nearby-snapshot';
import { invalidatePublicPortfolioCache } from '@/lib/cache/memory-cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/nearby?buildingId=&categories=school,park
 * Uses DB snapshot when fresh (admin: nearby_refresh_days, default 7).
 * Pass refresh=1 to force a live Overpass refresh.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId')?.trim();
    if (!buildingId) {
      return NextResponse.json(
        { success: false, error: 'buildingId is required' },
        { status: 400 }
      );
    }

    const categories = parseAmenityCategories(searchParams.get('categories'));
    const forceRefresh =
      searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true';

    const location = await ensureBuildingCoordinates(buildingId);
    if (!location) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Could not locate this property on the map. Check that the building has a complete address.',
        },
        { status: 404 }
      );
    }

    if (location.newlyGeocoded) {
      invalidatePublicPortfolioCache();
    }

    const data = await getNearbyAmenitiesForBuilding({
      building: location,
      categories,
      forceRefresh,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/public/nearby', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load nearby places' },
      { status: 500 }
    );
  }
}
