import { describe, expect, it } from 'vitest';

import { formatAddress } from '@/lib/format/address';
import { formatAmenityLabel, normalizeAmenities } from '@/lib/format/amenities';
import { getImageUrl, landingPropertyCoverSrc, toPublicAssetUrl } from '@/lib/format/image-url';
import { contentDispositionHeader, sanitizeDownloadFileName } from '@/lib/format/upload-filename';

describe('address / amenities / images / uploads', () => {
  it('omits blank address parts', () => {
    expect(formatAddress({ city: 'Angeles', state: 'Pampanga' })).toBe('Angeles, Pampanga');
    expect(formatAddress({})).toBe('No address listed');
  });

  it('normalizes amenity arrays, JSON, and CSV', () => {
    expect(normalizeAmenities('wifi, parking')).toEqual(['wifi', 'parking']);
    expect(normalizeAmenities('["pool"]')).toEqual(['pool']);
    expect(formatAmenityLabel('air_con')).toBe('Air Con');
  });

  it('serves blob URLs as-is and local paths through the image API', () => {
    expect(getImageUrl('https://blob.example/a.jpg')).toBe('https://blob.example/a.jpg');
    expect(getImageUrl('uploads/images/a.jpg')).toBe('/api/images/serve/a.jpg');
    expect(toPublicAssetUrl('brand/x.jpg')).toBe('/brand/x.jpg');
    expect(landingPropertyCoverSrc('APARTMENT-1 BALIBAGO', null)).toBe(
      '/brand/featured-apartment-1.jpg'
    );
  });

  it('sanitizes download names in Content-Disposition', () => {
    expect(sanitizeDownloadFileName('a/b\\c.jpg')).toBe('a_b_c.jpg');
    expect(contentDispositionHeader('lease.pdf')).toMatch(/filename="lease.pdf"/);
  });
});
