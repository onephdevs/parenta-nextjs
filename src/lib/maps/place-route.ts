/**
 * Cached OSRM routes from apartment → a selected nearby place.
 */

import pool from '@/lib/db';
import type { LatLng } from '@/lib/maps/geocode';
import { estimateMinutesForProfile } from '@/lib/maps/nearby-amenities';
import {
  getNearbyRefreshDays,
  isSnapshotStale,
} from '@/lib/maps/nearby-settings';

const OSRM_BASE = 'https://router.project-osrm.org';
const USER_AGENT = 'Parenta nearby amenities (parenta.com.mx)';
const FETCH_TIMEOUT_MS = 10_000;

export type RouteProfile = 'walking' | 'driving';

export interface PlaceRoute {
  buildingId: string;
  placeId: string;
  profile: RouteProfile;
  distanceMeters: number;
  durationMinutes: number;
  /** Leaflet-friendly [lat, lng][] */
  coordinates: [number, number][];
  fromCache: boolean;
  fetchedAt: string;
}

async function fetchOsrmGeometry(
  from: LatLng,
  to: LatLng,
  profile: RouteProfile
): Promise<{ distanceMeters: number; durationSeconds: number; coordinates: [number, number][] } | null> {
  const url =
    `${OSRM_BASE}/route/v1/${profile}/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        duration: number;
        distance: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    const route = data.routes[0];
    const geo = route.geometry?.coordinates ?? [];
    // GeoJSON is [lng, lat] → Leaflet [lat, lng]
    const coordinates: [number, number][] = geo.map(([lng, lat]) => [lat, lng]);
    if (coordinates.length < 2) {
      coordinates.length = 0;
      coordinates.push([from.latitude, from.longitude], [to.latitude, to.longitude]);
    }
    return {
      distanceMeters: Math.round(route.distance),
      durationSeconds: route.duration,
      coordinates,
    };
  } catch (err) {
    console.warn('OSRM route error', profile, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getRouteToPlace(params: {
  buildingId: string;
  placeId: string;
  from: LatLng;
  to: LatLng;
  profile?: RouteProfile;
  forceRefresh?: boolean;
}): Promise<PlaceRoute | null> {
  const profile: RouteProfile = params.profile === 'driving' ? 'driving' : 'walking';
  const refreshDays = await getNearbyRefreshDays();

  if (!params.forceRefresh) {
    const cached = await pool.query<{
      distance_meters: number | null;
      duration_seconds: number | null;
      geometry: unknown;
      fetched_at: Date;
    }>(
      `
      SELECT distance_meters, duration_seconds, geometry, fetched_at
      FROM building_nearby_routes
      WHERE building_id = $1 AND place_id = $2 AND profile = $3
      LIMIT 1
      `,
      [params.buildingId, params.placeId, profile]
    );
    const row = cached.rows[0];
    if (row && !isSnapshotStale(new Date(row.fetched_at), refreshDays)) {
      const coords = Array.isArray(row.geometry)
        ? (row.geometry as [number, number][])
        : [];
      if (coords.length >= 2) {
        const distanceMeters = row.distance_meters ?? 0;
        return {
          buildingId: params.buildingId,
          placeId: params.placeId,
          profile,
          distanceMeters,
          durationMinutes: estimateMinutesForProfile(
            distanceMeters,
            profile,
            row.duration_seconds
          ),
          coordinates: coords,
          fromCache: true,
          fetchedAt: new Date(row.fetched_at).toISOString(),
        };
      }
    }
  }

  let live = await fetchOsrmGeometry(params.from, params.to, profile);

  // Walking profile on public OSRM can be unreliable — fall back to driving geometry
  // for display, but keep requesting walking first for short hops.
  if (!live && profile === 'walking') {
    live = await fetchOsrmGeometry(params.from, params.to, 'driving');
  }
  if (!live) {
    // No street geometry available — do not invent a straight-line path
    return null;
  }

  const durationMinutes = estimateMinutesForProfile(
    live.distanceMeters,
    profile,
    live.durationSeconds
  );

  await pool.query(
    `
    INSERT INTO building_nearby_routes (
      building_id, place_id, profile, distance_meters, duration_seconds, geometry, fetched_at
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    ON CONFLICT (building_id, place_id, profile) DO UPDATE SET
      distance_meters = EXCLUDED.distance_meters,
      duration_seconds = EXCLUDED.duration_seconds,
      geometry = EXCLUDED.geometry,
      fetched_at = NOW()
    `,
    [
      params.buildingId,
      params.placeId,
      profile,
      Math.round(live.distanceMeters),
      Math.round(durationMinutes * 60),
      JSON.stringify(live.coordinates),
    ]
  );

  return {
    buildingId: params.buildingId,
    placeId: params.placeId,
    profile,
    distanceMeters: live.distanceMeters,
    durationMinutes,
    coordinates: live.coordinates,
    fromCache: false,
    fetchedAt: new Date().toISOString(),
  };
}
