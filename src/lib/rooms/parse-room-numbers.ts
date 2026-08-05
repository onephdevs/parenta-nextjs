/** Max rooms allowed in a single bulk create. */
export const MAX_BULK_ROOMS = 100;

/**
 * Split a free-text list into unique room numbers (order preserved).
 * Accepts commas, newlines, and whitespace as separators.
 */
export function parseRoomList(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of String(text || '').split(/[\s,]+/)) {
    const cleaned = part.trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

/**
 * Expand an inclusive numeric range into room numbers with optional prefix.
 * Pads to the width of `from` when `from` has leading zeros (e.g. 01 → 05).
 */
export function expandRoomRange(
  from: string | number,
  to: string | number,
  prefix = ''
): string[] {
  const fromStr = String(from ?? '').trim();
  const toStr = String(to ?? '').trim();
  if (!fromStr || !toStr) return [];

  const start = Number.parseInt(fromStr, 10);
  const end = Number.parseInt(toStr, 10);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return [];
  }

  const padWidth = /^0\d/.test(fromStr) ? fromStr.length : 0;
  const pref = String(prefix ?? '');
  const result: string[] = [];

  for (let n = start; n <= end; n++) {
    const num = padWidth > 0 ? String(n).padStart(padWidth, '0') : String(n);
    result.push(`${pref}${num}`);
  }

  return result;
}

/** Dedupe room numbers case-insensitively while preserving first-seen casing. */
export function dedupeRoomNumbers(numbers: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of numbers) {
    const cleaned = String(raw || '').trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

/** Natural compare so "Unit 2" comes before "Unit 10". */
export function compareRoomNumbers(a: string, b: string): number {
  return String(a || '').localeCompare(String(b || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * SQL ORDER BY fragment for natural room-number sorting.
 * Pass table alias (e.g. "r") or omit for unqualified column.
 */
export function roomNumberNaturalOrderSql(alias?: string): string {
  const col = alias ? `${alias}.room_number` : 'room_number';
  return `
    regexp_replace(lower(${col}), '[0-9]+', '', 'g'),
    COALESCE(NULLIF(regexp_replace(${col}, '[^0-9]', '', 'g'), '')::bigint, 0),
    ${col}
  `;
}
