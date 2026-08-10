/**
 * Commute duration via public OSRM (driving + walking).
 */

import { cacheGet, cacheSet } from '@/lib/cache/memory-cache';
import { geocodeAddress, type LatLng } from '@/lib/maps/geocode';
import { haversineMeters } from '@/lib/maps/nearby-amenities';

const OSRM_BASE = 'https://router.project-osrm.org';
const USER_AGENT = 'Parenta nearby amenities (parenta.com.mx)';
const FETCH_TIMEOUT_MS = 10_000;
const COMMUTE_CACHE_TTL_MS = 15 * 60_000;

export interface CommuteEstimate {
  origin: LatLng & { label: string };
  destination: LatLng & { label: string };
  distanceMeters: number;
  drivingMinutes: number | null;
  walkingMinutes: number | null;
}

async function osrmDurationSeconds(
  from: LatLng,
  to: LatLng,
  profile: 'driving' | 'walking'
): Promise<{ durationSeconds: number; distanceMeters: number } | null> {
  // OSRM expects lon,lat
  const url = `${OSRM_BASE}/route/v1/${profile}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=false`;
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
      routes?: Array<{ duration: number; distance: number }>;
    };
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    return {
      durationSeconds: data.routes[0].duration,
      distanceMeters: data.routes[0].distance,
    };
  } catch (err) {
    console.warn('OSRM error', profile, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function estimateCommute(params: {
  workplaceQuery: string;
  destination: LatLng & { label: string };
}): Promise<CommuteEstimate | null> {
  const workplace = await geocodeAddress(params.workplaceQuery);
  if (!workplace) return null;

  const cacheKey = `commute:${workplace.latitude.toFixed(4)},${workplace.longitude.toFixed(4)}:${params.destination.latitude.toFixed(4)},${params.destination.longitude.toFixed(4)}`;
  const cached = cacheGet<CommuteEstimate>(cacheKey);
  if (cached) return cached;

  const [driving, walking] = await Promise.all([
    osrmDurationSeconds(workplace, params.destination, 'driving'),
    osrmDurationSeconds(workplace, params.destination, 'walking'),
  ]);

  const distanceMeters = Math.round(
    driving?.distanceMeters ??
      walking?.distanceMeters ??
      haversineMeters(workplace, params.destination)
  );

  let drivingMinutes: number | null = driving
    ? Math.max(1, Math.round(driving.durationSeconds / 60))
    : null;

  // Public OSRM walking profile sometimes returns driving-like durations.
  // Accept walking only when implied speed is under ~8 km/h.
  let walkingMinutes: number | null = null;
  if (walking && walking.distanceMeters > 0) {
    const hours = walking.durationSeconds / 3600;
    const km = walking.distanceMeters / 1000;
    const kmh = hours > 0 ? km / hours : Infinity;
    if (kmh <= 8) {
      walkingMinutes = Math.max(1, Math.round(walking.durationSeconds / 60));
    }
  }
  if (walkingMinutes == null && distanceMeters > 0 && distanceMeters <= 8000) {
    // Heuristic walk @ 5 km/h for short hops when OSRM walking is unreliable
    walkingMinutes = Math.max(1, Math.round((distanceMeters / 1000 / 5) * 60));
  }

  const result: CommuteEstimate = {
    origin: { ...workplace, label: params.workplaceQuery.trim() },
    destination: params.destination,
    distanceMeters,
    drivingMinutes,
    walkingMinutes,
  };

  cacheSet(cacheKey, result, COMMUTE_CACHE_TTL_MS);
  return result;
}
