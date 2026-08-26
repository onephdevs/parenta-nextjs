export type OccupancyHistoryBadge = 'current' | 'renewed' | 'terminated';

export function occupancyDateKey(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const iso = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    if (value.toISOString().endsWith('T00:00:00.000Z')) {
      return value.toISOString().slice(0, 10);
    }
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const raw = String(value);
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : raw.slice(0, 10);
}

function normalizePersonName(name?: string | null): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isSamePerson(
  a: { tenantId?: string | null; tenantName?: string | null },
  b: { tenantId?: string | null; tenantName?: string | null }
): boolean {
  const idA = String(a.tenantId || '').trim();
  const idB = String(b.tenantId || '').trim();
  if (idA && idB && idA === idB) return true;
  const nameA = normalizePersonName(a.tenantName);
  const nameB = normalizePersonName(b.tenantName);
  return Boolean(nameA && nameB && nameA === nameB);
}

function isCurrentStay(item: {
  assignmentStatus?: string | null;
  endDate?: string | Date | null;
}): boolean {
  const status = String(item.assignmentStatus || '').toLowerCase();
  if (status !== 'active' && status !== 'pending') return false;
  const end = occupancyDateKey(item.endDate);
  if (!end) return true;
  const today = new Date().toISOString().slice(0, 10);
  return end >= today;
}

/** Current if live; Renewed if the same person has a later stay on this room; else Terminated. */
export function withOccupancyHistoryBadges<
  T extends {
    id: string;
    tenantId?: string | null;
    tenantName?: string | null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    assignmentStatus?: string | null;
  },
>(items: T[]): Array<T & { occupancyBadge: OccupancyHistoryBadge }> {
  return items.map((item) => {
    if (isCurrentStay(item)) {
      return { ...item, occupancyBadge: 'current' as const };
    }
    const start = occupancyDateKey(item.startDate);
    const hasLaterStay = items.some((other) => {
      if (other.id === item.id) return false;
      if (!isSamePerson(item, other)) return false;
      return occupancyDateKey(other.startDate) > start;
    });
    return {
      ...item,
      occupancyBadge: hasLaterStay ? ('renewed' as const) : ('terminated' as const),
    };
  });
}
