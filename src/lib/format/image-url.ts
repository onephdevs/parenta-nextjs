/**
 * Resolve a stored image path to a browser-usable URL.
 * Blob URLs are used as-is; legacy filesystem paths go through the serve API.
 */
export function getImageUrl(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('https://') || filePath.startsWith('http://') || filePath.startsWith('/')) {
    return filePath;
  }
  const pathParts = filePath.replace('uploads/images/', '').split('/');
  return `/api/images/serve/${pathParts.join('/')}`;
}
