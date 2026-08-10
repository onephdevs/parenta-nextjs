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
  'SUBMETERED',
  'SHARED_MANUAL',
  'NOT_APPLICABLE',
  // Legacy aliases (still accepted on read/write during transition)
  'per_unit_metered',
  'split_evenly',
  'flat',
] as const;
export type AllocationMethod = (typeof ALLOCATION_METHODS)[number];

/** Canonical methods from client discovery Phase 1 */
export const CANONICAL_ALLOCATION_METHODS = [
  'SUBMETERED',
  'SHARED_MANUAL',
  'NOT_APPLICABLE',
] as const;
export type CanonicalAllocationMethod = (typeof CANONICAL_ALLOCATION_METHODS)[number];

export const ALLOCATION_METHOD_LABELS: Record<string, string> = {
  SUBMETERED: 'Submetered (per-unit meter)',
  SHARED_MANUAL: 'Shared — manual split',
  NOT_APPLICABLE: 'Not applicable (own account)',
  per_unit_metered: 'Per-unit metered',
  split_evenly: 'Split evenly across units',
  flat: 'Flat (building-wide / common area)',
};

export const UTILITY_APPLICABILITY_STATUSES = ['APPLICABLE', 'NOT_APPLICABLE'] as const;
export type UtilityApplicabilityStatus = (typeof UTILITY_APPLICABILITY_STATUSES)[number];

export function toCanonicalAllocationMethod(
  raw: string | null | undefined
): CanonicalAllocationMethod {
  const key = (raw || '').trim();
  const upper = key.toUpperCase();
  if (upper === 'SUBMETERED' || key === 'per_unit_metered' || key === 'usage') {
    return 'SUBMETERED';
  }
  if (
    upper === 'SHARED_MANUAL' ||
    key === 'split_evenly' ||
    key === 'equal' ||
    key === 'room_size' ||
    key === 'custom'
  ) {
    return 'SHARED_MANUAL';
  }
  if (upper === 'NOT_APPLICABLE') {
    return 'NOT_APPLICABLE';
  }
  if (key === 'flat') return 'SHARED_MANUAL';
  return 'SUBMETERED';
}

/** Format amount for UI: N/A → em dash, else currency-ready number string. */
export function formatUtilityAmountDisplay(
  applicabilityStatus: string | null | undefined,
  amount: number | null | undefined
): string {
  if (String(applicabilityStatus || '').toUpperCase() === 'NOT_APPLICABLE') {
    return '–';
  }
  if (amount == null || Number.isNaN(Number(amount))) {
    return '–';
  }
  return String(amount);
}

/** Canonical expense categories — free-typed values map to OTHER in reports */
export const EXPENSE_CATEGORIES = [
  'cleaning',
  'maintenance',
  'repair',
  'upgrade',
  'garbage_collection',
  'food_allowance',
  'fuel_diesel',
  'staff_salary',
  'refund',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  repair: 'Repair',
  upgrade: 'Upgrade',
  garbage_collection: 'Garbage collection',
  food_allowance: 'Food allowance',
  fuel_diesel: 'Fuel / diesel',
  staff_salary: 'Staff salary',
  refund: 'Refund',
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
  'food_allowance',
  'fuel_diesel',
  'staff_salary',
  'refund',
  'other',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORY_ORDER)[number];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  electricity: 'Electric',
  water: 'Water',
  ...EXPENSE_CATEGORY_LABELS,
};

export function normalizeExpenseCategory(raw: string | null | undefined): ExpenseCategory {
  let key = (raw || 'other').toLowerCase().trim().replace(/\s+/g, '_');
  // Accept SCREAMING_SNAKE from client docs
  const upperAliases: Record<string, ExpenseCategory> = {
    food_allowance: 'food_allowance',
    fuel_diesel: 'fuel_diesel',
    staff_salary: 'staff_salary',
    refund: 'refund',
    garbage_collection: 'garbage_collection',
  };
  if (upperAliases[key]) return upperAliases[key];
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(key)) {
    return key as ExpenseCategory;
  }
  return 'other';
}

/** Human-readable label for expense or report category keys (e.g. garbage_collection). */
export function formatReportCategoryLabel(raw: string | null | undefined): string {
  const key = (raw || '').toLowerCase().trim().replace(/\s+/g, '_');
  if (key in REPORT_CATEGORY_LABELS) {
    return REPORT_CATEGORY_LABELS[key as ReportCategory];
  }
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(key)) {
    return EXPENSE_CATEGORY_LABELS[key as ExpenseCategory];
  }
  if (!key) return 'Other';
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
  const key = (raw || '').trim();
  if ((ALLOCATION_METHODS as readonly string[]).includes(key)) {
    return key as AllocationMethod;
  }
  const canonical = toCanonicalAllocationMethod(raw);
  if (!hasUnit && canonical === 'SUBMETERED') {
    return 'SHARED_MANUAL';
  }
  return canonical;
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

  const fmt = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
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
