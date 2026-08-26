/**
 * Parse Google Maps share links, embed URLs, and lat/lng pairs into WGS84 coords.
 * Landing “What’s nearby” uses buildings.latitude / buildings.longitude as the origin.
 * Does not call Google Places — only reads values the admin pasted.
 */

export interface ParsedGoogleMapsLocation {
  latitude: number;
  longitude: number;
  /** URL to open in Google Maps (original link when possible). */
  mapsUrl: string;
}

const COORD_RE = String.raw`-?\d+(?:\.\d+)?`;

export function isValidLatLng(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function parseStoredCoordinate(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export function canonicalGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function formatLatLngPreview(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function isGoogleMapsShortUrl(input: string): boolean {
  const url = extractMapsUrl(input);
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'g.co';
  } catch {
    return false;
  }
}

export function isAllowedGoogleMapsHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (
    host === 'maps.app.goo.gl' ||
    host === 'goo.gl' ||
    host === 'g.co' ||
    host === 'google.com' ||
    host === 'www.google.com' ||
    host === 'maps.google.com' ||
    host === 'www.maps.google.com'
  ) {
    return true;
  }
  if (host.endsWith('.google.com')) return true;
  // google.com.ph, google.co.uk, google.com.au, …
  if (/^(www\.)?google\.[a-z.]+$/.test(host)) return true;
  return false;
}

/** Pull an http(s) Maps URL from a paste (raw URL or iframe embed). */
export function extractMapsUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const iframeSrc = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  if (iframeSrc?.[1]) {
    return normalizeMaybeUrl(iframeSrc[1]);
  }

  const rawUrl = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
  if (rawUrl?.[0]) {
    return rawUrl[0].replace(/[),.;]+$/, '');
  }

  return normalizeMaybeUrl(trimmed);
}

function normalizeMaybeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed.replace(/^\/\//, '')}`;
    const url = new URL(withProtocol);
    if (!isAllowedGoogleMapsHost(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function asLocation(
  latitude: number,
  longitude: number,
  mapsUrl: string
): ParsedGoogleMapsLocation | null {
  if (!isValidLatLng(latitude, longitude)) return null;
  return { latitude, longitude, mapsUrl };
}

function parseBareCoordinates(input: string): ParsedGoogleMapsLocation | null {
  const trimmed = input.trim();
  const match = trimmed.match(
    new RegExp(`^\\s*@?(${COORD_RE})\\s*[,\\s]\\s*(${COORD_RE})\\s*$`)
  );
  if (!match) return null;
  const latitude = Number.parseFloat(match[1]);
  const longitude = Number.parseFloat(match[2]);
  return asLocation(latitude, longitude, canonicalGoogleMapsUrl(latitude, longitude));
}

function parseQueryLatLng(params: URLSearchParams): { lat: number; lng: number } | null {
  const candidates = [
    params.get('query'),
    params.get('q'),
    params.get('ll'),
    params.get('center'),
    params.get('destination'),
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const decoded = decodeURIComponent(raw.replace(/\+/g, ' ')).trim();
    const loc = decoded.match(
      new RegExp(`(?:^loc:)?\\s*(${COORD_RE})\\s*[,+\\s]\\s*(${COORD_RE})\\s*$`, 'i')
    );
    if (!loc) continue;
    const latitude = Number.parseFloat(loc[1]);
    const longitude = Number.parseFloat(loc[2]);
    if (isValidLatLng(latitude, longitude)) {
      return { lat: latitude, lng: longitude };
    }
  }
  return null;
}

function parseAtLatLng(href: string): { lat: number; lng: number } | null {
  const match = href.match(new RegExp(`/@(${COORD_RE}),(${COORD_RE})(?:,|\\b)`));
  if (!match) return null;
  const latitude = Number.parseFloat(match[1]);
  const longitude = Number.parseFloat(match[2]);
  if (!isValidLatLng(latitude, longitude)) return null;
  return { lat: latitude, lng: longitude };
}

function parsePlaceMarker3d4d(href: string): { lat: number; lng: number } | null {
  const match = href.match(new RegExp(`!3d(${COORD_RE})!4d(${COORD_RE})`));
  if (!match) return null;
  const latitude = Number.parseFloat(match[1]);
  const longitude = Number.parseFloat(match[2]);
  if (!isValidLatLng(latitude, longitude)) return null;
  return { lat: latitude, lng: longitude };
}

/** Embed camera: !2dLNG!3dLAT (checked after !3d!4d so place pins win). */
function parseEmbedCamera2d3d(href: string): { lat: number; lng: number } | null {
  const match = href.match(new RegExp(`!2d(${COORD_RE})!3d(${COORD_RE})`));
  if (!match) return null;
  const longitude = Number.parseFloat(match[1]);
  const latitude = Number.parseFloat(match[2]);
  if (!isValidLatLng(latitude, longitude)) return null;
  return { lat: latitude, lng: longitude };
}

/**
 * Extract WGS84 coordinates from a Google Maps paste.
 * Returns null for short links (those need a server-side redirect follow).
 */
export function parseGoogleMapsLocation(
  input: string
): ParsedGoogleMapsLocation | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromBare = parseBareCoordinates(trimmed);
  if (fromBare) return fromBare;

  const url = extractMapsUrl(trimmed);
  if (!url) return null;
  if (isGoogleMapsShortUrl(url)) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const href = parsedUrl.toString();
  const fromMarker = parsePlaceMarker3d4d(href);
  if (fromMarker) {
    return asLocation(fromMarker.lat, fromMarker.lng, url);
  }

  const fromAt = parseAtLatLng(href);
  if (fromAt) {
    return asLocation(fromAt.lat, fromAt.lng, url);
  }

  const fromQuery = parseQueryLatLng(parsedUrl.searchParams);
  if (fromQuery) {
    return asLocation(fromQuery.lat, fromQuery.lng, url);
  }

  const fromEmbed = parseEmbedCamera2d3d(href);
  if (fromEmbed) {
    return asLocation(fromEmbed.lat, fromEmbed.lng, url);
  }

  return null;
}

export function mapsFieldPrefill(building: {
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): string {
  const stored = building.googleMapsUrl?.trim();
  if (stored) return stored;
  const lat = building.latitude;
  const lng = building.longitude;
  if (lat != null && lng != null && isValidLatLng(lat, lng)) {
    return formatLatLngPreview(lat, lng);
  }
  return '';
}
