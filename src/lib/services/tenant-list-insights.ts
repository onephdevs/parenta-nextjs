/**
 * Per-tenant signals for the admin tenants work-item list.
 */

import pool from '@/lib/db';
import { EFFECTIVE_DUE_SQL } from '@/lib/billing/invoice-due';

export interface TenantListInsights {
  balance: number;
  pastDueAmount: number;
  daysPastDue: number;
  daysUntilDue: number | null;
  nextDueDate: string | null;
  hasOpenRent: boolean;
  hasOpenBills: boolean;
  hasUnpaidWater: boolean;
  hasUnpaidElectricity: boolean;
  openMaintenanceCount: number;
  hasUrgentMaintenance: boolean;
  isNew: boolean;
  /** Tenant submitted payment proof awaiting admin verification */
  hasPaymentConfirmation: boolean;
  /** Open invoice with some amount already paid */
  hasPartialPayment: boolean;
  /** Onboarding lease awaiting signature */
  hasUnsignedLease: boolean;
}

const EMPTY: TenantListInsights = {
  balance: 0,
  pastDueAmount: 0,
  daysPastDue: 0,
  daysUntilDue: null,
  nextDueDate: null,
  hasOpenRent: false,
  hasOpenBills: false,
  hasUnpaidWater: false,
  hasUnpaidElectricity: false,
  openMaintenanceCount: 0,
  hasUrgentMaintenance: false,
  isNew: false,
  hasPaymentConfirmation: false,
  hasPartialPayment: false,
  hasUnsignedLease: false,
};

const OPEN_INVOICE = `
  i.invoice_status IN ('sent', 'partial', 'overdue')
  AND i.balance_due > 0
  AND COALESCE(i.bill_status, 'UNPAID') <> 'PAID'
`;

function num(v: unknown): number {
  return Number(v) || 0;
}

function intOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function isoDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export async function getTenantListInsights(
  tenantIds: string[]
): Promise<Record<string, TenantListInsights>> {
  const map: Record<string, TenantListInsights> = {};
  if (tenantIds.length === 0) return map;

  for (const id of tenantIds) {
    map[id] = { ...EMPTY };
  }

  const [
    invoiceResult,
    utilityResult,
    maintenanceResult,
    newResult,
    pendingPaymentResult,
    unsignedLeaseResult,
  ] = await Promise.all([
    pool.query(
      `
        SELECT
          i.tenant_id,
          COALESCE(SUM(i.balance_due), 0) AS balance,
          COALESCE(
            SUM(
              CASE
                WHEN ${EFFECTIVE_DUE_SQL} < CURRENT_DATE THEN i.balance_due
                ELSE 0
              END
            ),
            0
          ) AS past_due_amount,
          COALESCE(
            MAX(
              CASE
                WHEN ${EFFECTIVE_DUE_SQL} < CURRENT_DATE
                THEN (CURRENT_DATE - ${EFFECTIVE_DUE_SQL}::date)
                ELSE 0
              END
            ),
            0
          ) AS days_past_due,
          MIN(
            CASE
              WHEN ${EFFECTIVE_DUE_SQL} >= CURRENT_DATE
              THEN (${EFFECTIVE_DUE_SQL}::date - CURRENT_DATE)
              ELSE NULL
            END
          ) AS days_until_due,
          MIN(${EFFECTIVE_DUE_SQL}::date) AS next_due_date,
          BOOL_OR(
            EXISTS (
              SELECT 1 FROM invoice_line_items ili
              WHERE ili.invoice_id = i.id AND ili.item_type = 'rent'
            )
          ) AS has_open_rent,
          BOOL_OR(
            EXISTS (
              SELECT 1 FROM invoice_line_items ili
              WHERE ili.invoice_id = i.id
                AND ili.item_type IN ('utilities', 'fees', 'other', 'deposit')
            )
          ) AS has_open_bills,
          BOOL_OR(
            i.invoice_status = 'partial'
            OR COALESCE(i.amount_paid, 0) > 0
          ) AS has_partial_payment
        FROM invoices i
        WHERE i.tenant_id = ANY($1::uuid[])
          AND ${OPEN_INVOICE}
        GROUP BY i.tenant_id
        `,
      [tenantIds]
    ),
    pool.query(
      `
        SELECT
          tub.tenant_id,
          BOOL_OR(LOWER(COALESCE(tub.utility_type, '')) = 'water') AS has_water,
          BOOL_OR(
            LOWER(COALESCE(tub.utility_type, '')) IN ('electric', 'electricity')
          ) AS has_electricity
        FROM tenant_utility_bills tub
        WHERE tub.tenant_id = ANY($1::uuid[])
          AND tub.bill_status IN ('pending', 'sent', 'overdue')
        GROUP BY tub.tenant_id
        `,
      [tenantIds]
    ),
    pool.query(
      `
        SELECT
          mr.tenant_id,
          COUNT(*)::int AS open_count,
          BOOL_OR(mr.priority IN ('urgent', 'high')) AS has_urgent
        FROM maintenance_requests mr
        WHERE mr.tenant_id = ANY($1::uuid[])
          AND mr.status IN ('open', 'in_progress')
        GROUP BY mr.tenant_id
        `,
      [tenantIds]
    ),
    pool.query(
      `
        SELECT t.id
        FROM tenants t
        WHERE t.id = ANY($1::uuid[])
          AND (
            (t.move_in_date IS NOT NULL AND t.move_in_date::date >= CURRENT_DATE - 30)
            OR (t.created_at::date >= CURRENT_DATE - 30)
          )
        `,
      [tenantIds]
    ),
    pool.query(
      `
        SELECT DISTINCT p.tenant_id
        FROM payments p
        WHERE p.tenant_id = ANY($1::uuid[])
          AND p.payment_status = 'pending'
        `,
      [tenantIds]
    ),
    pool
      .query(
        `
          SELECT DISTINCT c.tenant_id
          FROM pipeline_cards c
          WHERE c.tenant_id = ANY($1::uuid[])
            AND c.card_status = 'open'
            AND COALESCE(c.lease_status, '') = 'awaiting_signature'
          `,
        [tenantIds]
      )
      .catch(() => ({ rows: [] as Record<string, unknown>[] })),
  ]);

  const unsignedRows = unsignedLeaseResult.rows;

  for (const row of invoiceResult.rows) {
    const id = String(row.tenant_id);
    const current = map[id] || { ...EMPTY };
    const balance = num(row.balance);
    const hasRent = Boolean(row.has_open_rent);
    const hasBills = Boolean(row.has_open_bills);
    map[id] = {
      ...current,
      balance,
      pastDueAmount: num(row.past_due_amount),
      daysPastDue: Math.max(0, Math.floor(num(row.days_past_due))),
      daysUntilDue: intOrNull(row.days_until_due),
      nextDueDate: isoDate(row.next_due_date),
      hasOpenRent: hasRent || (balance > 0 && !hasBills),
      hasOpenBills: hasBills,
      hasPartialPayment: Boolean(row.has_partial_payment),
    };
  }

  for (const row of utilityResult.rows) {
    const id = String(row.tenant_id);
    const current = map[id] || { ...EMPTY };
    map[id] = {
      ...current,
      hasUnpaidWater: Boolean(row.has_water),
      hasUnpaidElectricity: Boolean(row.has_electricity),
    };
  }

  for (const row of maintenanceResult.rows) {
    const id = String(row.tenant_id);
    const current = map[id] || { ...EMPTY };
    map[id] = {
      ...current,
      openMaintenanceCount: Math.max(0, Math.floor(num(row.open_count))),
      hasUrgentMaintenance: Boolean(row.has_urgent),
    };
  }

  for (const row of newResult.rows) {
    const id = String(row.id);
    const current = map[id] || { ...EMPTY };
    map[id] = { ...current, isNew: true };
  }

  for (const row of pendingPaymentResult.rows) {
    const id = String(row.tenant_id);
    const current = map[id] || { ...EMPTY };
    map[id] = { ...current, hasPaymentConfirmation: true };
  }

  for (const row of unsignedRows) {
    const id = String(row.tenant_id);
    if (!id || id === 'undefined' || id === 'null') continue;
    const current = map[id] || { ...EMPTY };
    map[id] = { ...current, hasUnsignedLease: true };
  }

  return map;
}
