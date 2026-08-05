/** Shared enums for utility bills, expenses, and reports. Keep forms + report grouping in sync. */

export const UTILITY_TYPES = ['electricity', 'water'] as const;
export type UtilityType = (typeof UTILITY_TYPES)[number];

export const UTILITY_TYPE_LABELS: Record<UtilityType, string> = {
  electricity: 'Electric',
  water: 'Water',
};

export const BILL_STATUSES = ['pending', 'paid', 'overdue'] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const ALLOCATION_METHODS = [
  'per_unit_metered',
  'split_evenly',
  'flat',
] as const;
export type AllocationMethod = (typeof ALLOCATION_METHODS)[number];

export const ALLOCATION_METHOD_LABELS: Record<AllocationMethod, string> = {
  per_unit_metered: 'Per-unit metered',
  split_evenly: 'Split evenly across units',
  flat: 'Flat (building-wide / common area)',
};

/** Canonical expense categories — free-typed values map to OTHER in reports */
export const EXPENSE_CATEGORIES = [
  'cleaning',
  'maintenance',
  'repair',
  'upgrade',
  'garbage_collection',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  repair: 'Repair',
  upgrade: 'Upgrade',
  garbage_collection: 'Garbage collection',
  other: 'Other',
};

/** Report grouping keys include utility types + expense categories */
export const REPORT_CATEGORY_ORDER = [
  'electricity',
  'water',
  'cleaning',
  'maintenance',
  'repair',
  'upgrade',
  'garbage_collection',
  'other',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORY_ORDER)[number];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  electricity: 'Electric',
  water: 'Water',
  ...EXPENSE_CATEGORY_LABELS,
};

export function normalizeExpenseCategory(raw: string | null | undefined): ExpenseCategory {
  const key = (raw || 'other').toLowerCase().trim().replace(/\s+/g, '_');
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(key)) {
    return key as ExpenseCategory;
  }
  return 'other';
}

export function normalizeUtilityType(raw: string | null | undefined): UtilityType | null {
  const key = (raw || '').toLowerCase().trim();
  if (key === 'electric' || key === 'electricity') return 'electricity';
  if (key === 'water') return 'water';
  return null;
}

export function normalizeAllocationMethod(
  raw: string | null | undefined,
  hasUnit: boolean
): AllocationMethod {
  const key = (raw || '').toLowerCase().trim();
  if ((ALLOCATION_METHODS as readonly string[]).includes(key)) {
    return key as AllocationMethod;
  }
  return hasUnit ? 'per_unit_metered' : 'flat';
}

export type ReportView = 'summary' | 'detail';
export type ReportPeriodPreset =
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'last_6_months'
  | 'this_year'
  | 'custom';

export function getPeriodRange(
  preset: ReportPeriodPreset,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const monthLabel = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  switch (preset) {
    case 'this_month': {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { startDate: fmt(start), endDate: fmt(end), label: monthLabel(start) };
    }
    case 'last_month': {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { startDate: fmt(start), endDate: fmt(end), label: monthLabel(start) };
    }
    case 'this_quarter': {
      const q = Math.floor(m / 3);
      const start = new Date(y, q * 3, 1);
      const end = new Date(y, q * 3 + 3, 0);
      return {
        startDate: fmt(start),
        endDate: fmt(end),
        label: `Q${q + 1} ${y}`,
      };
    }
    case 'last_quarter': {
      const q = Math.floor(m / 3) - 1;
      const year = q < 0 ? y - 1 : y;
      const qq = q < 0 ? 3 : q;
      const start = new Date(year, qq * 3, 1);
      const end = new Date(year, qq * 3 + 3, 0);
      return {
        startDate: fmt(start),
        endDate: fmt(end),
        label: `Q${qq + 1} ${year}`,
      };
    }
    case 'last_6_months': {
      const start = new Date(y, m - 5, 1);
      const end = new Date(y, m + 1, 0);
      return {
        startDate: fmt(start),
        endDate: fmt(end),
        label: `${monthLabel(start)} – ${monthLabel(end)}`,
      };
    }
    case 'this_year': {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      return { startDate: fmt(start), endDate: fmt(end), label: String(y) };
    }
    case 'custom':
    default: {
      const startDate = customStart || fmt(new Date(y, m, 1));
      const endDate = customEnd || fmt(today);
      return {
        startDate,
        endDate,
        label: `${startDate} – ${endDate}`,
      };
    }
  }
}
