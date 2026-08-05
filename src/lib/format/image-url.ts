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

/** Normalize a newly uploaded asset path for storage / <img src>. */
export function toPublicAssetUrl(filePath: string): string {
  if (!filePath) return '';
  const cleaned = filePath.replace(/^\/+(https?:\/\/)/i, '$1').trim();
  if (cleaned.startsWith('https://') || cleaned.startsWith('http://') || cleaned.startsWith('/')) {
    return cleaned;
  }
  return `/${cleaned.replace(/^\/+/, '')}`;
}
