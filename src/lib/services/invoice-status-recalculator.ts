/**
 * Invoice Status Recalculation Service
 * Recalculates invoice statuses based on payments and advance balances
 * Ensures status is always system-derived (paid/partial/sent/overdue)
 *
 * Batch-oriented: tenant/all-tenant paths load allocations/credits/deposits
 * in set-based queries instead of per-invoice N+1 loops.
 */

import pool from '@/lib/db';
import type { PoolClient } from 'pg';

export interface RecalculationResult {
  invoiceId: string;
  invoiceNumber: string;
  oldStatus: string;
  newStatus: string;
  amountPaid: number;
  balanceDue: number;
  updated: boolean;
}

export interface TenantRecalculationResult {
  tenantId: string;
  invoicesUpdated: number;
  results: RecalculationResult[];
}

interface InvoicePaymentTotalsRow {
  id: string;
  tenant_id: string;
  invoice_number: string;
  total_amount: string | number;
  amount_paid: string | number;
  balance_due: string | number;
  invoice_status: string;
  due_date: Date | string | null;
  total_allocated: string | number;
  total_advance: string | number;
  total_deposit: string | number;
}

/** Pure status derivation — shared by single + batch paths for identical outcomes. */
export function deriveInvoiceStatus(params: {
  totalAmount: number;
  totalPaid: number;
  dueDate: Date | string | null;
  now?: Date;
}): { newStatus: string; balanceDue: number } {
  const { totalAmount, totalPaid, dueDate, now = new Date() } = params;
  const balanceDue = totalAmount - totalPaid;
  const due = dueDate ? new Date(dueDate) : null;
  const isOverdue = Boolean(due && due < now && balanceDue > 0);

  let newStatus: string;
  if (balanceDue <= 0) {
    newStatus = 'paid';
  } else if (totalPaid > 0) {
    newStatus = isOverdue ? 'overdue' : 'partial';
  } else {
    newStatus = isOverdue ? 'overdue' : 'sent';
  }

  return { newStatus, balanceDue };
}

function rowToResult(row: InvoicePaymentTotalsRow, now: Date): RecalculationResult {
  const totalPaid =
    parseFloat(String(row.total_allocated || 0)) +
    parseFloat(String(row.total_advance || 0)) +
    parseFloat(String(row.total_deposit || 0));
  const totalAmount = parseFloat(String(row.total_amount));
  const oldStatus = row.invoice_status;
  const { newStatus, balanceDue } = deriveInvoiceStatus({
    totalAmount,
    totalPaid,
    dueDate: row.due_date,
    now,
  });
  const updated =
    oldStatus !== newStatus ||
    Math.abs(parseFloat(String(row.amount_paid)) - totalPaid) > 0.01;

  return {
    invoiceId: row.id,
    invoiceNumber: row.invoice_number,
    oldStatus,
    newStatus,
    amountPaid: totalPaid,
    balanceDue,
    updated,
  };
}

/**
 * Load invoices + aggregated payment sources in one round-trip.
 * When invoiceIds is provided, filters to those IDs; otherwise filters by tenantId.
 */
async function fetchInvoicePaymentTotals(
  client: PoolClient,
  filter: { invoiceIds?: string[]; tenantId?: string }
): Promise<InvoicePaymentTotalsRow[]> {
  const params: unknown[] = [];
  let whereClause: string;
  let allocFilter: string;
  let creditFilter: string;
  let depositFilter: string;

  if (filter.invoiceIds && filter.invoiceIds.length > 0) {
    params.push(filter.invoiceIds);
    whereClause = `i.id = ANY($1::uuid[])`;
    allocFilter = `WHERE invoice_id = ANY($1::uuid[])`;
    creditFilter = `WHERE status = 'applied' AND applied_to_invoice_id = ANY($1::uuid[])`;
    depositFilter = `WHERE transaction_type = 'applied' AND applied_to_invoice_id = ANY($1::uuid[])`;
  } else if (filter.tenantId) {
    params.push(filter.tenantId);
    whereClause = `i.tenant_id = $1`;
    allocFilter = `WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id = $1)`;
    creditFilter = `WHERE status = 'applied' AND applied_to_invoice_id IN (SELECT id FROM invoices WHERE tenant_id = $1)`;
    depositFilter = `WHERE transaction_type = 'applied' AND applied_to_invoice_id IN (SELECT id FROM invoices WHERE tenant_id = $1)`;
  } else {
    whereClause = 'TRUE';
    allocFilter = '';
    creditFilter = `WHERE status = 'applied'`;
    depositFilter = `WHERE transaction_type = 'applied'`;
  }

  const result = await client.query(
    `
    SELECT
      i.id,
      i.tenant_id,
      i.invoice_number,
      i.total_amount,
      i.amount_paid,
      i.balance_due,
      i.invoice_status,
      i.due_date,
      COALESCE(pa.total_allocated, 0) AS total_allocated,
      COALESCE(tc.total_advance, 0) AS total_advance,
      COALESCE(dl.total_deposit, 0) AS total_deposit
    FROM invoices i
    LEFT JOIN (
      SELECT invoice_id, SUM(allocated_amount) AS total_allocated
      FROM payment_allocations
      ${allocFilter}
      GROUP BY invoice_id
    ) pa ON pa.invoice_id = i.id
    LEFT JOIN (
      SELECT applied_to_invoice_id, SUM(amount) AS total_advance
      FROM tenant_credits
      ${creditFilter}
      GROUP BY applied_to_invoice_id
    ) tc ON tc.applied_to_invoice_id = i.id
    LEFT JOIN (
      SELECT applied_to_invoice_id, SUM(amount) AS total_deposit
      FROM deposit_ledger
      ${depositFilter}
      GROUP BY applied_to_invoice_id
    ) dl ON dl.applied_to_invoice_id = i.id
    WHERE ${whereClause}
    ORDER BY i.due_date ASC NULLS LAST, i.created_at ASC
    `,
    params
  );

  return result.rows as InvoicePaymentTotalsRow[];
}

async function applyRecalculationUpdates(
  client: PoolClient,
  results: RecalculationResult[]
): Promise<void> {
  const toUpdate = results.filter((r) => r.updated);
  if (toUpdate.length === 0) return;

  const ids = toUpdate.map((r) => r.invoiceId);
  const amounts = toUpdate.map((r) => r.amountPaid);
  const statuses = toUpdate.map((r) => r.newStatus);

  await client.query(
    `
    UPDATE invoices AS i
    SET
      amount_paid = v.amount_paid,
      invoice_status = v.invoice_status,
      updated_at = CURRENT_TIMESTAMP
    FROM (
      SELECT *
      FROM UNNEST($1::uuid[], $2::numeric[], $3::text[])
        AS t(id, amount_paid, invoice_status)
    ) AS v
    WHERE i.id = v.id
    `,
    [ids, amounts, statuses]
  );
}

/**
 * Recalculate a set of invoices in one TX (batched reads + batched writes).
 */
export async function recalculateInvoiceStatusesForIds(
  invoiceIds: string[]
): Promise<RecalculationResult[]> {
  if (invoiceIds.length === 0) return [];

  const client = await pool.connect();
  const now = new Date();

  try {
    await client.query('BEGIN');
    const rows = await fetchInvoicePaymentTotals(client, { invoiceIds });
    const foundIds = new Set(rows.map((r) => r.id));
    for (const id of invoiceIds) {
      if (!foundIds.has(id)) {
        throw new Error(`Invoice not found: ${id}`);
      }
    }
    const results = rows.map((row) => rowToResult(row, now));
    await applyRecalculationUpdates(client, results);
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recalculating invoice statuses for ids:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Recalculate invoice status for a single invoice
 */
export async function recalculateInvoiceStatus(invoiceId: string): Promise<RecalculationResult> {
  const results = await recalculateInvoiceStatusesForIds([invoiceId]);
  return results[0];
}

/**
 * Recalculate all invoice statuses for a tenant (single set-based query, not N+1)
 */
export async function recalculateAllInvoiceStatusesForTenant(
  tenantId: string
): Promise<TenantRecalculationResult> {
  const client = await pool.connect();
  const now = new Date();

  try {
    await client.query('BEGIN');
    const rows = await fetchInvoicePaymentTotals(client, { tenantId });
    const results = rows.map((row) => rowToResult(row, now));
    await applyRecalculationUpdates(client, results);
    await client.query('COMMIT');

    return {
      tenantId,
      invoicesUpdated: results.filter((r) => r.updated).length,
      results,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recalculating invoice statuses for tenant:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Recalculate invoice statuses for all tenants (one set-based pass, not N×M)
 */
export async function recalculateInvoiceStatusesForAllTenants(): Promise<{
  success: boolean;
  totalTenants: number;
  totalInvoicesUpdated: number;
  errors: Array<{ tenantId: string; error: string }>;
}> {
  const client = await pool.connect();
  const now = new Date();

  try {
    await client.query('BEGIN');
    const rows = await fetchInvoicePaymentTotals(client, {});
    const results = rows.map((row) => rowToResult(row, now));
    await applyRecalculationUpdates(client, results);
    await client.query('COMMIT');

    const tenantIds = new Set(rows.map((r) => r.tenant_id));

    return {
      success: true,
      totalTenants: tenantIds.size,
      totalInvoicesUpdated: results.filter((r) => r.updated).length,
      errors: [],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recalculating invoice statuses for all tenants:', error);
    throw error;
  } finally {
    client.release();
  }
}
