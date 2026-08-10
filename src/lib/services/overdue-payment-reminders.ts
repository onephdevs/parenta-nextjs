/**
 * When an invoice's effective due date passes unpaid, create a reminder notification
 * for admin users and mark the payments pipeline for follow-up.
 */

import pool from '@/lib/db';
import { EFFECTIVE_DUE_SQL } from '@/lib/billing/invoice-due';

export async function generateOverduePaymentReminders(): Promise<{
  created: number;
  invoiceIds: string[];
}> {
  const overdue = await pool.query(
    `
    SELECT
      i.id AS invoice_id,
      i.tenant_id,
      i.invoice_number,
      i.balance_due,
      ${EFFECTIVE_DUE_SQL} AS effective_due,
      t.first_name,
      t.last_name
    FROM invoices i
    JOIN tenants t ON t.id = i.tenant_id
    WHERE i.invoice_status IN ('sent', 'partial', 'overdue')
      AND COALESCE(i.bill_status, 'UNPAID') <> 'PAID'
      AND i.balance_due > 0
      AND ${EFFECTIVE_DUE_SQL} < CURRENT_DATE
    ORDER BY ${EFFECTIVE_DUE_SQL} ASC
    LIMIT 200
    `
  );

  if (overdue.rows.length === 0) {
    return { created: 0, invoiceIds: [] };
  }

  const admins = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' AND COALESCE(is_active, true) = true`
  );
  if (admins.rows.length === 0) {
    return { created: 0, invoiceIds: [] };
  }

  let created = 0;
  const invoiceIds: string[] = [];

  for (const row of overdue.rows) {
    // Deduplicate: one overdue reminder per invoice per day
    const existing = await pool.query(
      `SELECT 1 FROM notifications
       WHERE notification_type = 'payment_overdue'
         AND title LIKE $1
         AND created_at::date = CURRENT_DATE
       LIMIT 1`,
      [`%${row.invoice_number}%`]
    );
    if (existing.rows.length > 0) continue;

    const tenantName = `${row.first_name} ${row.last_name}`.trim();
    const title = `Overdue: ${row.invoice_number}`;
    const message = `${tenantName} has an unpaid balance of ₱${Number(
      row.balance_due || 0
    ).toFixed(2)} (effective due ${String(row.effective_due).slice(0, 10)}). Follow up or negotiate a new deadline.`;

    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (
           user_id, tenant_id, notification_type, title, message,
           priority, notification_status, sent_at
         ) VALUES ($1, $2, 'payment_overdue', $3, $4, 'high', 'sent', CURRENT_TIMESTAMP)`,
        [admin.id, row.tenant_id, title, message]
      );
      created += 1;
    }
    invoiceIds.push(String(row.invoice_id));

    // Flip workflow status if still sent/partial
    await pool.query(
      `UPDATE invoices
       SET invoice_status = 'overdue', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND invoice_status IN ('sent', 'partial')`,
      [row.invoice_id]
    );
  }

  return { created, invoiceIds };
}
