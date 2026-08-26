import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ensureBuildingCoordinates } from '@/lib/maps/geocode';
import { parseAmenityCategories } from '@/lib/maps/nearby-amenities';
import { getNearbyAmenitiesForBuilding } from '@/lib/maps/nearby-snapshot';
import { invalidatePublicPortfolioCache } from '@/lib/cache/memory-cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/nearby?buildingId=&categories=school,park
 * Returns the admin-saved catalog only. Does not call OpenStreetMap.
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

    const visibility = await pool.query<{ show_on_landing_nearby: boolean }>(
      `
      SELECT COALESCE(show_on_landing_nearby, false) AS show_on_landing_nearby
      FROM buildings
      WHERE id = $1 AND is_active = true
      LIMIT 1
      `,
      [buildingId]
    );
    if (visibility.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }
    if (visibility.rows[0].show_on_landing_nearby === false) {
      return NextResponse.json(
        { success: false, error: 'Property is not available on the nearby map' },
        { status: 404 }
      );
    }

    const categories = parseAmenityCategories(searchParams.get('categories'));

    const location = await ensureBuildingCoordinates(buildingId);
    if (!location) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Could not locate this property on the map. Add a Google Maps pin on the property location.',
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
