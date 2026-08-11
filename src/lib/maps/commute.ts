/**
 * Commute duration via public OSRM (driving + walking) plus a transit estimate.
 */

import { cacheGet, cacheSet } from '@/lib/cache/memory-cache';
import { geocodeAddress, type LatLng } from '@/lib/maps/geocode';
import {
  estimateMinutesForProfile,
  estimateWalkMinutes,
  haversineMeters,
} from '@/lib/maps/nearby-amenities';

const OSRM_BASE = 'https://router.project-osrm.org';
const USER_AGENT = 'Parenta nearby amenities (parenta.com.mx)';
const FETCH_TIMEOUT_MS = 12_000;
const COMMUTE_CACHE_TTL_MS = 15 * 60_000;

export type CommuteMode = 'walking' | 'driving' | 'transit';

export interface CommuteOption {
  mode: CommuteMode;
  minutes: number;
  distanceMeters: number;
  /** Leaflet-friendly [lat, lng][] */
  coordinates: [number, number][];
  /** True when minutes are heuristic (no live GTFS) */
  estimated?: boolean;
}

export interface CommuteEstimate {
  /** Workplace / school */
  origin: LatLng & { label: string };
  /** Property (apartment) */
  destination: LatLng & { label: string };
  distanceMeters: number;
  drivingMinutes: number | null;
  walkingMinutes: number | null;
  transitMinutes: number | null;
  options: CommuteOption[];
}

interface OsrmRoute {
  durationSeconds: number;
  distanceMeters: number;
  coordinates: [number, number][];
}

async function osrmRoute(
  from: LatLng,
  to: LatLng,
  profile: 'driving' | 'walking'
): Promise<OsrmRoute | null> {
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
    const coordinates: [number, number][] = geo.map(([lng, lat]) => [lat, lng]);
    if (coordinates.length < 2) {
      coordinates.push([from.latitude, from.longitude], [to.latitude, to.longitude]);
    }
    return {
      durationSeconds: route.duration,
      distanceMeters: Math.round(route.distance),
      coordinates,
    };
  } catch (err) {
    console.warn('OSRM error', profile, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function walkingMinutesFromRoute(
  walking: OsrmRoute | null,
  distanceMeters: number
): number | null {
  const meters = walking?.distanceMeters || distanceMeters;
  if (meters <= 0 || meters > 8000) return null;
  return estimateWalkMinutes(meters);
}

/** Jeepney/bus-style estimate: wait + ~16 km/h in-vehicle. Not live arrivals. */
function estimateTransitMinutes(distanceMeters: number): number {
  const waitMin = 5;
  const vehicleMin = Math.max(1, Math.round((distanceMeters / 1000 / 16) * 60));
  return waitMin + vehicleMin;
}

export async function estimateCommute(params: {
  workplaceQuery: string;
  destination: LatLng & { label: string };
}): Promise<CommuteEstimate | null> {
  const workplace = await geocodeAddress(params.workplaceQuery);
  if (!workplace) return null;

  const cacheKey = `commute:v3:${workplace.latitude.toFixed(4)},${workplace.longitude.toFixed(4)}:${params.destination.latitude.toFixed(4)},${params.destination.longitude.toFixed(4)}`;
  const cached = cacheGet<CommuteEstimate>(cacheKey);
  if (cached) return cached;

  const home = params.destination;

  const [driving, walking] = await Promise.all([
    osrmRoute(home, workplace, 'driving'),
    osrmRoute(home, workplace, 'walking'),
  ]);

  const distanceMeters = Math.round(
    driving?.distanceMeters ??
      walking?.distanceMeters ??
      haversineMeters(home, workplace)
  );

  const drivingMinutes = driving
    ? estimateMinutesForProfile(
        driving.distanceMeters || distanceMeters,
        'driving',
        driving.durationSeconds
      )
    : distanceMeters > 0
      ? estimateMinutesForProfile(distanceMeters, 'driving')
      : null;
  const walkingMinutes = walkingMinutesFromRoute(walking, distanceMeters);
  const transitMinutes = distanceMeters > 0 ? estimateTransitMinutes(distanceMeters) : null;

  const roadPath =
    (driving?.coordinates && driving.coordinates.length >= 2
      ? driving.coordinates
      : null) ??
    (walking?.coordinates && walking.coordinates.length >= 2
      ? walking.coordinates
      : []);
  const walkPath =
    walking?.coordinates && walking.coordinates.length >= 2
      ? walking.coordinates
      : roadPath;

  const options: CommuteOption[] = [];
  if (walkingMinutes != null) {
    options.push({
      mode: 'walking',
      minutes: walkingMinutes,
      distanceMeters: walking?.distanceMeters ?? distanceMeters,
      coordinates: walkPath,
    });
  }
  if (drivingMinutes != null) {
    options.push({
      mode: 'driving',
      minutes: drivingMinutes,
      distanceMeters: driving?.distanceMeters ?? distanceMeters,
      coordinates: roadPath,
    });
  }
  if (transitMinutes != null) {
    options.push({
      mode: 'transit',
      minutes: transitMinutes,
      distanceMeters: distanceMeters,
      coordinates: roadPath,
      estimated: true,
    });
  }
  options.sort((a, b) => a.minutes - b.minutes);

  const result: CommuteEstimate = {
    origin: { ...workplace, label: params.workplaceQuery.trim() },
    destination: home,
    distanceMeters,
    drivingMinutes,
    walkingMinutes,
    transitMinutes,
    options,
  };

  cacheSet(cacheKey, result, COMMUTE_CACHE_TTL_MS);
  return result;
}
