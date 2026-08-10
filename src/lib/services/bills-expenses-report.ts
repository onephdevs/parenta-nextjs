import pool from '@/lib/db';
import {
  REPORT_CATEGORY_LABELS,
  REPORT_CATEGORY_ORDER,
  ReportCategory,
  ReportPeriodPreset,
  ReportView,
  getPeriodRange,
  normalizeExpenseCategory,
  normalizeUtilityType,
} from '@/lib/constants/bills-expenses';

export interface BillsExpensesReportFilters {
  view: ReportView;
  periodPreset: ReportPeriodPreset;
  customStart?: string;
  customEnd?: string;
  buildingId?: string;
}

export interface SummaryCategoryRow {
  category: ReportCategory;
  label: string;
  amount: number;
  percentage: number;
  count: number;
  source: 'utility' | 'expense' | 'mixed';
}

export interface DetailLineItem {
  id: string;
  source: 'utility' | 'expense';
  category: ReportCategory;
  categoryLabel: string;
  description: string;
  date: string;
  amount: number;
  buildingName?: string;
  roomNumber?: string;
  locationLabel: string;
  vendor?: string;
  status?: string;
}

export interface BillsExpensesReport {
  view: ReportView;
  periodLabel: string;
  startDate: string;
  endDate: string;
  buildingId?: string;
  buildingName?: string;
  totalAmount: number;
  summary: SummaryCategoryRow[];
  details: DetailLineItem[];
}

function locationLabel(
  buildingName?: string | null,
  roomNumber?: string | null,
  hasBuilding: boolean = true
): string {
  const building = buildingName || (hasBuilding ? 'Building' : null);
  if (building && roomNumber) return `${building} · ${roomNumber}`;
  if (building && !roomNumber) return `${building} (building-wide)`;
  if (!building && roomNumber) return `Unit ${roomNumber}`;
  return 'All buildings';
}

/**
 * Combined expense + utility bill report.
 * Summary and Detail are separate result shapes (two query templates).
 */
export async function generateBillsExpensesReport(
  filters: BillsExpensesReportFilters
): Promise<BillsExpensesReport> {
  const { startDate, endDate, label } = getPeriodRange(
    filters.periodPreset,
    filters.customStart,
    filters.customEnd
  );

  const client = await pool.connect();
  try {
    let buildingName: string | undefined;
    if (filters.buildingId) {
      const b = await client.query('SELECT name FROM buildings WHERE id = $1', [
        filters.buildingId,
      ]);
      buildingName = b.rows[0]?.name;
    }

    // --- Utility bills (exclude child allocation slices to avoid double-counting) ---
    const utilConditions = [
      'ub.parent_bill_id IS NULL',
      'ub.billing_period_start <= $2',
      'ub.billing_period_end >= $1',
      `ub.utility_type IN ('electricity', 'water', 'electric')`,
    ];
    const utilValues: unknown[] = [startDate, endDate];
    if (filters.buildingId) {
      utilValues.push(filters.buildingId);
      utilConditions.push(
        `(ub.building_id = $3 OR r.building_id = $3)`
      );
    }

    const utilQuery = `
      SELECT
        ub.id,
        ub.utility_type,
        ub.amount,
        ub.billing_period_start,
        ub.billing_period_end,
        ub.due_date,
        ub.bill_status,
        ub.provider_name,
        ub.notes,
        COALESCE(ub.cost_bearer, 'TENANT') AS cost_bearer,
        b.name as building_name,
        r.room_number
      FROM utility_bills ub
      LEFT JOIN rooms r ON ub.room_id = r.id
      LEFT JOIN buildings b ON COALESCE(ub.building_id, r.building_id) = b.id
      WHERE ${utilConditions.join(' AND ')}
      ORDER BY ub.billing_period_start DESC, ub.created_at DESC
    `;
    const utilResult = await client.query(utilQuery, utilValues);

    // --- Expenses ---
    const expConditions = ['e.expense_date BETWEEN $1 AND $2'];
    const expValues: unknown[] = [startDate, endDate];
    if (filters.buildingId) {
      expValues.push(filters.buildingId);
      expConditions.push('e.building_id = $3');
    }

    const expQuery = `
      SELECT
        e.id,
        e.category,
        e.description,
        e.amount,
        e.expense_date,
        e.vendor_name,
        e.expense_status,
        b.name as building_name,
        r.room_number
      FROM expenses e
      LEFT JOIN buildings b ON e.building_id = b.id
      LEFT JOIN rooms r ON e.room_id = r.id
      WHERE ${expConditions.join(' AND ')}
      ORDER BY e.expense_date DESC, e.created_at DESC
    `;
    const expResult = await client.query(expQuery, expValues);

    const details: DetailLineItem[] = [];

    for (const row of utilResult.rows) {
      const utilType = normalizeUtilityType(row.utility_type) || 'electricity';
      const category = utilType as ReportCategory;
      const periodStart = new Date(row.billing_period_start);
      const isOwnerAbsorbed =
        String(row.cost_bearer || 'TENANT').toUpperCase() === 'OWNER';
      const loc = row.room_number
        ? locationLabel(row.building_name, row.room_number)
        : row.building_name
          ? `${row.building_name} · Common Area`
          : 'Common Area';
      details.push({
        id: `util-${row.id}`,
        source: 'utility',
        category,
        categoryLabel: REPORT_CATEGORY_LABELS[category] || category,
        description: `${REPORT_CATEGORY_LABELS[category] || category} bill${
          row.provider_name ? ` — ${row.provider_name}` : ''
        }${isOwnerAbsorbed ? ' (owner-absorbed / vacant)' : ''}`,
        date: periodStart.toISOString().split('T')[0],
        amount: parseFloat(row.amount),
        buildingName: row.building_name || undefined,
        roomNumber: row.room_number || undefined,
        locationLabel: isOwnerAbsorbed ? `${loc} · owner cost` : loc,
        vendor: row.provider_name || undefined,
        status: row.bill_status || undefined,
      });
    }

    for (const row of expResult.rows) {
      const category = normalizeExpenseCategory(row.category);
      details.push({
        id: `exp-${row.id}`,
        source: 'expense',
        category,
        categoryLabel: REPORT_CATEGORY_LABELS[category],
        description: row.description,
        date: new Date(row.expense_date).toISOString().split('T')[0],
        amount: parseFloat(row.amount),
        buildingName: row.building_name || undefined,
        roomNumber: row.room_number || undefined,
        locationLabel: locationLabel(
          row.building_name,
          row.room_number,
          Boolean(row.building_name)
        ),
        vendor: row.vendor_name || undefined,
        status: row.expense_status || undefined,
      });
    }

    details.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    const totalAmount = details.reduce((sum, d) => sum + d.amount, 0);

    const totals = new Map<
      ReportCategory,
      { amount: number; count: number; sources: Set<'utility' | 'expense'> }
    >();

    for (const cat of REPORT_CATEGORY_ORDER) {
      totals.set(cat, { amount: 0, count: 0, sources: new Set() });
    }

    for (const item of details) {
      const bucket = totals.get(item.category) || {
        amount: 0,
        count: 0,
        sources: new Set<'utility' | 'expense'>(),
      };
      bucket.amount += item.amount;
      bucket.count += 1;
      bucket.sources.add(item.source);
      totals.set(item.category, bucket);
    }

    const summary: SummaryCategoryRow[] = REPORT_CATEGORY_ORDER.map((category) => {
      const bucket = totals.get(category)!;
      const sources = [...bucket.sources];
      const source: SummaryCategoryRow['source'] =
        sources.length === 0
          ? 'expense'
          : sources.length === 2
            ? 'mixed'
            : sources[0];
      return {
        category,
        label: REPORT_CATEGORY_LABELS[category],
        amount: Math.round(bucket.amount * 100) / 100,
        percentage:
          totalAmount > 0
            ? Math.round((bucket.amount / totalAmount) * 100)
            : 0,
        count: bucket.count,
        source,
      };
    }).filter((row) => row.count > 0 || filters.view === 'summary');

    // For summary view, only show categories with amounts (cleaner like the mockup)
    const summaryRows =
      filters.view === 'summary'
        ? summary.filter((r) => r.amount > 0)
        : summary;

    return {
      view: filters.view,
      periodLabel: label,
      startDate,
      endDate,
      buildingId: filters.buildingId,
      buildingName,
      totalAmount: Math.round(totalAmount * 100) / 100,
      summary: summaryRows,
      details: filters.view === 'detail' ? details : [],
    };
  } finally {
    client.release();
  }
}
