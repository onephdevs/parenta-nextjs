import { NextRequest, NextResponse } from 'next/server';
import { ensureBuildingCoordinates } from '@/lib/maps/geocode';
import { getRouteToPlace, type RouteProfile } from '@/lib/maps/place-route';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/place-route?buildingId=&placeId=&toLat=&toLng=&profile=walking
 * Returns a cached or live path from the apartment to a selected nearby place.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId')?.trim();
    const placeId = searchParams.get('placeId')?.trim();
    const toLat = parseFloat(searchParams.get('toLat') || '');
    const toLng = parseFloat(searchParams.get('toLng') || '');
    const profileRaw = (searchParams.get('profile') || 'walking').toLowerCase();
    const profile: RouteProfile = profileRaw === 'driving' ? 'driving' : 'walking';

    if (!buildingId || !placeId) {
      return NextResponse.json(
        { success: false, error: 'buildingId and placeId are required' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(toLat) || !Number.isFinite(toLng)) {
      return NextResponse.json(
        { success: false, error: 'toLat and toLng are required' },
        { status: 400 }
      );
    }

    const location = await ensureBuildingCoordinates(buildingId);
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Could not locate this property on the map.' },
        { status: 404 }
      );
    }

    const data = await getRouteToPlace({
      buildingId,
      placeId,
      from: { latitude: location.latitude, longitude: location.longitude },
      to: { latitude: toLat, longitude: toLng },
      profile,
    });

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Could not build a route to that place' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/public/place-route', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load route' },
      { status: 500 }
    );
  }
}
