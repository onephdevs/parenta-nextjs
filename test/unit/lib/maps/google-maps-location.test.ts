import { describe, expect, it } from 'vitest';

import {
  canonicalGoogleMapsUrl,
  extractMapsUrl,
  isAllowedGoogleMapsHost,
  isValidLatLng,
  parseStoredCoordinate,
} from '@/lib/maps/google-maps-location';

describe('google maps location parsing', () => {
  it('validates WGS84 bounds', () => {
    expect(isValidLatLng(15.13, 120.59)).toBe(true);
    expect(isValidLatLng(91, 0)).toBe(false);
  });

  it('parses stored coordinates and builds a search URL', () => {
    expect(parseStoredCoordinate('15.13')).toBe(15.13);
    expect(canonicalGoogleMapsUrl(15.13, 120.59)).toContain('15.13,120.59');
  });

  it('allows Google Maps hosts and extracts an iframe src', () => {
    expect(isAllowedGoogleMapsHost('maps.google.com')).toBe(true);
    expect(isAllowedGoogleMapsHost('evil.example')).toBe(false);
    expect(
      extractMapsUrl('<iframe src="https://www.google.com/maps/embed?pb=1"></iframe>')
    ).toBe('https://www.google.com/maps/embed?pb=1');
  });
});
