/**
 * Resolve a stored image path to a browser-usable URL.
 * Blob URLs are used as-is; legacy filesystem paths go through the serve API.
 */
export function getImageUrl(filePath: string): string {
  if (!filePath) return '';

  // Guard against previously stored "/https://..." mistakes
  const cleaned = filePath.replace(/^\/+(https?:\/\/)/i, '$1').trim();

  if (cleaned.startsWith('https://') || cleaned.startsWith('http://')) {
    return cleaned;
  }
  if (cleaned.startsWith('/')) {
    return cleaned;
  }
  const pathParts = cleaned.replace('uploads/images/', '').split('/');
  return `/api/images/serve/${pathParts.join('/')}`;
}

/**
 * Same-origin landing covers for known properties.
 * Production cards were hotlinking 3–4MB Blob PNGs, which show as broken
 * images in the browser even though the Blob URL itself returns 200.
 */
const LANDING_COVERS: { test: (name: string) => boolean; src: string }[] = [
  {
    test: (name) => name.includes('apartment-1') || name.includes('balibago'),
    src: '/brand/featured-apartment-1.jpg',
  },
  {
    test: (name) =>
      name.includes('villasol') || name.includes('aprtment-2') || name.includes('apartment-2'),
    src: '/brand/featured-apartment-2.jpg',
  },
];

export function landingPropertyCoverSrc(
  name: string,
  imageUrl: string | null
): string | null {
  const key = name.toLowerCase();
  const matched = LANDING_COVERS.find((row) => row.test(key));
  if (matched) return matched.src;
  return imageUrl;
}

/** Normalize a newly uploaded asset path for storage / <img src>. */
export function toPublicAssetUrl(filePath: string): string {
  if (!filePath) return '';
  const cleaned = filePath.replace(/^\/+(https?:\/\/)/i, '$1').trim();
  if (cleaned.startsWith('https://') || cleaned.startsWith('http://') || cleaned.startsWith('/')) {
    return cleaned;
  }
  return `/${cleaned.replace(/^\/+/, '')}`;
}
