import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureBuildingCoordinates } from '@/lib/maps/geocode';
import { AMENITY_CATEGORIES } from '@/lib/maps/nearby-amenities';
import {
  clearNearbySnapshot,
  getNearbyAmenitiesForBuilding,
} from '@/lib/maps/nearby-snapshot';
import { invalidatePublicPortfolioCache } from '@/lib/cache/memory-cache';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/nearby/refresh
 * Body: { buildingId?: string } — omit to refresh all active buildings with addresses.
 * Forces a live Overpass fetch and replaces the DB snapshot.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { buildingId?: string };
    let buildingIds: string[] = [];

    if (body.buildingId?.trim()) {
      buildingIds = [body.buildingId.trim()];
    } else {
      const result = await pool.query<{ id: string }>(
        `SELECT id FROM buildings WHERE is_active = true ORDER BY name ASC`
      );
      buildingIds = result.rows.map((r) => r.id);
    }

    const results: Array<{ buildingId: string; ok: boolean; places?: number; error?: string }> =
      [];

    for (const buildingId of buildingIds) {
      try {
        await clearNearbySnapshot(buildingId);
        const location = await ensureBuildingCoordinates(buildingId);
        if (!location) {
          results.push({
            buildingId,
            ok: false,
            error: 'Could not geocode building',
          });
          continue;
        }
        if (location.newlyGeocoded) invalidatePublicPortfolioCache();
        const data = await getNearbyAmenitiesForBuilding({
          building: location,
          categories: [...AMENITY_CATEGORIES],
          forceRefresh: true,
        });
        results.push({ buildingId, ok: true, places: data.places.length });
      } catch (err) {
        results.push({
          buildingId,
          ok: false,
          error: err instanceof Error ? err.message : 'Refresh failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        refreshed: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/nearby/refresh', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh nearby data' },
      { status: 500 }
    );
  }
}
