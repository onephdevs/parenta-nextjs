import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ensureBuildingCoordinates } from '@/lib/maps/geocode';
import { estimateCommute } from '@/lib/maps/commute';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/commute?buildingId=&workplace=
 * Travel time from workplace address to building (OSRM).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId')?.trim();
    const workplace = searchParams.get('workplace')?.trim();

    if (!buildingId) {
      return NextResponse.json(
        { success: false, error: 'buildingId is required' },
        { status: 400 }
      );
    }
    if (!workplace || workplace.length < 3) {
      return NextResponse.json(
        { success: false, error: 'workplace address is required' },
        { status: 400 }
      );
    }

    const visibility = await pool.query<{ show_on_landing_nearby: boolean }>(
      `
      SELECT COALESCE(show_on_landing_nearby, true) AS show_on_landing_nearby
      FROM buildings
      WHERE id = $1 AND is_active = true
      LIMIT 1
      `,
      [buildingId]
    );
    if (
      visibility.rows.length === 0 ||
      visibility.rows[0].show_on_landing_nearby === false
    ) {
      return NextResponse.json(
        { success: false, error: 'Property is not available on the nearby map' },
        { status: 404 }
      );
    }

    const location = await ensureBuildingCoordinates(buildingId);
    if (!location) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not locate this property on the map.',
        },
        { status: 404 }
      );
    }

    const data = await estimateCommute({
      workplaceQuery: workplace,
      destination: {
        latitude: location.latitude,
        longitude: location.longitude,
        label: location.name,
      },
    });

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not find that workplace address. Try a more specific place or city.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/public/commute', error);
    return NextResponse.json(
      { success: false, error: 'Failed to estimate commute' },
      { status: 500 }
    );
  }
}
