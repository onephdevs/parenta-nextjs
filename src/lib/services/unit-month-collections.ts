/**
 * Unit × month collections matrix — spreadsheet-style desk for Alfonso ops.
 * One row per revenue unit; columns per calendar month in range.
 */

import pool from '@/lib/db';
import { ROOM_IS_REVENUE } from '@/lib/sql/revenue-unit-filter';

export type CollectionCellStatus =
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'vacant'
  | 'none';

export interface UnitMonthCell {
  monthKey: string; // YYYY-MM
  status: CollectionCellStatus;
  billed: number;
  paid: number;
  balance: number;
  invoiceId: string | null;
  tenantId: string | null;
  tenantName: string | null;
  usingDeposit: boolean;
}

export interface UnitMonthRow {
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  monthlyRate: number;
  roomStatus: string;
  cells: UnitMonthCell[];
}

export interface UnitMonthCollectionsData {
  startMonth: string;
  endMonth: string;
  monthKeys: string[];
  rows: UnitMonthRow[];
  totalsByMonth: Array<{
    monthKey: string;
    billed: number;
    paid: number;
    balance: number;
  }>;
}

function monthKeysInclusive(startMonth: string, endMonth: string): string[] {
  const keys: string[] = [];
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (keys.length > 36) break; // safety
  }
  return keys;
}

function normalizeMonth(input: string): string {
  if (/^\d{4}-\d{2}$/.test(input)) return input;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input.slice(0, 7);
  throw new Error('Month must be YYYY-MM');
}

export async function generateUnitMonthCollections(params: {
  startMonth: string;
  endMonth: string;
  buildingId?: string | null;
}): Promise<UnitMonthCollectionsData> {
  const startMonth = normalizeMonth(params.startMonth);
  const endMonth = normalizeMonth(params.endMonth);
  if (startMonth > endMonth) {
    throw new Error('startMonth must be on or before endMonth');
  }

  const monthKeys = monthKeysInclusive(startMonth, endMonth);
  const rangeStart = `${startMonth}-01`;
  const [ey, em] = endMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(ey, em, 0)).getUTCDate();
  const rangeEnd = `${endMonth}-${String(lastDay).padStart(2, '0')}`;

  const buildingFilter = params.buildingId ? 'AND r.building_id = $1' : '';
  const roomParams: unknown[] = params.buildingId ? [params.buildingId] : [];

  const roomsResult = await pool.query(
    `
    SELECT
      r.id AS room_id,
      r.room_number,
      r.monthly_rate,
      r.room_status,
      b.id AS building_id,
      b.name AS building_name
    FROM rooms r
    JOIN buildings b ON b.id = r.building_id AND COALESCE(b.is_active, true) = true
    WHERE COALESCE(r.is_active, true) = true
      AND ${ROOM_IS_REVENUE}
      ${buildingFilter}
    ORDER BY b.name, r.room_number
    `,
    roomParams
  );

  // Invoices overlapping the month range, tied to room via active/ overlapping assignment
  const invoicesResult = await pool.query(
    `
    SELECT
      i.id AS invoice_id,
      i.tenant_id,
      t.first_name || ' ' || t.last_name AS tenant_name,
      i.total_amount,
      i.amount_paid,
      GREATEST(
        0,
        COALESCE(i.total_amount, 0) - COALESCE(i.amount_paid, 0)
      ) AS balance_due,
      LOWER(COALESCE(i.invoice_status, i.bill_status, 'unpaid')) AS status,
      COALESCE(i.billing_period_start, i.due_date, i.issue_date)::date AS period_start,
      COALESCE(
        i.billing_period_end,
        (date_trunc('month', COALESCE(i.billing_period_start, i.due_date, i.issue_date))
          + interval '1 month' - interval '1 day')::date
      ) AS period_end,
      tra.room_id,
      EXISTS (
        SELECT 1 FROM deposit_ledger dl
        WHERE dl.applied_to_invoice_id = i.id
          AND dl.transaction_type = 'applied'
      ) AS using_deposit
    FROM invoices i
    JOIN tenants t ON t.id = i.tenant_id
    JOIN LATERAL (
      SELECT tra.room_id
      FROM tenant_room_assignments tra
      JOIN rooms r ON r.id = tra.room_id
      WHERE tra.tenant_id = i.tenant_id
        AND ${ROOM_IS_REVENUE}
        AND tra.start_date <= COALESCE(i.billing_period_end, i.due_date, CURRENT_DATE)
        AND (tra.end_date IS NULL OR tra.end_date >= COALESCE(i.billing_period_start, i.issue_date, tra.start_date))
      ORDER BY
        CASE WHEN tra.assignment_status = 'active' THEN 0 ELSE 1 END,
        tra.start_date DESC
      LIMIT 1
    ) tra ON true
    WHERE COALESCE(i.billing_period_start, i.due_date, i.issue_date) <= $2::date
      AND COALESCE(
        i.billing_period_end,
        (date_trunc('month', COALESCE(i.billing_period_start, i.due_date, i.issue_date))
          + interval '1 month' - interval '1 day')::date
      ) >= $1::date
      AND COALESCE(i.invoice_status, '') IS DISTINCT FROM 'cancelled'
      AND COALESCE(i.bill_status, '') IS DISTINCT FROM 'cancelled'
    `,
    [rangeStart, rangeEnd]
  );

  type Inv = {
    invoice_id: string;
    tenant_id: string;
    tenant_name: string;
    total_amount: string;
    amount_paid: string;
    balance_due: string;
    status: string;
    period_start: string;
    period_end: string;
    room_id: string;
    using_deposit: boolean;
  };

  const invoicesByRoom = new Map<string, Inv[]>();
  for (const row of invoicesResult.rows as Inv[]) {
    const list = invoicesByRoom.get(row.room_id) || [];
    list.push(row);
    invoicesByRoom.set(row.room_id, list);
  }

  const rows: UnitMonthRow[] = roomsResult.rows.map((room) => {
    const roomInvoices = invoicesByRoom.get(room.room_id) || [];
    const cells: UnitMonthCell[] = monthKeys.map((monthKey) => {
      const monthStart = `${monthKey}-01`;
      const [y, m] = monthKey.split('-').map(Number);
      const monthEndDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const monthEnd = `${monthKey}-${String(monthEndDay).padStart(2, '0')}`;

      const overlapping = roomInvoices.filter((inv) => {
        const ps = String(inv.period_start).slice(0, 10);
        const pe = String(inv.period_end).slice(0, 10);
        return ps <= monthEnd && pe >= monthStart;
      });

      if (overlapping.length === 0) {
        const vacant =
          String(room.room_status || '').toLowerCase() === 'vacant';
        return {
          monthKey,
          status: vacant ? 'vacant' : 'none',
          billed: 0,
          paid: 0,
          balance: 0,
          invoiceId: null,
          tenantId: null,
          tenantName: null,
          usingDeposit: false,
        };
      }

      const billed = overlapping.reduce(
        (s, inv) => s + parseFloat(String(inv.total_amount || 0)),
        0
      );
      const paid = overlapping.reduce(
        (s, inv) => s + parseFloat(String(inv.amount_paid || 0)),
        0
      );
      const balance = Math.max(0, billed - paid);
      const usingDeposit = overlapping.some((inv) => inv.using_deposit);
      const primary = overlapping[0];

      let status: CollectionCellStatus = 'unpaid';
      if (balance <= 0.009) status = 'paid';
      else if (paid > 0) status = 'partial';

      return {
        monthKey,
        status,
        billed,
        paid,
        balance,
        invoiceId: primary.invoice_id,
        tenantId: primary.tenant_id,
        tenantName: primary.tenant_name,
        usingDeposit,
      };
    });

    return {
      roomId: room.room_id,
      roomNumber: room.room_number,
      buildingId: room.building_id,
      buildingName: room.building_name,
      monthlyRate: parseFloat(String(room.monthly_rate || 0)),
      roomStatus: room.room_status,
      cells,
    };
  });

  const totalsByMonth = monthKeys.map((monthKey) => {
    let billed = 0;
    let paid = 0;
    let balance = 0;
    for (const row of rows) {
      const cell = row.cells.find((c) => c.monthKey === monthKey);
      if (!cell) continue;
      billed += cell.billed;
      paid += cell.paid;
      balance += cell.balance;
    }
    return { monthKey, billed, paid, balance };
  });

  return {
    startMonth,
    endMonth,
    monthKeys,
    rows,
    totalsByMonth,
  };
}
