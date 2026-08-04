/** Safe internal return path from a query param (admin-only). */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith('/admin')) return null;
    if (decoded.startsWith('//') || decoded.includes('://')) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function withReturnTo(href: string, returnTo: string): string {
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}returnTo=${encodeURIComponent(returnTo)}`;
}
