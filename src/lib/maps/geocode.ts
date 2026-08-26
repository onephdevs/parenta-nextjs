/**
 * Server-side geocoding via OpenStreetMap Nominatim.
 * Persist coordinates on buildings; never call from the browser.
 * Admin-pasted Google Maps pins (latitude/longitude) take precedence.
 */

import pool from '@/lib/db';
import { cacheGet, cacheSet } from '@/lib/cache/memory-cache';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Parenta nearby amenities (parenta.com.mx)';
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60_000;
const FETCH_TIMEOUT_MS = 8_000;
/** Nominatim fair-use: max 1 req/s when trying fallbacks. */
const NOMINATIM_FALLBACK_DELAY_MS = 1_100;

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface BuildingLocation extends LatLng {
  id: string;
  name: string;
  address: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

interface BuildingAddressRow {
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBuildingAddress(row: {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}): string {
  const parts = [
    row.address_line1,
    row.address_line2,
    row.city,
    row.state,
    row.postal_code,
    row.country || 'Philippines',
  ].filter(Boolean);
  return parts.join(', ');
}

function normalizeCity(city: string | null | undefined): string {
  const raw = String(city || '').trim();
  if (!raw) return 'Angeles City';
  if (/angeles/i.test(raw)) return 'Angeles City';
  return raw;
}

function extractBarangay(line2: string | null | undefined): string | null {
  const raw = String(line2 || '').trim();
  if (!raw) return null;
  const match = raw.match(/(?:brgy\.?|barangay)\s*([^,]+)/i);
  return match?.[1]?.trim() || null;
}

/** Ordered fallback queries — full street first, then barangay / subdivision / property hints. */
export function buildGeocodeQueries(row: BuildingAddressRow): string[] {
  const city = normalizeCity(row.city);
  const state = row.state?.trim() || 'Pampanga';
  const country = row.country?.trim() || 'Philippines';
  const line1 = row.address_line1?.trim() || '';
  const line2 = row.address_line2?.trim() || '';
  const nameUpper = row.name.toUpperCase();
  const haystack = `${nameUpper} ${line1} ${line2}`.toLowerCase();

  const queries: string[] = [];
  const push = (q: string) => {
    const trimmed = q.replace(/\s+/g, ' ').trim();
    if (!trimmed) return;
    if (queries.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    queries.push(trimmed);
  };

  // Barangay / subdivision pins resolve reliably in OSM; try before exact street lines.
  if (haystack.includes('balibago')) {
    push(`Balibago, ${city}, ${state}, ${country}`);
  }
  if (haystack.includes('villasol') || haystack.includes('villa sol')) {
    push(`Anunas, ${city}, ${state}, ${country}`);
    push(`Santo Rosario, ${city}, ${state}, ${country}`);
  }

  push(formatBuildingAddress(row));
  if (line1) push(`${line1}, ${city}, ${state}, ${country}`);
  if (line2) push(`${line2}, ${city}, ${state}, ${country}`);

  const barangay = extractBarangay(line2);
  if (barangay) push(`${barangay}, ${city}, ${state}, ${country}`);

  if (/subdivision|village|estates|homes/i.test(line2)) {
    const subdivision = line2.split(',')[0]?.trim();
    if (subdivision) push(`${subdivision}, ${city}, ${state}, ${country}`);
  }

  push(`${city}, ${state}, ${country}`);

  return queries;
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Geocode a free-form address string (Nominatim). Cached in-process. */
export async function geocodeAddress(query: string): Promise<LatLng | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const withCountry = /philippines|,\s*ph\b/i.test(trimmed)
    ? trimmed
    : `${trimmed}, Philippines`;

  const cacheKey = `geocode:${withCountry.toLowerCase()}`;
  const cached = cacheGet<LatLng>(cacheKey);
  if (cached) return cached;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', withCountry);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'ph');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.warn('Nominatim geocode failed', res.status, withCountry);
      return null;
    }
    const data = (await res.json()) as NominatimResult[];
    if (!Array.isArray(data) || data.length === 0) return null;

    const latitude = parseFloat(data[0].lat);
    const longitude = parseFloat(data[0].lon);
    if (!isValidCoord(latitude, longitude)) return null;

    const result: LatLng = { latitude, longitude };
    cacheSet(cacheKey, result, GEOCODE_CACHE_TTL_MS);
    return result;
  } catch (err) {
    console.warn('Nominatim geocode error', withCountry, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Try multiple address variants until Nominatim returns a pin. */
export async function geocodeBuildingRow(
  row: BuildingAddressRow
): Promise<LatLng | null> {
  const queries = buildGeocodeQueries(row);
  for (let i = 0; i < queries.length; i += 1) {
    if (i > 0) await sleep(NOMINATIM_FALLBACK_DELAY_MS);
    const result = await geocodeAddress(queries[i]);
    if (result) {
      if (i > 0) {
        console.info(
          `[geocode] Resolved "${row.name}" via fallback: ${queries[i]}`
        );
      }
      return result;
    }
  }
  return null;
}

/**
 * Load building coords; geocode + persist if missing.
 * Returns null if address cannot be resolved.
 */
export async function ensureBuildingCoordinates(
  buildingId: string
): Promise<(BuildingLocation & { newlyGeocoded: boolean }) | null> {
  const result = await pool.query<{
    id: string;
    name: string;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    latitude: string | null;
    longitude: string | null;
  }>(
    `
    SELECT
      id, name, address_line1, address_line2, city, state, postal_code, country,
      latitude::text, longitude::text
    FROM buildings
    WHERE id = $1 AND is_active = true
    LIMIT 1
    `,
    [buildingId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const address = formatBuildingAddress(row);
  const existingLat = row.latitude != null ? parseFloat(row.latitude) : NaN;
  const existingLng = row.longitude != null ? parseFloat(row.longitude) : NaN;

  if (isValidCoord(existingLat, existingLng)) {
    return {
      id: row.id,
      name: row.name,
      address,
      latitude: existingLat,
      longitude: existingLng,
      newlyGeocoded: false,
    };
  }

  if (!address) return null;

  const geocoded = await geocodeBuildingRow(row);
  if (!geocoded) return null;

  await pool.query(
    `
    UPDATE buildings
    SET latitude = $2,
        longitude = $3,
        geocoded_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
    `,
    [buildingId, geocoded.latitude, geocoded.longitude]
  );

  return {
    id: row.id,
    name: row.name,
    address,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    newlyGeocoded: true,
  };
}
