/**
 * Building-level apartment records — Excel-style unit ledger, expenses, and summary
 * for the 16th–15th billing cycle.
 */

import pool from '@/lib/db';
import { formatReportCategoryLabel } from '@/lib/constants/bills-expenses';
import { PAYMENT_IS_REVENUE_UNIT } from '@/lib/sql/revenue-unit-filter';
import {
  manilaMonthRange,
  rangeFromMonthKey,
} from '@/lib/services/portfolio-ledger-service';
import type {
  ApartmentBuilding,
  ApartmentBuildingSheet,
  ApartmentExpenseItem,
  ApartmentLedgerLine,
  ApartmentPayStatus,
  ApartmentRecordsData,
  ApartmentUnitBlock,
} from '@/lib/apartment-records-types';

const PAID = `p.payment_status IN ('paid', 'completed', 'confirmed')`;
const OPERATING_EXPENSE = `COALESCE(e.category, 'other') NOT IN ('cash_allowance', 'owner_draw')`;
const CASH_ALLOWANCE_EXPENSE = `COALESCE(e.category, 'other') IN ('cash_allowance', 'owner_draw')`;
const COLLECTION_PAYMENT = `
  ${PAID}
  AND LOWER(COALESCE(p.payment_method, 'cash')) NOT IN ('cheque', 'check')
  AND ${PAYMENT_IS_REVENUE_UNIT}
`;
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

function num(v: unknown): number {
  return Math.round((Number(v) || 0) * 100) / 100;
}

function isoDate(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function excelDay(value: unknown): string | null {
  const iso = isoDate(value);
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.toLocaleDateString('en-GB', { day: '2-digit', timeZone: 'UTC' });
  const month = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  const year = d.toLocaleDateString('en-GB', { year: '2-digit', timeZone: 'UTC' });
  return `${day}-${month}-${year}`;
}

function periodShortLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const startText = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const endText = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return `${startText} to ${endText}`;
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
  return n;
}

function isPaidStatus(status: unknown): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'paid' || s === 'completed' || s === 'confirmed';
}

function notesOf(value: unknown): string {
  return String(value || '').toLowerCase();
}

function monthOptions(fromIso: string | null, toKey: string) {
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
    const range = rangeFromMonthKey(`${y}-${String(m).padStart(2, '0')}`);
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

interface RoomRow {
  room_id: string;
  room_number: string;
  room_status: string;
  monthly_rate: unknown;
  building_id: string;
  building_name: string;
  start_date: unknown;
  end_date: unknown;
  assignment_status: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  due_date: unknown;
}

interface PaymentRow {
  room_id: string | null;
  tenant_id: string | null;
  payment_type: string;
  amount: unknown;
  payment_date: unknown;
  due_date: unknown;
  payment_status: string;
  notes: string | null;
  payment_method: string | null;
}

interface UtilityRow {
  room_id: string;
  utility_type: string;
  amount: unknown;
  bill_status: string;
  due_date: unknown;
}

function pushLine(lines: ApartmentLedgerLine[], line: ApartmentLedgerLine) {
  lines.push(line);
}

function classifyUtilityPayment(row: PaymentRow, electricAmount: number | null, waterAmount: number | null) {
  const notes = notesOf(row.notes);
  if (/electric/.test(notes)) return 'electric' as const;
  if (/water/.test(notes)) return 'water' as const;
  const amount = num(row.amount);
  if (electricAmount != null && Math.abs(amount - electricAmount) < 0.01) return 'electric' as const;
  if (waterAmount != null && Math.abs(amount - waterAmount) < 0.01) return 'water' as const;
  return 'utility' as const;
}

function buildUnit(params: {
  room: RoomRow;
  payments: PaymentRow[];
  electric: UtilityRow | null;
  water: UtilityRow | null;
  startDate: string;
  endDate: string;
}): ApartmentUnitBlock {
  const { room, payments, electric, water, startDate, endDate } = params;
  const assignment = String(room.assignment_status || '').toLowerCase();
  const roomStatus = String(room.room_status || '').toLowerCase();
  const startIso = isoDate(room.start_date);
  const vacant =
    roomStatus === 'vacant' ||
    !assignment ||
    assignment !== 'active' ||
    !room.tenant_id;
  const newByMoveIn = Boolean(startIso && startIso >= startDate && startIso <= endDate);

  const paidPayments = payments.filter((p) => isPaidStatus(p.payment_status));
  const rentPaid = paidPayments
    .filter((p) => String(p.payment_type).toLowerCase() === 'rent')
    .reduce((s, p) => s + num(p.amount), 0);
  const rentRow = paidPayments.find((p) => String(p.payment_type).toLowerCase() === 'rent');
  const advancePaid = paidPayments
    .filter((p) => {
      const type = String(p.payment_type).toLowerCase();
      return type === 'advance' || type === 'downpayment' || /advance/.test(notesOf(p.notes));
    })
    .reduce((s, p) => s + num(p.amount), 0);
  const advanceRow = paidPayments.find((p) => {
    const type = String(p.payment_type).toLowerCase();
    return type === 'advance' || type === 'downpayment' || /advance/.test(notesOf(p.notes));
  });
  const depositRows = paidPayments.filter((p) => String(p.payment_type).toLowerCase() === 'deposit');
  const utilityDepositRow = depositRows.find((p) => /utility deposit/.test(notesOf(p.notes)));
  const securityDepositRow = depositRows.find((p) => !/utility deposit/.test(notesOf(p.notes)));
  const depositPaid = securityDepositRow ? num(securityDepositRow.amount) : 0;
  const utilityDepositPaid = utilityDepositRow ? num(utilityDepositRow.amount) : 0;

  const isNewTenant = !vacant && (newByMoveIn || advancePaid > 0);
  const monthlyRate = num(room.monthly_rate);
  const electricAmount = electric ? num(electric.amount) : null;
  const waterAmount = water ? num(water.amount) : null;
  const utilityPays = payments.filter((p) => String(p.payment_type).toLowerCase() === 'utility');
  const electricPay = utilityPays.find((p) => classifyUtilityPayment(p, electricAmount, waterAmount) === 'electric');
  const waterPay = utilityPays.find((p) => classifyUtilityPayment(p, electricAmount, waterAmount) === 'water');
  const electricPaid = Boolean(electric && isPaidStatus(electric.bill_status));
  const waterPaid = Boolean(water && isPaidStatus(water.bill_status));

  let payStatus: ApartmentPayStatus;
  if (vacant) payStatus = 'vacant';
  else if (isNewTenant) payStatus = 'newTenant';
  else if (rentPaid <= 0 && advancePaid <= 0) payStatus = 'unpaid';
  else if (monthlyRate > 0 && rentPaid > 0 && rentPaid + 0.01 < monthlyRate) payStatus = 'partial';
  else payStatus = 'paid';

  const lines: ApartmentLedgerLine[] = [];
  const tenantName = room.tenant_name?.trim() || null;

  if (vacant) {
    pushLine(lines, {
      kind: 'vacant',
      label: 'VACANT',
      amountPaid: null,
      datePaid: null,
      electric: null,
      water: null,
      unpaid: false,
    });
  } else if (isNewTenant) {
    pushLine(lines, {
      kind: 'newTenant',
      label: 'New Tenant',
      amountPaid: null,
      datePaid: null,
      electric: null,
      water: null,
      unpaid: false,
    });
    if (advancePaid > 0) {
      pushLine(lines, {
        kind: 'advance',
        label: '1month Advance',
        amountPaid: advancePaid,
        datePaid: excelDay(advanceRow?.payment_date),
        electric: null,
        water: null,
        unpaid: false,
      });
    }
    if (depositPaid > 0) {
      pushLine(lines, {
        kind: 'deposit',
        label: '1months Deposit',
        amountPaid: depositPaid,
        datePaid: excelDay(securityDepositRow?.payment_date),
        electric: null,
        water: null,
        unpaid: false,
      });
    }
    if (utilityDepositPaid > 0) {
      pushLine(lines, {
        kind: 'utilityDeposit',
        label: 'Utility Deposit',
        amountPaid: utilityDepositPaid,
        datePaid: excelDay(utilityDepositRow?.payment_date),
        electric: null,
        water: null,
        unpaid: false,
      });
    }
  } else {
    const dueLabel = excelDay(rentRow?.due_date || room.due_date);
    pushLine(lines, {
      kind: 'rent',
      label: dueLabel || (payStatus === 'unpaid' ? 'Unpaid' : 'Rent'),
      amountPaid: rentPaid > 0 ? rentPaid : null,
      datePaid: excelDay(rentRow?.payment_date),
      electric: null,
      water: null,
      unpaid: rentPaid <= 0,
    });
  }

  if (electricAmount != null) {
    pushLine(lines, {
      kind: 'electric',
      label: 'Electric Bill',
      amountPaid: electricPaid ? electricAmount : null,
      datePaid: electricPaid ? excelDay(electricPay?.payment_date || rentRow?.payment_date || advanceRow?.payment_date) : null,
      electric: electricAmount,
      water: null,
      unpaid: !electricPaid,
    });
  }

  if (waterAmount != null) {
    pushLine(lines, {
      kind: 'water',
      label: 'Water Bill',
      amountPaid: waterPaid ? waterAmount : null,
      datePaid: waterPaid ? excelDay(waterPay?.payment_date || rentRow?.payment_date || advanceRow?.payment_date) : null,
      electric: null,
      water: waterAmount,
      unpaid: !waterPaid,
    });
  }

  return {
    roomId: room.room_id,
    unit: unitLabel(room.room_number),
    tenantName,
    tenantId: room.tenant_id,
    href: room.tenant_id ? `/admin/tenants/${room.tenant_id}` : `/admin/rooms/${room.room_id}`,
    payStatus,
    monthlyRate,
    lines: lines.length > 0 ? lines : [
      {
        kind: 'rent',
        label: '—',
        amountPaid: null,
        datePaid: null,
        electric: electricAmount,
        water: waterAmount,
        unpaid: false,
      },
    ],
  };
}

export async function getApartmentRecords(params: {
  month?: string;
  buildingId?: string | null;
}): Promise<ApartmentRecordsData> {
  const current = manilaMonthRange();
  const range = params.month ? rangeFromMonthKey(params.month) : current;
  const startDate = range.startDate;
  const endDate = range.endDate;
  const buildingId = params.buildingId || null;
  const base = [startDate, endDate, buildingId] as unknown[];

  const [buildingsRes, roomsRes, paymentsRes, utilitiesRes, expensesRes, waterfallRes, collectionByBldgRes, earliestRes] =
    await Promise.all([
      pool.query(
        `
        SELECT DISTINCT b.id, b.name
        FROM buildings b
        JOIN rooms r ON r.building_id = b.id AND COALESCE(r.is_active, true)
        WHERE COALESCE(b.is_active, true)
        ORDER BY b.name
        `
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
          NULLIF(TRIM(CONCAT(COALESCE(t.first_name, ''), ' ', COALESCE(t.last_name, ''))), '') AS tenant_name,
          inv.due_date
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
              MIN(i.due_date) FILTER (
                WHERE i.invoice_status IN ('sent', 'partial', 'overdue') AND i.balance_due > 0
              ),
              MIN(i.due_date) FILTER (
                WHERE i.invoice_status NOT IN ('draft', 'cancelled')
                  AND COALESCE(i.billing_period_start, i.due_date) <= $2::date
                  AND COALESCE(i.billing_period_end, i.due_date) >= $1::date
              )
            ) AS due_date
          FROM invoices i
          WHERE i.tenant_id = t.id
        ) inv ON true
        WHERE COALESCE(r.is_active, true)
          AND COALESCE(b.is_active, true)
          AND (
            COALESCE(r.is_revenue_unit, true) = true
            OR LOWER(TRIM(r.room_number)) = 'admin'
          )
          AND r.room_number !~* '^MO-'
          AND ($3::uuid IS NULL OR b.id = $3)
        ORDER BY b.name, NULLIF(regexp_replace(r.room_number, '\\D', '', 'g'), '')::int NULLS LAST, r.room_number
        `,
        base
      ),
      pool.query(
        `
        SELECT
          COALESCE(p.room_id, tra.room_id) AS room_id,
          p.tenant_id,
          p.payment_type,
          p.amount,
          p.payment_date,
          p.due_date,
          p.payment_status,
          p.notes,
          p.payment_method
        FROM payments p
        LEFT JOIN LATERAL (
          SELECT ptra.room_id
          FROM tenant_room_assignments ptra
          WHERE ptra.tenant_id = p.tenant_id
          ORDER BY CASE WHEN ptra.assignment_status = 'active' THEN 0 ELSE 1 END, ptra.start_date DESC
          LIMIT 1
        ) tra ON p.room_id IS NULL
        WHERE p.payment_date BETWEEN $1::date AND $2::date
          ${PAYMENT_BUILDING}
        `,
        base
      ),
      pool.query(
        `
        SELECT
          ub.room_id,
          ub.utility_type,
          ub.amount,
          ub.bill_status,
          ub.due_date
        FROM utility_bills ub
        LEFT JOIN rooms r ON r.id = ub.room_id
        WHERE ub.parent_bill_id IS NULL
          AND ub.room_id IS NOT NULL
          AND LOWER(COALESCE(ub.utility_type, '')) IN ('electric', 'electricity', 'water')
          AND ub.billing_period_start <= $2::date
          AND ub.billing_period_end >= $1::date
          AND COALESCE(ub.bill_status, 'pending') IS DISTINCT FROM 'cancelled'
          AND ($3::uuid IS NULL OR COALESCE(ub.building_id, r.building_id) = $3)
        `,
        base
      ),
      pool.query(
        `
        SELECT
          e.id,
          e.expense_date,
          e.description,
          e.amount,
          COALESCE(e.category, 'other') AS category,
          e.building_id,
          b.name AS building_name
        FROM expenses e
        LEFT JOIN buildings b ON b.id = e.building_id
        WHERE e.expense_date BETWEEN $1::date AND $2::date
          AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
          AND ${OPERATING_EXPENSE}
          AND ($3::uuid IS NULL OR e.building_id = $3)
        ORDER BY e.expense_date, e.description
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
              AND ($3::uuid IS NULL OR e.building_id = $3)
          ) AS expenses,
          (
            SELECT COALESCE(SUM(e.amount), 0)
            FROM expenses e
            WHERE e.expense_date BETWEEN $1 AND $2
              AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
              AND ${CASH_ALLOWANCE_EXPENSE}
              AND ($3::uuid IS NULL OR e.building_id = $3)
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
        SELECT LEAST(
          (SELECT MIN(payment_date) FROM payments),
          (SELECT MIN(expense_date) FROM expenses)
        )::date AS min_date
        `
      ),
    ]);

  const rooms = roomsRes.rows as RoomRow[];
  const paymentsByRoom = new Map<string, PaymentRow[]>();
  for (const row of paymentsRes.rows as PaymentRow[]) {
    if (!row.room_id) continue;
    const roomId = String(row.room_id);
    const list = paymentsByRoom.get(roomId) || [];
    list.push(row);
    paymentsByRoom.set(roomId, list);
  }

  const electricByRoom = new Map<string, UtilityRow>();
  const waterByRoom = new Map<string, UtilityRow>();
  for (const row of utilitiesRes.rows as UtilityRow[]) {
    const roomId = String(row.room_id);
    const type = String(row.utility_type || '').toLowerCase();
    if (type === 'electric' || type === 'electricity') electricByRoom.set(roomId, row);
    else if (type === 'water') waterByRoom.set(roomId, row);
  }

  const expenseItems: ApartmentExpenseItem[] = (expensesRes.rows as Array<{
    id: string;
    expense_date: unknown;
    description: string;
    amount: unknown;
    category: string;
    building_id: string | null;
    building_name: string | null;
  }>).map((row) => ({
    id: String(row.id),
    date: excelDay(row.expense_date) || isoDate(row.expense_date) || '',
    description: String(row.description || ''),
    amount: num(row.amount),
    category: String(row.category || 'other'),
    categoryLabel: formatReportCategoryLabel(String(row.category || 'other')),
    buildingId: row.building_id ? String(row.building_id) : null,
    buildingName: row.building_name ? shortBuildingName(String(row.building_name)) : null,
  }));

  const unitsByBuilding = new Map<string, ApartmentUnitBlock[]>();
  for (const room of rooms) {
    const roomId = String(room.room_id);
    const unit = buildUnit({
      room,
      payments: paymentsByRoom.get(roomId) || [],
      electric: electricByRoom.get(roomId) || null,
      water: waterByRoom.get(roomId) || null,
      startDate,
      endDate,
    });
    const buildingIdKey = String(room.building_id);
    const list = unitsByBuilding.get(buildingIdKey) || [];
    list.push(unit);
    unitsByBuilding.set(buildingIdKey, list);
  }

  const collectionByBuilding = new Map<string, number>();
  for (const row of collectionByBldgRes.rows as Array<{ building_id: string | null; total: unknown }>) {
    if (!row.building_id) continue;
    collectionByBuilding.set(String(row.building_id), num(row.total));
  }

  const expensesByBuilding = new Map<string, ApartmentExpenseItem[]>();
  for (const item of expenseItems) {
    const key = item.buildingId || 'unassigned';
    const list = expensesByBuilding.get(key) || [];
    list.push(item);
    expensesByBuilding.set(key, list);
  }

  const buildings: ApartmentBuilding[] = (
    buildingsRes.rows as Array<{ id: string; name: string }>
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name).trim(),
    shortName: shortBuildingName(String(row.name)),
  }));

  const periodShort = periodShortLabel(startDate, endDate);

  const sheets: ApartmentBuildingSheet[] = buildings
    .filter((building) => unitsByBuilding.has(building.id))
    .map((building) => {
    const units = unitsByBuilding.get(building.id) || [];
    const electricTotal = units.reduce((s, u) => {
      return s + u.lines.reduce((ls, line) => ls + (line.electric || 0), 0);
    }, 0);
    const waterTotal = units.reduce((s, u) => {
      return s + u.lines.reduce((ls, line) => ls + (line.water || 0), 0);
    }, 0);
    const sheetExpenses = buildingId
      ? expenseItems
      : [...(expensesByBuilding.get(building.id) || [])];
    return {
      buildingId: building.id,
      name: building.name,
      shortName: building.shortName,
      headerTitle: `${building.name} Rental Fee Dated : ${periodShort}`,
      billsTitle: `Monthly Bills ${building.shortName}`,
      collection: collectionByBuilding.get(building.id) || 0,
      electricTotal: num(electricTotal),
      waterTotal: num(waterTotal),
      paidUnits: units.filter((u) => u.payStatus === 'paid' || u.payStatus === 'partial').length,
      unpaidUnits: units.filter((u) => u.payStatus === 'unpaid').length,
      vacantUnits: units.filter((u) => u.payStatus === 'vacant').length,
      newTenantUnits: units.filter((u) => u.payStatus === 'newTenant').length,
      occupiedUnits: units.filter((u) => u.payStatus !== 'vacant').length,
      totalUnits: units.length,
      units,
      expenses: sheetExpenses,
      expenseTotal: num(sheetExpenses.reduce((s, e) => s + e.amount, 0)),
    };
  });

  const wf = waterfallRes.rows[0] || {};
  const collection = num(wf.collection);
  const expensesTotal = num(wf.expenses);
  const cashAllowance = num(wf.cash_allowance);
  const cheque = num(wf.cheque);
  const electricTotal = num(sheets.reduce((s, sh) => s + sh.electricTotal, 0));
  const waterTotal = num(sheets.reduce((s, sh) => s + sh.waterTotal, 0));

  const paidUnits = sheets.reduce((s, sh) => s + sh.paidUnits, 0);
  const unpaidUnits = sheets.reduce((s, sh) => s + sh.unpaidUnits, 0);
  const vacantUnits = sheets.reduce((s, sh) => s + sh.vacantUnits, 0);
  const newTenantUnits = sheets.reduce((s, sh) => s + sh.newTenantUnits, 0);
  const occupiedUnits = sheets.reduce((s, sh) => s + sh.occupiedUnits, 0);
  const totalUnits = sheets.reduce((s, sh) => s + sh.totalUnits, 0);

  const earliest = isoDate(earliestRes.rows[0]?.min_date);

  return {
    startDate,
    endDate,
    monthKey: range.monthKey,
    periodLabel: range.periodLabel,
    periodShortLabel: periodShort,
    availableMonths: monthOptions(earliest, current.monthKey),
    buildingId,
    buildings,
    expenses: expenseItems,
    summary: {
      collection,
      expenses: expensesTotal,
      cashAllowance,
      cheque,
      netIncome: num(collection - expensesTotal),
      grandTotal: num(collection - expensesTotal - cashAllowance + cheque),
      electricTotal,
      waterTotal,
      paidUnits,
      unpaidUnits,
      vacantUnits,
      newTenantUnits,
      occupiedUnits,
      totalUnits,
    },
    sheets,
  };
}

function normalizeUtilityKind(value: string): 'electricity' | 'water' | null {
  const type = value.toLowerCase();
  if (type === 'electric' || type === 'electricity') return 'electricity';
  if (type === 'water') return 'water';
  return null;
}

export interface ApartmentUtilityUpdate {
  roomId: string;
  electric?: number | null;
  water?: number | null;
  electricStatus?: 'pending' | 'paid';
  waterStatus?: 'pending' | 'paid';
}

export async function bulkUpsertApartmentUtilities(params: {
  startDate: string;
  endDate: string;
  billStatus?: 'pending' | 'paid';
  notes?: string;
  updates: ApartmentUtilityUpdate[];
}): Promise<{ created: number; updated: number }> {
  const { createRoomUtilityBill, updateRoomUtilityBill } = await import(
    '@/lib/api/room-utility-bills'
  );

  const defaultStatus = params.billStatus === 'paid' ? 'paid' : 'pending';
  const updates = params.updates
    .filter((row) => row.roomId)
    .slice(0, 120)
    .map((row) => ({
      roomId: row.roomId,
      types: (
        [
          ['electricity', row.electric, row.electricStatus],
          ['water', row.water, row.waterStatus],
        ] as Array<['electricity' | 'water', number | null | undefined, 'pending' | 'paid' | undefined]>
      )
        .filter((entry): entry is ['electricity' | 'water', number, 'pending' | 'paid' | undefined] => {
          const amount = entry[1];
          return amount != null && Number.isFinite(amount) && amount > 0;
        })
        .map(([kind, amount, status]) => ({
          kind,
          amount,
          status: status === 'paid' ? 'paid' : status === 'pending' ? 'pending' : defaultStatus,
        })),
    }))
    .filter((row) => row.types.length > 0);

  const roomIds = [...new Set(updates.map((row) => row.roomId))];
  if (roomIds.length === 0) {
    throw new Error('Enter an electric or water amount for at least one selected unit');
  }

  const roomsRes = await pool.query(
    `SELECT id
     FROM rooms
     WHERE id = ANY($1::uuid[])
       AND COALESCE(is_active, true)`,
    [roomIds]
  );
  if (roomsRes.rows.length !== roomIds.length) {
    throw new Error('One or more units were not found');
  }

  const existingRes = await pool.query(
    `
    SELECT DISTINCT ON (
      ub.room_id,
      CASE
        WHEN LOWER(COALESCE(ub.utility_type, '')) IN ('electric', 'electricity') THEN 'electricity'
        ELSE 'water'
      END
    )
      ub.id,
      ub.room_id,
      ub.utility_type,
      ub.bill_status
    FROM utility_bills ub
    WHERE ub.room_id = ANY($1::uuid[])
      AND ub.parent_bill_id IS NULL
      AND LOWER(COALESCE(ub.utility_type, '')) IN ('electric', 'electricity', 'water')
      AND ub.billing_period_start <= $3::date
      AND ub.billing_period_end >= $2::date
      AND COALESCE(ub.bill_status, 'pending') IS DISTINCT FROM 'cancelled'
    ORDER BY
      ub.room_id,
      CASE
        WHEN LOWER(COALESCE(ub.utility_type, '')) IN ('electric', 'electricity') THEN 'electricity'
        ELSE 'water'
      END,
      ub.due_date DESC NULLS LAST
    `,
    [roomIds, params.startDate, params.endDate]
  );

  const existingByKey = new Map<string, { id: string; paid: boolean }>();
  for (const row of existingRes.rows as Array<{
    id: string;
    room_id: string;
    utility_type: string;
    bill_status: string;
  }>) {
    const kind = normalizeUtilityKind(String(row.utility_type));
    if (!kind) continue;
    existingByKey.set(`${row.room_id}:${kind}`, {
      id: String(row.id),
      paid: isPaidStatus(row.bill_status),
    });
  }

  let created = 0;
  let updated = 0;

  for (const update of updates) {
    for (const row of update.types) {
      const existing = existingByKey.get(`${update.roomId}:${row.kind}`);
      if (existing?.paid) continue;
      if (existing) {
        await updateRoomUtilityBill(existing.id, {
          amount: row.amount,
          billStatus: row.status,
          billingPeriodStart: params.startDate,
          billingPeriodEnd: params.endDate,
          dueDate: params.endDate,
        });
        updated += 1;
      } else {
        await createRoomUtilityBill({
          roomId: update.roomId,
          utilityType: row.kind,
          amount: row.amount,
          billingPeriodStart: params.startDate,
          billingPeriodEnd: params.endDate,
          dueDate: params.endDate,
          billStatus: row.status,
          allocationMethod: 'SUBMETERED',
          notes: params.notes || '[apartment-records-bulk]',
          distributeAcrossUnits: false,
        });
        created += 1;
      }
    }
  }

  return { created, updated };
}
