/**
 * Admin Home portfolio ledger — occupancy, collection, expenses, rent roll,
 * utility recovery, and disbursement waterfall for a billing period.
 */

import pool from '@/lib/db';
import { EFFECTIVE_DUE_SQL } from '@/lib/billing/invoice-due';
import { formatReportCategoryLabel } from '@/lib/constants/bills-expenses';
import type {
  ExpenseCategoryRow,
  LedgerAlert,
  LedgerBuilding,
  PortfolioLedgerData,
  PropertyCardData,
  RentRollRow,
  RentRollStatus,
  WaterfallStep,
} from '@/lib/portfolio-ledger-types';
import { PAYMENT_IS_REVENUE_UNIT, ROOM_IS_REVENUE } from '@/lib/sql/revenue-unit-filter';

export type {
  ExpenseCategoryRow,
  LedgerAlert,
  LedgerBuilding,
  LedgerKpis,
  PortfolioLedgerData,
  PropertyCardData,
  RentRollRow,
  RentRollStatus,
  UtilityRecoveryRow,
  WaterfallStep,
} from '@/lib/portfolio-ledger-types';

const PAID = `p.payment_status IN ('paid', 'completed', 'confirmed')`;
const OPEN_INVOICE = `i.invoice_status IN ('sent', 'partial', 'overdue')`;
/** Operating expenses only — cash allowance / owner draws are a separate waterfall line */
const OPERATING_EXPENSE = `COALESCE(e.category, 'other') NOT IN ('cash_allowance', 'owner_draw')`;
const CASH_ALLOWANCE_EXPENSE = `COALESCE(e.category, 'other') IN ('cash_allowance', 'owner_draw')`;
/** Excel Total Collection = all paid cash (rent, advance, utility, deposit); cheques are added later */
const COLLECTION_PAYMENT = `
  ${PAID}
  AND LOWER(COALESCE(p.payment_method, 'cash')) NOT IN ('cheque', 'check')
  AND ${PAYMENT_IS_REVENUE_UNIT}
`;

function num(v: unknown): number {
  return Math.round((Number(v) || 0) * 100) / 100;
}

function isoDate(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function formatDay(value: unknown): string | null {
  const iso = isoDate(value);
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function shortBuildingName(name: string): string {
  const upper = name.trim().toUpperCase();
  if (upper.includes('BALIBAGO')) return 'Balibago';
  if (upper.includes('VILLASOL')) return 'Villasol';
  return name.replace(/^APRT?MENT-?\d+\s*/i, '').trim() || name;
}

function unitLabel(roomNumber: string): string {
  const n = String(roomNumber || '').trim();
  if (!n) return 'Unit';
  if (/^unit\b/i.test(n)) return n;
  return `Unit ${n}`;
}

function monthKey(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, '0')}`;
}

function rangeFromYearMonth(year: number, month1: number) {
  /**
   * Apartment records billing cycle: 16th of previous month → 15th of selected month.
   * Example: July 2026 → 2026-06-16 … 2026-07-15
   */
  const end = new Date(Date.UTC(year, month1 - 1, 15));
  const start = new Date(Date.UTC(year, month1 - 2, 16));
  const priorEnd = new Date(Date.UTC(year, month1 - 2, 15));
  const priorStart = new Date(Date.UTC(year, month1 - 3, 16));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const startLabel = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const endLabel = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const cycleMonth = end.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return {
    startDate: iso(start),
    endDate: iso(end),
    periodLabel: `${cycleMonth} (${startLabel} – ${endLabel})`,
    monthKey: monthKey(year, month1),
    priorStart: iso(priorStart),
    priorEnd: iso(priorEnd),
  };
}

export function manilaMonthRange(anchor = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(anchor);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  return rangeFromYearMonth(year, month);
}

export function rangeFromMonthKey(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!match) return manilaMonthRange();
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return manilaMonthRange();
  return rangeFromYearMonth(year, month);
}

function monthOptions(fromIso: string | null, toKey: string): { value: string; label: string }[] {
  const end = rangeFromMonthKey(toKey);
  const [endY, endM] = [Number(end.monthKey.slice(0, 4)), Number(end.monthKey.slice(5, 7))];
  let startY = endY;
  let startM = endM;
  if (fromIso) {
    const d = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      startY = d.getUTCFullYear();
      startM = d.getUTCMonth() + 1;
    }
  }
  const options: { value: string; label: string }[] = [];
  let y = endY;
  let m = endM;
  let guard = 0;
  while (guard < 36 && (y > startY || (y === startY && m >= startM))) {
    const range = rangeFromYearMonth(y, m);
    options.push({ value: range.monthKey, label: range.periodLabel });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    guard += 1;
  }
  return options;
}

function buildingClause(alias: 'b' | 'e' | 'ub'): string {
  if (alias === 'e') return `AND ($3::uuid IS NULL OR e.building_id = $3)`;
  if (alias === 'ub') {
    return `AND ($3::uuid IS NULL OR COALESCE(ub.building_id, r.building_id) = $3)`;
  }
  return `AND ($3::uuid IS NULL OR b.id = $3)`;
}

const PAYMENT_BUILDING = `
  AND (
    $3::uuid IS NULL
    OR EXISTS (
      SELECT 1
      FROM rooms pr
      WHERE pr.id = p.room_id AND pr.building_id = $3
    )
    OR EXISTS (
      SELECT 1
      FROM tenant_room_assignments ptra
      JOIN rooms pr ON pr.id = ptra.room_id
      WHERE ptra.tenant_id = p.tenant_id
        AND pr.building_id = $3
    )
  )
`;

function deriveStatus(row: {
  room_status: string;
  assignment_status: string | null;
  start_date: unknown;
  end_date: unknown;
  balance_due: number;
  days_past_due: number;
  days_until_due: number | null;
  paid_date: unknown;
  due_date: unknown;
  startDate: string;
  endDate: string;
}): { status: RentRollStatus; daysLate: number | null } {
  const roomStatus = String(row.room_status || '').toLowerCase();
  const assignment = String(row.assignment_status || '').toLowerCase();
  const startIso = isoDate(row.start_date);
  const endIso = isoDate(row.end_date);

  if (assignment === 'terminated' || (endIso && endIso >= row.startDate && endIso <= row.endDate && roomStatus !== 'occupied')) {
    return { status: 'moveOut', daysLate: null };
  }
  if (roomStatus === 'vacant' || !assignment || assignment !== 'active') {
    return { status: 'vacant', daysLate: null };
  }
  if (startIso && startIso >= row.startDate && startIso <= row.endDate) {
    return { status: 'newTenant', daysLate: null };
  }
  if (row.days_past_due >= 30 || (row.days_until_due != null && row.days_until_due <= 7 && row.balance_due > 0 && row.days_past_due === 0)) {
    return { status: 'atRisk', daysLate: row.days_past_due > 0 ? row.days_past_due : null };
  }
  if (row.days_past_due > 0) {
    return { status: 'late', daysLate: row.days_past_due };
  }
  const paidIso = isoDate(row.paid_date);
  const dueIso = isoDate(row.due_date);
  if (paidIso && dueIso && paidIso > dueIso) {
    const days = Math.round(
      (new Date(`${paidIso}T00:00:00`).getTime() - new Date(`${dueIso}T00:00:00`).getTime()) /
        86400000
    );
    return { status: 'late', daysLate: days };
  }
  return { status: 'onTime', daysLate: paidIso && dueIso ? Math.min(0, Math.round(
    (new Date(`${paidIso}T00:00:00`).getTime() - new Date(`${dueIso}T00:00:00`).getTime()) / 86400000
  )) : null };
}

export async function getPortfolioLedger(params: {
  month?: string;
  startDate?: string;
  endDate?: string;
  buildingId?: string | null;
}): Promise<PortfolioLedgerData> {
  const current = manilaMonthRange();
  const range = params.month
    ? rangeFromMonthKey(params.month)
    : params.startDate && params.endDate
      ? rangeFromMonthKey(params.startDate.slice(0, 7))
      : current;
  const startDate = params.startDate || range.startDate;
  const endDate = params.endDate || range.endDate;
  const buildingId = params.buildingId || null;
  const priorStart = range.priorStart;
  const priorEnd = range.priorEnd;
  const periodLabel = range.periodLabel;
  const selectedMonthKey = range.monthKey;

  const base = [startDate, endDate, buildingId] as unknown[];

  const [
    occupancyRes,
    collectionRes,
    priorCollectionRes,
    expensesTotalRes,
    expensesByCatRes,
    utilityExpenseRes,
    waterfallRes,
    rentRollRes,
    recoveryRes,
    earliestRes,
  ] = await Promise.all([
    pool.query(
      `
      SELECT
        b.id,
        b.name,
        COUNT(r.id)::int AS total,
        COUNT(r.id) FILTER (WHERE LOWER(COALESCE(r.room_status, '')) = 'occupied')::int AS occupied,
        COUNT(r.id) FILTER (WHERE LOWER(COALESCE(r.room_status, '')) = 'vacant')::int AS vacant
      FROM buildings b
      LEFT JOIN rooms r
        ON r.building_id = b.id
       AND COALESCE(r.is_active, true)
       AND ${ROOM_IS_REVENUE}
      WHERE COALESCE(b.is_active, true)
      GROUP BY b.id, b.name
      ORDER BY b.name
      `,
      []
    ),
    pool.query(
      `
      SELECT
        COALESCE(r.building_id, r2.building_id) AS building_id,
        COALESCE(SUM(p.amount), 0) AS total
      FROM payments p
      LEFT JOIN rooms r ON r.id = p.room_id
      LEFT JOIN LATERAL (
        SELECT pr.building_id
        FROM tenant_room_assignments ptra
        JOIN rooms pr ON pr.id = ptra.room_id
        WHERE ptra.tenant_id = p.tenant_id
        ORDER BY CASE WHEN ptra.assignment_status = 'active' THEN 0 ELSE 1 END, ptra.start_date DESC
        LIMIT 1
      ) r2 ON p.room_id IS NULL
      WHERE p.payment_date BETWEEN $1 AND $2
        AND ${COLLECTION_PAYMENT}
      GROUP BY 1
      `,
      [startDate, endDate]
    ),
    pool.query(
      `
      SELECT COALESCE(SUM(p.amount), 0) AS total
      FROM payments p
      WHERE p.payment_date BETWEEN $1 AND $2
        AND ${COLLECTION_PAYMENT}
        ${PAYMENT_BUILDING}
      `,
      [priorStart, priorEnd, buildingId]
    ),
    pool.query(
      `
      SELECT COALESCE(SUM(e.amount), 0) AS total
      FROM expenses e
      WHERE e.expense_date BETWEEN $1 AND $2
        AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
        AND ${OPERATING_EXPENSE}
        ${buildingClause('e')}
      `,
      base
    ),
    pool.query(
      `
      SELECT COALESCE(e.category, 'other') AS category, COALESCE(SUM(e.amount), 0) AS amount
      FROM expenses e
      WHERE e.expense_date BETWEEN $1 AND $2
        AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
        AND ${OPERATING_EXPENSE}
        ${buildingClause('e')}
      GROUP BY 1
      ORDER BY amount DESC
      `,
      base
    ),
    pool.query(
      `
      SELECT
        CASE
          WHEN LOWER(COALESCE(ub.utility_type, '')) IN ('electric', 'electricity') THEN 'electricity'
          ELSE 'water'
        END AS category,
        COALESCE(SUM(ub.amount), 0) AS amount
      FROM utility_bills ub
      LEFT JOIN rooms r ON r.id = ub.room_id
      WHERE ub.parent_bill_id IS NULL
        AND ub.room_id IS NULL
        AND LOWER(COALESCE(ub.utility_type, '')) IN ('electric', 'electricity', 'water')
        AND ub.billing_period_start <= $2::date
        AND ub.billing_period_end >= $1::date
        AND COALESCE(ub.bill_status, 'pending') IS DISTINCT FROM 'cancelled'
        ${buildingClause('ub')}
      GROUP BY 1
      `,
      base
    ),
    pool.query(
      `
      SELECT
        (
          SELECT COALESCE(SUM(p.amount), 0)
          FROM payments p
          WHERE p.payment_date BETWEEN $1 AND $2
            AND ${COLLECTION_PAYMENT}
            ${PAYMENT_BUILDING}
        ) AS collection,
        (
          SELECT COALESCE(SUM(e.amount), 0)
          FROM expenses e
          WHERE e.expense_date BETWEEN $1 AND $2
            AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
            AND ${OPERATING_EXPENSE}
            ${buildingClause('e')}
        ) AS expenses,
        (
          SELECT COALESCE(SUM(e.amount), 0)
          FROM expenses e
          WHERE e.expense_date BETWEEN $1 AND $2
            AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
            AND ${CASH_ALLOWANCE_EXPENSE}
            ${buildingClause('e')}
        ) AS cash_allowance,
        (
          SELECT COALESCE(SUM(p.amount), 0)
          FROM payments p
          WHERE p.payment_date BETWEEN $1 AND $2
            AND ${PAID}
            AND LOWER(COALESCE(p.payment_method, '')) IN ('cheque', 'check')
            AND ${PAYMENT_IS_REVENUE_UNIT}
            ${PAYMENT_BUILDING}
        ) AS cheque
      `,
      base
    ),
    pool.query(
      `
      SELECT
        r.id AS room_id,
        r.room_number,
        r.room_status,
        r.monthly_rate,
        b.id AS building_id,
        b.name AS building_name,
        tra.start_date,
        tra.end_date,
        tra.assignment_status,
        t.id AS tenant_id,
        inv.due_date,
        inv.balance_due,
        inv.days_past_due,
        inv.days_until_due,
        pay.paid_date,
        pay.paid_amount,
        elec.amount AS elec_amount,
        water.amount AS water_amount
      FROM rooms r
      JOIN buildings b ON b.id = r.building_id
      LEFT JOIN LATERAL (
        SELECT tra.start_date, tra.end_date, tra.assignment_status, tra.tenant_id
        FROM tenant_room_assignments tra
        WHERE tra.room_id = r.id
          AND (
            tra.assignment_status = 'active'
            OR (
              tra.assignment_status = 'terminated'
              AND tra.end_date BETWEEN $1::date AND $2::date
            )
          )
        ORDER BY CASE WHEN tra.assignment_status = 'active' THEN 0 ELSE 1 END, tra.start_date DESC
        LIMIT 1
      ) tra ON true
      LEFT JOIN tenants t ON t.id = tra.tenant_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            MIN(${EFFECTIVE_DUE_SQL}) FILTER (
              WHERE ${OPEN_INVOICE} AND i.balance_due > 0 AND ${EFFECTIVE_DUE_SQL} >= CURRENT_DATE
            ),
            MIN(${EFFECTIVE_DUE_SQL}) FILTER (
              WHERE ${OPEN_INVOICE} AND i.balance_due > 0 AND ${EFFECTIVE_DUE_SQL} < CURRENT_DATE
            ),
            MIN(${EFFECTIVE_DUE_SQL}) FILTER (
              WHERE i.invoice_status NOT IN ('draft', 'cancelled')
                AND COALESCE(i.billing_period_start, ${EFFECTIVE_DUE_SQL}) <= $2::date
                AND COALESCE(i.billing_period_end, ${EFFECTIVE_DUE_SQL}) >= $1::date
            )
          ) AS due_date,
          COALESCE(SUM(i.balance_due) FILTER (WHERE ${OPEN_INVOICE}), 0) AS balance_due,
          COALESCE(
            MAX(
              CASE
                WHEN ${OPEN_INVOICE} AND i.balance_due > 0 AND ${EFFECTIVE_DUE_SQL} < CURRENT_DATE
                THEN (CURRENT_DATE - ${EFFECTIVE_DUE_SQL})
                ELSE 0
              END
            ),
            0
          ) AS days_past_due,
          MIN(
            CASE
              WHEN ${OPEN_INVOICE} AND i.balance_due > 0 AND ${EFFECTIVE_DUE_SQL} >= CURRENT_DATE
              THEN (${EFFECTIVE_DUE_SQL} - CURRENT_DATE)
            END
          ) AS days_until_due
        FROM invoices i
        WHERE i.tenant_id = t.id
      ) inv ON true
      LEFT JOIN LATERAL (
        SELECT MAX(p.payment_date) AS paid_date, COALESCE(SUM(p.amount), 0) AS paid_amount
        FROM payments p
        WHERE p.tenant_id = t.id
          AND p.payment_date BETWEEN $1::date AND $2::date
          AND ${PAID}
          AND COALESCE(p.payment_type, '') NOT IN ('deposit')
      ) pay ON true
      LEFT JOIN LATERAL (
        SELECT ub.amount
        FROM utility_bills ub
        WHERE ub.room_id = r.id
          AND ub.parent_bill_id IS NULL
          AND LOWER(COALESCE(ub.utility_type, '')) IN ('electric', 'electricity')
          AND ub.billing_period_start <= $2::date
          AND ub.billing_period_end >= $1::date
        ORDER BY ub.due_date DESC NULLS LAST
        LIMIT 1
      ) elec ON true
      LEFT JOIN LATERAL (
        SELECT ub.amount
        FROM utility_bills ub
        WHERE ub.room_id = r.id
          AND ub.parent_bill_id IS NULL
          AND LOWER(COALESCE(ub.utility_type, '')) = 'water'
          AND ub.billing_period_start <= $2::date
          AND ub.billing_period_end >= $1::date
        ORDER BY ub.due_date DESC NULLS LAST
        LIMIT 1
      ) water ON true
      WHERE COALESCE(r.is_active, true)
        AND COALESCE(b.is_active, true)
        AND ${ROOM_IS_REVENUE}
      ORDER BY b.name, NULLIF(regexp_replace(r.room_number, '\\D', '', 'g'), '')::int NULLS LAST, r.room_number
      `,
      [startDate, endDate]
    ),
    pool.query(
      `
      SELECT
        b.id AS building_id,
        b.name AS building_name,
        CASE
          WHEN LOWER(COALESCE(ub.utility_type, '')) IN ('electric', 'electricity') THEN 'Electric'
          ELSE 'Water'
        END AS util_type,
        COALESCE(SUM(ub.amount) FILTER (WHERE ub.room_id IS NULL), 0) AS billed,
        COALESCE(
          SUM(ub.amount) FILTER (
            WHERE ub.room_id IS NOT NULL AND COALESCE(ub.cost_bearer, 'TENANT') = 'TENANT'
          ),
          0
        ) AS recovered
      FROM utility_bills ub
      LEFT JOIN rooms r ON r.id = ub.room_id
      JOIN buildings b ON b.id = COALESCE(ub.building_id, r.building_id)
      WHERE ub.parent_bill_id IS NULL
        AND LOWER(COALESCE(ub.utility_type, '')) IN ('electric', 'electricity', 'water')
        AND ub.billing_period_start <= $2::date
        AND ub.billing_period_end >= $1::date
        AND COALESCE(ub.bill_status, 'pending') IS DISTINCT FROM 'cancelled'
        AND COALESCE(b.is_active, true)
        ${buildingClause('ub')}
      GROUP BY b.id, b.name, 3
      ORDER BY b.name, 3
      `,
      base
    ),
    pool.query(
      `
      SELECT LEAST(
        (SELECT MIN(payment_date) FROM payments),
        (SELECT MIN(expense_date) FROM expenses)
      )::date AS min_date
      `
    ),
  ]);

  const buildings: LedgerBuilding[] = occupancyRes.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name).trim(),
    shortName: shortBuildingName(String(row.name)),
  }));

  const collectionByBuilding = new Map<string, number>();
  for (const row of collectionRes.rows) {
    if (row.building_id) collectionByBuilding.set(String(row.building_id), num(row.total));
  }
  const priorCollection = num(priorCollectionRes.rows[0]?.total);
  const utilityBulk = utilityExpenseRes.rows.reduce((s, row) => s + num(row.amount), 0);
  // Company utility invoices already live in `expenses`; only add unmetered building-level bills
  const expensesTotal = num(expensesTotalRes.rows[0]?.total) + utilityBulk;

  const expenseMap = new Map<string, number>();
  for (const row of expensesByCatRes.rows) {
    const key = String(row.category || 'other');
    expenseMap.set(key, num(row.amount));
  }
  for (const row of utilityExpenseRes.rows) {
    const key = String(row.category);
    expenseMap.set(key, (expenseMap.get(key) || 0) + num(row.amount));
  }
  const expenses: ExpenseCategoryRow[] = [...expenseMap.entries()]
    .map(([key, value]) => ({
      key,
      label: key === 'electricity' ? 'Utilities — electricity' : key === 'water' ? 'Utilities — water' : formatReportCategoryLabel(key),
      value,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const wf = waterfallRes.rows[0] || {};
  const wfCollection = num(wf.collection);
  const cashAllowance = num(wf.cash_allowance);
  const cheque = num(wf.cheque);
  // Excel apartment records:
  // Collection − Expenses = subtotal
  // − Cash allowance (Ima) = Cash for deposit
  // + Cheque (hardware) = Grand Total
  const afterExpenses = num(wfCollection - expensesTotal);
  const cashForDeposit = num(afterExpenses - cashAllowance);
  const grandTotal = num(cashForDeposit + cheque);

  const waterfall: WaterfallStep[] = [
    { label: 'Total collection', value: wfCollection, sign: '+' },
    { label: 'Less expenses', value: -expensesTotal, sign: '-' },
  ];
  if (cashAllowance !== 0) {
    waterfall.push({ label: 'Ima cash allowance', value: -cashAllowance, sign: '-' });
  }
  if (cheque !== 0) {
    waterfall.push({ label: 'Hardware / cheque', value: cheque, sign: '+' });
  }

  const rentRollAll: RentRollRow[] = rentRollRes.rows.map((row) => {
    const derived = deriveStatus({
      room_status: String(row.room_status || ''),
      assignment_status: row.assignment_status ? String(row.assignment_status) : null,
      start_date: row.start_date,
      end_date: row.end_date,
      balance_due: num(row.balance_due),
      days_past_due: parseInt(String(row.days_past_due || 0), 10),
      days_until_due: row.days_until_due == null ? null : parseInt(String(row.days_until_due), 10),
      paid_date: row.paid_date,
      due_date: row.due_date,
      startDate,
      endDate,
    });
    const paidAmount = num(row.paid_amount);
    return {
      roomId: String(row.room_id),
      unit: unitLabel(String(row.room_number || '')),
      buildingId: String(row.building_id),
      buildingName: String(row.building_name),
      shortName: shortBuildingName(String(row.building_name)),
      status: derived.status,
      due: formatDay(row.due_date),
      paidDate: formatDay(row.paid_date),
      amount: paidAmount !== 0 ? paidAmount : derived.status === 'vacant' ? 0 : num(row.monthly_rate),
      daysLate: derived.daysLate,
      elec: row.elec_amount == null ? null : num(row.elec_amount),
      water: row.water_amount == null ? null : num(row.water_amount),
      href: `/admin/rooms/${row.room_id}`,
    };
  });

  const rentRoll = buildingId
    ? rentRollAll.filter((row) => row.buildingId === buildingId)
    : rentRollAll;

  const lateByBuilding = new Map<string, { late: number; trackable: number; days: number[] }>();
  for (const row of rentRollAll) {
    const stats = lateByBuilding.get(row.buildingId) || { late: 0, trackable: 0, days: [] };
    if (row.status === 'vacant' || row.status === 'moveOut') {
      lateByBuilding.set(row.buildingId, stats);
      continue;
    }
    stats.trackable += 1;
    if (row.status === 'late' || row.status === 'atRisk') {
      stats.late += 1;
      if (row.daysLate && row.daysLate > 0) stats.days.push(row.daysLate);
    }
    lateByBuilding.set(row.buildingId, stats);
  }

  const scopedOccupancy = occupancyRes.rows.filter(
    (row) => !buildingId || String(row.id) === buildingId
  );
  const occupied = scopedOccupancy.reduce((s, r) => s + Number(r.occupied || 0), 0);
  const totalUnits = scopedOccupancy.reduce((s, r) => s + Number(r.total || 0), 0);
  const lateUnits = rentRoll.filter((r) => r.status === 'late' || r.status === 'atRisk').length;
  const trackableUnits = rentRoll.filter(
    (r) => r.status !== 'vacant' && r.status !== 'moveOut'
  ).length;

  const properties: PropertyCardData[] = occupancyRes.rows.map((row) => {
    const id = String(row.id);
    const late = lateByBuilding.get(id) || { late: 0, trackable: 0, days: [] };
    const avgDaysLate =
      late.days.length > 0
        ? Math.round((late.days.reduce((s, d) => s + d, 0) / late.days.length) * 10) / 10
        : 0;
    return {
      buildingId: id,
      name: String(row.name).trim(),
      shortName: shortBuildingName(String(row.name)),
      occupied: Number(row.occupied || 0),
      vacant: Number(row.total || 0) - Number(row.occupied || 0),
      totalUnits: Number(row.total || 0),
      collection: collectionByBuilding.get(id) || 0,
      lateRate: late.trackable > 0 ? Math.round((late.late / late.trackable) * 100) : 0,
      avgDaysLate,
    };
  });

  const utilityRecovery: UtilityRecoveryRow[] = recoveryRes.rows.map((row) => {
    const billed = num(row.billed);
    const recovered = num(row.recovered);
    return {
      buildingId: String(row.building_id),
      prop: shortBuildingName(String(row.building_name)),
      type: row.util_type === 'Water' ? 'Water' : 'Electric',
      billed,
      recovered,
      pct: billed > 0 ? Math.round((recovered / billed) * 100) : 0,
    };
  });

  const alerts: LedgerAlert[] = [];
  for (const row of rentRoll) {
    if (row.status === 'atRisk') {
      alerts.push({
        id: `risk-${row.roomId}`,
        text: `${row.shortName} ${row.unit} — at risk${row.daysLate ? ` (${row.daysLate}d late)` : ''}`,
        href: row.href,
      });
    } else if (row.status === 'late' && (row.daysLate || 0) >= 7) {
      alerts.push({
        id: `late-${row.roomId}`,
        text: `${row.shortName} ${row.unit} — paid ${row.daysLate} days late this cycle`,
        href: row.href,
      });
    }
  }
  for (const u of utilityRecovery) {
    if (u.billed > 0 && u.pct < 90) {
      alerts.push({
        id: `util-${u.buildingId}-${u.type}`,
        text: `${u.prop} ${u.type.toLowerCase()} recovery at ${u.pct}%, lowest in view`,
        href: '/admin/bills-expenses/utility-bills',
      });
    }
  }

  const earliest = isoDate(earliestRes.rows[0]?.min_date);

  return {
    startDate,
    endDate,
    monthKey: selectedMonthKey,
    periodLabel,
    availableMonths: monthOptions(earliest, current.monthKey),
    buildingId,
    buildings,
    kpis: {
      collection: wfCollection,
      priorCollection,
      expenses: expensesTotal,
      netIncome: num(wfCollection - expensesTotal),
      occupied,
      totalUnits,
      occupancyRate: totalUnits > 0 ? Math.round((occupied / totalUnits) * 1000) / 10 : 0,
      lateUnits,
      trackableUnits,
      lateRate: trackableUnits > 0 ? Math.round((lateUnits / trackableUnits) * 100) : 0,
    },
    waterfall,
    grandTotal,
    properties,
    rentRoll,
    expenses,
    utilityRecovery,
    alerts: alerts.slice(0, 6),
  };
}
