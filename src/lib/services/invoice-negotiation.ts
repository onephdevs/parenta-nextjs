/**
 * Negotiate a new due date on an invoice (alternate path when auto_late_fee is off).
 * Also supports rent adjustments/discounts on the bill.
 */

import pool from '@/lib/db';
import { recalculateInvoiceStatusesForIds } from '@/lib/services/invoice-status-recalculator';
import { syncPaymentCardForTenant } from '@/lib/api/pipeline';

export async function negotiateInvoiceDueDate(params: {
  invoiceId: string;
  negotiatedDueDate: string;
  reason: string;
  userId?: string | null;
}): Promise<{ invoiceId: string; effectiveDueDate: string }> {
  const reason = String(params.reason || '').trim();
  if (!reason) {
    throw new Error('A reason is required when negotiating a due date');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.negotiatedDueDate)) {
    throw new Error('negotiatedDueDate must be YYYY-MM-DD');
  }

  const result = await pool.query(
    `UPDATE invoices
     SET negotiated_due_date = $2::date,
         negotiated_due_reason = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND invoice_status IS DISTINCT FROM 'cancelled'
     RETURNING id, tenant_id, due_date, negotiated_due_date`,
    [params.invoiceId, params.negotiatedDueDate, reason]
  );

  if (!result.rows[0]) {
    throw new Error('Invoice not found or cancelled');
  }

  await recalculateInvoiceStatusesForIds([params.invoiceId]);

  try {
    await syncPaymentCardForTenant(String(result.rows[0].tenant_id));
  } catch (err) {
    console.warn('Payment card sync after negotiate skipped:', err);
  }

  const row = result.rows[0];
  return {
    invoiceId: String(row.id),
    effectiveDueDate: String(row.negotiated_due_date || row.due_date).slice(0, 10),
  };
}

export async function applyInvoiceAdjustment(params: {
  invoiceId: string;
  adjustmentAmount: number;
  adjustmentReason: string;
}): Promise<{ invoiceId: string; totalAmount: number; billStatus: string }> {
  const reason = String(params.adjustmentReason || '').trim();
  if (!reason) {
    throw new Error('adjustmentReason is required');
  }
  const amount = Number(params.adjustmentAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('adjustmentAmount must be a non-negative number');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT id, subtotal, tax_amount, discount_amount, amount_paid, total_amount
       FROM invoices WHERE id = $1 FOR UPDATE`,
      [params.invoiceId]
    );
    if (!current.rows[0]) {
      throw new Error('Invoice not found');
    }
    const row = current.rows[0];
    const subtotal = Number(row.subtotal || row.total_amount || 0);
    const tax = Number(row.tax_amount || 0);
    const discount = Number(row.discount_amount || 0);
    // adjustment reduces amount owed (caretaker discount, etc.)
    const newTotal = Math.max(0, subtotal + tax - discount - amount);

    const updated = await client.query(
      `UPDATE invoices
       SET adjustment_amount = $2,
           adjustment_reason = $3,
           total_amount = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, total_amount, bill_status, tenant_id`,
      [params.invoiceId, amount, reason, newTotal]
    );
    await client.query('COMMIT');

    await recalculateInvoiceStatusesForIds([params.invoiceId]);
    try {
      await syncPaymentCardForTenant(String(updated.rows[0].tenant_id));
    } catch {
      /* optional */
    }

    const refreshed = await pool.query(
      `SELECT total_amount, bill_status FROM invoices WHERE id = $1`,
      [params.invoiceId]
    );
    return {
      invoiceId: params.invoiceId,
      totalAmount: Number(refreshed.rows[0]?.total_amount || newTotal),
      billStatus: String(refreshed.rows[0]?.bill_status || 'UNPAID'),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
