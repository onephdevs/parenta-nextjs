/**
 * Persist nearby places per building. OpenStreetMap is fetched only when an
 * admin clicks Get latest on Edit property (or bulk refresh in settings).
 */

import pool from '@/lib/db';
import type { BuildingLocation } from '@/lib/maps/geocode';
import {
  AMENITY_CATEGORIES,
  buildNearbyResult,
  estimateDriveMinutes,
  estimateWalkMinutes,
  fetchCatalogPlacesFromOverpass,
  haversineMeters,
  type AmenityCategory,
  type NearbyAmenitiesResult,
  type NearbyPlace,
} from '@/lib/maps/nearby-amenities';
import { getNearbyRefreshDays } from '@/lib/maps/nearby-settings';

function parsePlacesJson(raw: unknown): NearbyPlace[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(AMENITY_CATEGORIES);
  const out: NearbyPlace[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const p = row as Record<string, unknown>;
    const category = String(p.category ?? '');
    if (!allowed.has(category)) continue;
    const latitude = Number(p.latitude);
    const longitude = Number(p.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const name = String(p.name ?? '').trim();
    const id = String(p.id ?? '').trim();
    if (!name || !id) continue;
    const distanceMeters = Math.round(Number(p.distanceMeters) || 0);
    out.push({
      id,
      name,
      category: category as AmenityCategory,
      latitude,
      longitude,
      distanceMeters,
      walkMinutes: estimateWalkMinutes(distanceMeters),
      driveMinutes: estimateDriveMinutes(distanceMeters),
    });
  }
  return out;
}

async function loadSnapshot(buildingId: string): Promise<{
  places: NearbyPlace[];
  originLatitude: number;
  originLongitude: number;
  fetchedAt: Date;
  updatedAt: Date;
} | null> {
  const result = await pool.query<{
    places: unknown;
    origin_latitude: string;
    origin_longitude: string;
    fetched_at: Date;
    updated_at: Date;
  }>(
    `
    SELECT places, origin_latitude::text, origin_longitude::text, fetched_at, updated_at
    FROM building_nearby_snapshots
    WHERE building_id = $1
    LIMIT 1
    `,
    [buildingId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    places: parsePlacesJson(row.places),
    originLatitude: parseFloat(row.origin_latitude),
    originLongitude: parseFloat(row.origin_longitude),
    fetchedAt: new Date(row.fetched_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function saveSnapshot(
  buildingId: string,
  origin: { latitude: number; longitude: number },
  places: NearbyPlace[]
): Promise<Date> {
  const result = await pool.query<{ fetched_at: Date }>(
    `
    INSERT INTO building_nearby_snapshots (
      building_id, origin_latitude, origin_longitude, places, fetched_at, updated_at
    ) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())
    ON CONFLICT (building_id) DO UPDATE SET
      origin_latitude = EXCLUDED.origin_latitude,
      origin_longitude = EXCLUDED.origin_longitude,
      places = EXCLUDED.places,
      fetched_at = NOW(),
      updated_at = NOW()
    RETURNING fetched_at
    `,
    [buildingId, origin.latitude, origin.longitude, JSON.stringify(places)]
  );
  // Drop stale routes when places refresh
  await pool.query(`DELETE FROM building_nearby_routes WHERE building_id = $1`, [
    buildingId,
  ]);
  return new Date(result.rows[0].fetched_at);
}

/**
 * Save admin-edited names/pins. By default does not bump fetched_at.
 * Pass touchFetchedAt after verifying an OpenStreetMap preview.
 */
export async function saveAdminNearbyPlaces(params: {
  buildingId: string;
  origin: { latitude: number; longitude: number };
  places: NearbyPlace[];
  touchFetchedAt?: boolean;
}): Promise<{ fetchedAt: Date; updatedAt: Date }> {
  const { buildingId, origin, places, touchFetchedAt = false } = params;
  const result = await pool.query<{ fetched_at: Date; updated_at: Date }>(
    `
    INSERT INTO building_nearby_snapshots (
      building_id, origin_latitude, origin_longitude, places, fetched_at, updated_at
    ) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())
    ON CONFLICT (building_id) DO UPDATE SET
      origin_latitude = EXCLUDED.origin_latitude,
      origin_longitude = EXCLUDED.origin_longitude,
      places = EXCLUDED.places,
      fetched_at = CASE
        WHEN $5::boolean THEN NOW()
        ELSE building_nearby_snapshots.fetched_at
      END,
      updated_at = NOW()
    RETURNING fetched_at, updated_at
    `,
    [buildingId, origin.latitude, origin.longitude, JSON.stringify(places), touchFetchedAt]
  );
  await pool.query(`DELETE FROM building_nearby_routes WHERE building_id = $1`, [
    buildingId,
  ]);
  const row = result.rows[0];
  return {
    fetchedAt: new Date(row.fetched_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function hydratePlaceDistances(
  origin: { latitude: number; longitude: number },
  place: Pick<NearbyPlace, 'id' | 'name' | 'category' | 'latitude' | 'longitude'>
): NearbyPlace {
  const distanceMeters = Math.round(haversineMeters(origin, place));
  return {
    id: place.id,
    name: place.name,
    category: place.category,
    latitude: place.latitude,
    longitude: place.longitude,
    distanceMeters,
    walkMinutes: estimateWalkMinutes(distanceMeters),
    driveMinutes: estimateDriveMinutes(distanceMeters),
  };
}

/** Stored catalog only — does not call Overpass. */
export async function getStoredNearbySnapshot(buildingId: string): Promise<{
  places: NearbyPlace[];
  originLatitude: number;
  originLongitude: number;
  fetchedAt: Date;
  updatedAt: Date;
} | null> {
  return loadSnapshot(buildingId);
}

/**
 * Fetch OpenStreetMap places without writing them. Admin reviews, then Save.
 */
export async function previewNearbyFromOverpass(
  building: BuildingLocation
): Promise<NearbyPlace[]> {
  return fetchCatalogPlacesFromOverpass(building);
}

/**
 * Return stored nearby places for landing. Never calls OpenStreetMap unless
 * forceRefresh is true (admin bulk replace in settings).
 */
export async function getNearbyAmenitiesForBuilding(params: {
  building: BuildingLocation;
  categories: AmenityCategory[];
  forceRefresh?: boolean;
}): Promise<NearbyAmenitiesResult> {
  const { building, categories, forceRefresh = false } = params;
  const refreshDays = await getNearbyRefreshDays();
  const snapshot = await loadSnapshot(building.id);

  if (!forceRefresh) {
    return buildNearbyResult(building, snapshot?.places ?? [], categories, {
      fromCache: true,
      fetchedAt: snapshot?.fetchedAt.toISOString() ?? null,
      refreshDays,
    });
  }

  const places = await fetchCatalogPlacesFromOverpass(building);
  if (places.length === 0 && snapshot?.places.length) {
    return buildNearbyResult(building, snapshot.places, categories, {
      fromCache: true,
      fetchedAt: snapshot.fetchedAt.toISOString(),
      refreshDays,
    });
  }

  const fetchedAt = await saveSnapshot(building.id, building, places);
  return buildNearbyResult(building, places, categories, {
    fromCache: false,
    fetchedAt: fetchedAt.toISOString(),
    refreshDays,
  });
}

export async function clearNearbySnapshot(buildingId: string): Promise<void> {
  await pool.query(`DELETE FROM building_nearby_routes WHERE building_id = $1`, [
    buildingId,
  ]);
  await pool.query(`DELETE FROM building_nearby_snapshots WHERE building_id = $1`, [
    buildingId,
  ]);
}
