/**
 * Resolve a pasted Google Maps value to lat/lng.
 * Short links (maps.app.goo.gl) are followed on allowed Google hosts only.
 */

import {
  canonicalGoogleMapsUrl,
  extractMapsUrl,
  isAllowedGoogleMapsHost,
  isGoogleMapsShortUrl,
  isValidLatLng,
  parseGoogleMapsLocation,
  parseStoredCoordinate,
  type ParsedGoogleMapsLocation,
} from '@/lib/maps/google-maps-location';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 8;
const USER_AGENT = 'Parenta property maps pin (parenta.com.mx)';

export const MAPS_PIN_ERROR =
  'Could not read a map pin. Paste a Google Maps share link or coordinates like 15.145, 120.588.';

function resolveRelative(base: string, location: string): string | null {
  try {
    return new URL(location, base).toString();
  } catch {
    return null;
  }
}

async function followGoogleMapsRedirects(startUrl: string): Promise<string | null> {
  let current = startUrl;
  for (let i = 0; i < MAX_REDIRECTS; i += 1) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return null;
    }
    if (!isAllowedGoogleMapsHost(parsed.hostname)) return null;

    const immediate = parseGoogleMapsLocation(current);
    if (immediate) return current;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': USER_AGENT,
        },
        signal: controller.signal,
        cache: 'no-store',
      });
      const location = res.headers.get('location');
      if (location && res.status >= 300 && res.status < 400) {
        const next = resolveRelative(current, location);
        if (!next) return null;
        current = next;
        continue;
      }
      return res.url || current;
    } catch (err) {
      console.warn('Google Maps short-link resolve failed', current, err);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return current;
}

export async function resolveGoogleMapsLocation(
  input: string
): Promise<ParsedGoogleMapsLocation | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parsed = parseGoogleMapsLocation(trimmed);
  if (parsed) return parsed;

  const url = extractMapsUrl(trimmed);
  if (!url || !isGoogleMapsShortUrl(url)) return null;

  const finalUrl = await followGoogleMapsRedirects(url);
  if (!finalUrl) return null;

  const fromFinal = parseGoogleMapsLocation(finalUrl);
  if (!fromFinal) return null;

  return {
    ...fromFinal,
    mapsUrl: url,
  };
}

export type BuildingMapsFieldsResult =
  | { ok: true; skipped: true }
  | {
      ok: true;
      skipped: false;
      latitude: number;
      longitude: number;
      googleMapsUrl: string;
    }
  | { ok: false; error: string };

/**
 * Turn admin create/edit payload into persisted nearby-map origin fields.
 * Empty paste = skip (leave existing coords). Invalid paste = error.
 */
export async function mapsFieldsFromAdminInput(input: {
  googleMapsUrl?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}): Promise<BuildingMapsFieldsResult> {
  const raw = String(input.googleMapsUrl ?? '').trim();
  if (raw) {
    const resolved = await resolveGoogleMapsLocation(raw);
    if (!resolved) {
      return { ok: false, error: MAPS_PIN_ERROR };
    }
    return {
      ok: true,
      skipped: false,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      googleMapsUrl: resolved.mapsUrl,
    };
  }

  const latitude = parseStoredCoordinate(input.latitude);
  const longitude = parseStoredCoordinate(input.longitude);
  if (latitude != null && longitude != null) {
    if (!isValidLatLng(latitude, longitude)) {
      return { ok: false, error: MAPS_PIN_ERROR };
    }
    return {
      ok: true,
      skipped: false,
      latitude,
      longitude,
      googleMapsUrl: canonicalGoogleMapsUrl(latitude, longitude),
    };
  }

  return { ok: true, skipped: true };
}
