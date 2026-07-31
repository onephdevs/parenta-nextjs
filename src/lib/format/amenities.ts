/**
 * Normalize amenity values from DB/API (array, CSV string, or JSON string).
 */
export function normalizeAmenities(value: unknown): string[] {
  if (value == null || value === '') return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        return normalizeAmenities(JSON.parse(trimmed));
      } catch {
        // fall through to CSV split
      }
    }
    return trimmed
      .split(/[,;|]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
}

export function formatAmenityLabel(amenity: string): string {
  return amenity
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
