/**
 * Persist nearby places per building; refresh on admin-configured interval (default weekly).
 */

import pool from '@/lib/db';
import type { BuildingLocation } from '@/lib/maps/geocode';
import {
  AMENITY_CATEGORIES,
  buildNearbyResult,
  fetchCatalogPlacesFromOverpass,
  type AmenityCategory,
  type NearbyAmenitiesResult,
  type NearbyPlace,
} from '@/lib/maps/nearby-amenities';
import {
  getNearbyRefreshDays,
  isSnapshotStale,
} from '@/lib/maps/nearby-settings';

function coordsMatch(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
  eps = 0.00015
): boolean {
  return Math.abs(aLat - bLat) < eps && Math.abs(aLng - bLng) < eps;
}

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
      walkMinutes: Math.round(Number(p.walkMinutes) || 1),
      driveMinutes: Math.round(Number(p.driveMinutes) || 1),
    });
  }
  return out;
}

async function loadSnapshot(buildingId: string): Promise<{
  places: NearbyPlace[];
  originLatitude: number;
  originLongitude: number;
  fetchedAt: Date;
} | null> {
  const result = await pool.query<{
    places: unknown;
    origin_latitude: string;
    origin_longitude: string;
    fetched_at: Date;
  }>(
    `
    SELECT places, origin_latitude::text, origin_longitude::text, fetched_at
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
 * Return nearby places for a building, using DB snapshot when fresh.
 * Live Overpass is called at most once per refresh window (default 7 days).
 */
export async function getNearbyAmenitiesForBuilding(params: {
  building: BuildingLocation;
  categories: AmenityCategory[];
  forceRefresh?: boolean;
}): Promise<NearbyAmenitiesResult> {
  const { building, categories, forceRefresh = false } = params;
  const refreshDays = await getNearbyRefreshDays();
  const snapshot = await loadSnapshot(building.id);

  const canUseCache =
    !forceRefresh &&
    snapshot &&
    snapshot.places.length > 0 &&
    coordsMatch(
      snapshot.originLatitude,
      snapshot.originLongitude,
      building.latitude,
      building.longitude
    ) &&
    !isSnapshotStale(snapshot.fetchedAt, refreshDays);

  if (canUseCache && snapshot) {
    return buildNearbyResult(building, snapshot.places, categories, {
      fromCache: true,
      fetchedAt: snapshot.fetchedAt.toISOString(),
      refreshDays,
    });
  }

  const places = await fetchCatalogPlacesFromOverpass(building);
  // If Overpass fails but we have any snapshot, serve stale rather than empty
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
