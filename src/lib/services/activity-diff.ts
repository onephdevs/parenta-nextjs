/**
 * Human-readable before/after field diffs for activity detail UI.
 */

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString('en-PH') : String(value);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') {
    // ISO date-ish
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    return value;
  }
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export interface FieldDiff {
  field: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

export function buildFieldDiffs(
  beforeData: Record<string, unknown> | null | undefined,
  afterData: Record<string, unknown> | null | undefined
): FieldDiff[] {
  const before = beforeData || {};
  const after = afterData || {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();

  const diffs: FieldDiff[] = [];
  for (const key of keys) {
    if (key === 'updatedAt' || key === 'updated_at' || key === 'createdAt' || key === 'created_at') {
      continue;
    }
    const b = before[key];
    const a = after[key];
    const beforeStr = formatValue(b);
    const afterStr = formatValue(a);
    const changed = JSON.stringify(b) !== JSON.stringify(a);
    if (!changed && beforeData && afterData) continue; // only show changes when both sides exist
    diffs.push({
      field: key,
      label: humanizeKey(key),
      before: beforeStr,
      after: afterStr,
      changed,
    });
  }

  // Prefer changed fields first
  return diffs.sort((x, y) => Number(y.changed) - Number(x.changed));
}
