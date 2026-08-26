import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/api-auth';
import { ensureBuildingCoordinates } from '@/lib/maps/geocode';
import {
  AMENITY_CATEGORIES,
  type AmenityCategory,
} from '@/lib/maps/nearby-amenities';
import {
  getStoredNearbySnapshot,
  hydratePlaceDistances,
  saveAdminNearbyPlaces,
} from '@/lib/maps/nearby-snapshot';
import { getNearbyRefreshDays } from '@/lib/maps/nearby-settings';
import { resolveGoogleMapsLocation } from '@/lib/maps/resolve-google-maps-location';
import { isValidLatLng } from '@/lib/maps/google-maps-location';
import { invalidatePublicPortfolioCache } from '@/lib/cache/memory-cache';

export const dynamic = 'force-dynamic';

const MAX_PLACES_PER_CATEGORY = 20;

/**
 * GET /api/admin/nearby?buildingId=
 * Returns the stored nearby catalog (name + lat/lng per place). Does not call Overpass.
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const buildingId = request.nextUrl.searchParams.get('buildingId')?.trim();
    if (!buildingId) {
      return NextResponse.json(
        { success: false, error: 'buildingId is required' },
        { status: 400 }
      );
    }

    const [snapshot, refreshDays] = await Promise.all([
      getStoredNearbySnapshot(buildingId),
      getNearbyRefreshDays(),
    ]);

    if (!snapshot) {
      return NextResponse.json({
        success: true,
        data: {
          places: [],
          origin: null,
          fetchedAt: null,
          refreshDays,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        places: snapshot.places,
        origin: {
          latitude: snapshot.originLatitude,
          longitude: snapshot.originLongitude,
        },
        fetchedAt: snapshot.fetchedAt.toISOString(),
        refreshDays,
      },
    });
  } catch (err) {
    console.error('GET /api/admin/nearby', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load nearby places' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/nearby
 * Body: { buildingId, places: [{ id?, name, category, pin? }] }
 * Saves admin-edited names and pins for the landing What’s nearby map.
 */
export async function PUT(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = (await request.json()) as {
      buildingId?: string;
      places?: unknown;
      osmFetched?: boolean;
    };
    const buildingId = String(body.buildingId || '').trim();
    if (!buildingId) {
      return NextResponse.json(
        { success: false, error: 'buildingId is required' },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.places)) {
      return NextResponse.json(
        { success: false, error: 'places must be an array' },
        { status: 400 }
      );
    }

    const location = await ensureBuildingCoordinates(buildingId);
    if (!location) {
      return NextResponse.json(
        {
          success: false,
          error: 'Add a Google Maps pin on the property before saving nearby places.',
        },
        { status: 400 }
      );
    }

    const allowed = new Set<string>(AMENITY_CATEGORIES);
    const counts: Record<string, number> = {};
    const places = [];

    for (const raw of body.places) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      const name = String(row.name ?? '').trim();
      const category = String(row.category ?? '').trim();
      if (!name || !allowed.has(category)) continue;

      counts[category] = (counts[category] ?? 0) + 1;
      if (counts[category] > MAX_PLACES_PER_CATEGORY) {
        return NextResponse.json(
          {
            success: false,
            error: `At most ${MAX_PLACES_PER_CATEGORY} places per category`,
          },
          { status: 400 }
        );
      }

      const pinRaw = String(row.pin ?? '').trim();
      let latitude = Number(row.latitude);
      let longitude = Number(row.longitude);
      if (pinRaw) {
        const resolved = await resolveGoogleMapsLocation(pinRaw);
        if (!resolved) {
          return NextResponse.json(
            {
              success: false,
              error: `Could not read a map pin for “${name}”. Paste coordinates or a Google Maps link.`,
            },
            { status: 400 }
          );
        }
        latitude = resolved.latitude;
        longitude = resolved.longitude;
      }
      if (!isValidLatLng(latitude, longitude)) {
        return NextResponse.json(
          {
            success: false,
            error: `“${name}” needs a valid map pin.`,
          },
          { status: 400 }
        );
      }

      const id = String(row.id ?? '').trim() || `admin/${randomUUID()}`;
      places.push(
        hydratePlaceDistances(location, {
          id,
          name,
          category: category as AmenityCategory,
          latitude,
          longitude,
        })
      );
    }

    const saved = await saveAdminNearbyPlaces({
      buildingId,
      origin: location,
      places,
      touchFetchedAt: Boolean(body.osmFetched),
    });
    invalidatePublicPortfolioCache();

    return NextResponse.json({
      success: true,
      data: {
        places,
        origin: { latitude: location.latitude, longitude: location.longitude },
        fetchedAt: saved.fetchedAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      },
      message: 'Nearby places updated',
    });
  } catch (err) {
    console.error('PUT /api/admin/nearby', err);
    return NextResponse.json(
      { success: false, error: 'Failed to save nearby places' },
      { status: 500 }
    );
  }
}

