/**
 * Nearby amenities via OpenStreetMap Overpass API.
 * Prefer DB snapshots (see nearby-snapshot.ts) over calling this directly.
 */

import type { LatLng } from '@/lib/maps/geocode';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const USER_AGENT = 'Parenta nearby amenities (parenta.com.mx)';
/** Widest fetch radius (sparse categories after 2x expand). Filter tighter per category in code. */
const OVERPASS_FETCH_RADIUS_M = 6000;
const MAX_PER_CATEGORY = 8;
const MIN_RESULTS_BEFORE_EXPAND = 3;
const FETCH_TIMEOUT_MS = 18_000;

/** Full catalog fetched once per building into the weekly snapshot. */
export const AMENITY_CATEGORIES = [
  'school',
  'market',
  'mall',
  'park',
  'store',
  'restaurant',
  'barber',
  'hospital',
] as const;

export type AmenityCategory = (typeof AMENITY_CATEGORIES)[number];

/** Base search radius by category (meters). Expand 2x if fewer than 3 results. */
export const CATEGORY_BASE_RADIUS_M: Record<AmenityCategory, number> = {
  school: 1000,
  market: 1000,
  store: 1000,
  park: 1000,
  barber: 1000,
  restaurant: 1000,
  mall: 3000,
  hospital: 3000,
};

/** Pin + selected-chip color per category (list, grid, and map stay in sync). */
export const CATEGORY_COLORS: Record<AmenityCategory, string> = {
  school: '#2563EB',
  market: '#D97706',
  mall: '#7C3AED',
  park: '#059669',
  store: '#0284C7',
  restaurant: '#E11D48',
  barber: '#DB2777',
  hospital: '#DC2626',
};

export const CATEGORY_LABELS: Record<AmenityCategory, string> = {
  school: 'School',
  market: 'Market',
  mall: 'Mall',
  park: 'Park',
  store: 'Store',
  restaurant: 'Restaurant',
  barber: 'Salon',
  hospital: 'Hospital',
};

export interface NearbyPlace {
  id: string;
  name: string;
  category: AmenityCategory;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  /** Rough walk minutes @ 5 km/h */
  walkMinutes: number;
  /** Rough drive minutes @ 25 km/h urban */
  driveMinutes: number;
}

export interface NearbyAmenitiesResult {
  origin: LatLng & { name: string; address: string };
  places: NearbyPlace[];
  /** Categories that returned at least one place */
  categoriesWithResults: AmenityCategory[];
  /** Selected categories that had zero results (for honest UI) */
  emptyCategories: AmenityCategory[];
  /** True when response came from DB snapshot (no live Overpass call) */
  fromCache?: boolean;
  /** When the snapshot was last fetched from OSM */
  fetchedAt?: string | null;
  /** Snapshot refresh interval in days (from admin settings) */
  refreshDays?: number;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const CATEGORY_FILTERS: Record<AmenityCategory, string[]> = {
  school: [
    'node["amenity"="school"]',
    'way["amenity"="school"]',
    'node["amenity"="college"]',
    'way["amenity"="college"]',
    'node["amenity"="university"]',
    'way["amenity"="university"]',
  ],
  market: [
    'node["amenity"="marketplace"]',
    'way["amenity"="marketplace"]',
    'node["shop"="supermarket"]',
    'way["shop"="supermarket"]',
  ],
  mall: ['node["shop"="mall"]', 'way["shop"="mall"]'],
  park: ['node["leisure"="park"]', 'way["leisure"="park"]'],
  store: [
    'node["shop"="convenience"]',
    'way["shop"="convenience"]',
    'node["shop"="supermarket"]',
    'way["shop"="supermarket"]',
  ],
  restaurant: [
    'node["amenity"="restaurant"]',
    'way["amenity"="restaurant"]',
    'node["amenity"="fast_food"]',
    'way["amenity"="fast_food"]',
    'node["amenity"="cafe"]',
    'way["amenity"="cafe"]',
  ],
  barber: [
    'node["shop"="hairdresser"]',
    'way["shop"="hairdresser"]',
    'node["shop"="beauty"]',
    'way["shop"="beauty"]',
  ],
  hospital: [
    'node["amenity"="hospital"]',
    'way["amenity"="hospital"]',
    'node["amenity"="clinic"]',
    'way["amenity"="clinic"]',
  ],
};

function classifyElement(tags: Record<string, string> | undefined): AmenityCategory | null {
  if (!tags) return null;
  const amenity = tags.amenity;
  const shop = tags.shop;
  const leisure = tags.leisure;

  if (amenity === 'school' || amenity === 'college' || amenity === 'university') return 'school';
  if (amenity === 'marketplace') return 'market';
  if (shop === 'mall') return 'mall';
  if (leisure === 'park') return 'park';
  if (shop === 'convenience') return 'store';
  if (shop === 'supermarket') return 'market';
  if (amenity === 'restaurant' || amenity === 'fast_food' || amenity === 'cafe') {
    return 'restaurant';
  }
  if (shop === 'hairdresser' || shop === 'beauty') return 'barber';
  if (amenity === 'hospital' || amenity === 'clinic') return 'hospital';
  return null;
}

function classifyWithPreference(
  tags: Record<string, string> | undefined,
  selected: Set<AmenityCategory>
): AmenityCategory | null {
  if (!tags) return null;
  if (tags.shop === 'supermarket') {
    if (selected.has('market')) return 'market';
    if (selected.has('store')) return 'store';
    return null;
  }
  const cat = classifyElement(tags);
  if (!cat || !selected.has(cat)) return null;
  return cat;
}

export function haversineMeters(
  a: LatLng,
  b: { latitude: number; longitude: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** ~5 km/h pedestrian pace (858 m ≈ 10 min). */
const WALK_METERS_PER_MIN = 83.3;
/** ~25 km/h urban driving with lights (858 m ≈ 2 min). */
const DRIVE_METERS_PER_MIN = 416.7;

export function estimateWalkMinutes(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / WALK_METERS_PER_MIN));
}

export function estimateDriveMinutes(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / DRIVE_METERS_PER_MIN));
}

/** Prefer a sane OSRM drive time; always use walking pace for foot travel. */
export function estimateMinutesForProfile(
  distanceMeters: number,
  profile: 'walking' | 'driving',
  osrmDurationSeconds?: number | null
): number {
  if (profile === 'walking') {
    return estimateWalkMinutes(distanceMeters);
  }
  if (osrmDurationSeconds && osrmDurationSeconds > 0 && distanceMeters > 0) {
    const kmh = distanceMeters / 1000 / (osrmDurationSeconds / 3600);
    if (kmh >= 8 && kmh <= 55) {
      return Math.max(1, Math.round(osrmDurationSeconds / 60));
    }
  }
  return estimateDriveMinutes(distanceMeters);
}

export function parseAmenityCategories(raw: string | string[] | null): AmenityCategory[] {
  const parts = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : [];
  const allowed = new Set<string>(AMENITY_CATEGORIES);
  const out: AmenityCategory[] = [];
  for (const p of parts) {
    const key = p.trim().toLowerCase();
    const normalized =
      key === 'barber/salon' || key === 'salon'
        ? 'barber'
        : key === 'restaurants' || key === 'food'
          ? 'restaurant'
          : key;
    if (allowed.has(normalized) && !out.includes(normalized as AmenityCategory)) {
      out.push(normalized as AmenityCategory);
    }
  }
  return out.length ? out : [...AMENITY_CATEGORIES];
}

function buildOverpassQuery(origin: LatLng, categories: AmenityCategory[]): string {
  const around = `(around:${OVERPASS_FETCH_RADIUS_M},${origin.latitude},${origin.longitude})`;
  const lines: string[] = [];
  for (const cat of categories) {
    for (const filter of CATEGORY_FILTERS[cat]) {
      const match = filter.match(/^(node|way)(\[.+\])$/);
      if (!match) continue;
      lines.push(`  ${match[1]}${around}${match[2]};`);
    }
  }
  return `
[out:json][timeout:15];
(
${lines.join('\n')}
);
out center tags;
`.trim();
}

function parseOverpassElements(
  origin: LatLng,
  elements: OverpassElement[],
  categories: AmenityCategory[]
): NearbyPlace[] {
  const selected = new Set(categories);
  const byCategory = new Map<AmenityCategory, NearbyPlace[]>();
  for (const cat of categories) byCategory.set(cat, []);

  const seen = new Set<string>();

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const category = classifyWithPreference(el.tags, selected);
    if (!category) continue;

    const name = el.tags?.name?.trim() || el.tags?.['name:en']?.trim();
    if (!name) continue;

    const dedupeKey = `${category}:${name.toLowerCase()}:${lat.toFixed(4)}:${lon.toFixed(4)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const distanceMeters = Math.round(
      haversineMeters(origin, { latitude: lat, longitude: lon })
    );
    // Keep anything within the widest fetch; tiered radius applied below.
    if (distanceMeters > OVERPASS_FETCH_RADIUS_M + 50) continue;

    const list = byCategory.get(category);
    if (!list) continue;

    list.push({
      id: `${el.type}/${el.id}`,
      name,
      category,
      latitude: lat,
      longitude: lon,
      distanceMeters,
      walkMinutes: estimateWalkMinutes(distanceMeters),
      driveMinutes: estimateDriveMinutes(distanceMeters),
    });
  }

  const places: NearbyPlace[] = [];
  for (const cat of categories) {
    const list = (byCategory.get(cat) ?? []).sort(
      (a, b) => a.distanceMeters - b.distanceMeters
    );
    const base = CATEGORY_BASE_RADIUS_M[cat];
    const expanded = base * 2;
    const withinBase = list.filter((p) => p.distanceMeters <= base);
    const chosen =
      withinBase.length >= MIN_RESULTS_BEFORE_EXPAND
        ? withinBase
        : list.filter((p) => p.distanceMeters <= expanded);
    places.push(...chosen.slice(0, MAX_PER_CATEGORY));
  }
  places.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return places;
}

/** Live Overpass fetch for the full amenity catalog (used when snapshot is stale). */
export async function fetchCatalogPlacesFromOverpass(
  origin: LatLng
): Promise<NearbyPlace[]> {
  const cats = [...AMENITY_CATEGORIES];
  const query = buildOverpassQuery(origin, cats);
  let elements: OverpassElement[] = [];

  try {
    const body = `data=${encodeURIComponent(query)}`;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            'User-Agent': USER_AGENT,
          },
          body,
          signal: controller.signal,
        });
        const text = await res.text();
        if (!res.ok || text.trimStart().startsWith('<')) {
          console.warn('Overpass request failed', endpoint, res.status);
          continue;
        }
        const data = JSON.parse(text) as { elements?: OverpassElement[] };
        elements = data.elements ?? [];
        break;
      } catch (err) {
        console.warn('Overpass error', endpoint, err);
      } finally {
        clearTimeout(timer);
      }
    }
  } catch (err) {
    console.warn('Overpass error', err);
  }

  return parseOverpassElements(origin, elements, cats);
}

export function buildNearbyResult(
  origin: LatLng & { name: string; address: string },
  allPlaces: NearbyPlace[],
  categories: AmenityCategory[],
  meta?: {
    fromCache?: boolean;
    fetchedAt?: string | null;
    refreshDays?: number;
  }
): NearbyAmenitiesResult {
  const cats = categories.length ? categories : [...AMENITY_CATEGORIES];
  const selected = new Set(cats);
  const filtered = allPlaces.filter((p) => selected.has(p.category));

  const categoriesWithResults: AmenityCategory[] = [];
  const emptyCategories: AmenityCategory[] = [];
  for (const cat of cats) {
    if (filtered.some((p) => p.category === cat)) categoriesWithResults.push(cat);
    else emptyCategories.push(cat);
  }

  return {
    origin: {
      latitude: origin.latitude,
      longitude: origin.longitude,
      name: origin.name,
      address: origin.address,
    },
    places: filtered.sort((a, b) => a.distanceMeters - b.distanceMeters),
    categoriesWithResults,
    emptyCategories,
    fromCache: meta?.fromCache,
    fetchedAt: meta?.fetchedAt ?? null,
    refreshDays: meta?.refreshDays,
  };
}
