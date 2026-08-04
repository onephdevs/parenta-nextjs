/**
 * Invoice issue timing — invoices stay draft until issue_date is reached.
 */

import pool from '@/lib/db';
import type { PoolClient } from 'pg';

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Initial status when creating an invoice.
 * Future-dated invoices (issue_date after today) stay draft until released.
 */
export function initialInvoiceStatusForIssueDate(
  issueDate: Date | string,
  now: Date = new Date()
): 'draft' | 'sent' {
  const issue = startOfLocalDay(new Date(issueDate));
  const today = startOfLocalDay(now);
  return issue.getTime() <= today.getTime() ? 'sent' : 'draft';
}

export interface ReleaseDueInvoicesResult {
  releasedCount: number;
  demotedCount: number;
  releasedIds: string[];
  tenantIds: string[];
}

/**
 * Promote draft invoices whose issue_date has arrived to `sent`,
 * and demote unpaid future invoices that were incorrectly marked `sent`.
 */
export async function releaseDueInvoices(
  client?: PoolClient
): Promise<ReleaseDueInvoicesResult> {
  const db = client || pool;
  const ownClient = !client;
  const active = ownClient ? await pool.connect() : (client as PoolClient);

  try {
    if (ownClient) await active.query('BEGIN');

    // Demote future unpaid invoices that were issued as sent too early
    const demote = await active.query(
      `UPDATE invoices
       SET invoice_status = 'draft',
           updated_at = CURRENT_TIMESTAMP
       WHERE invoice_status = 'sent'
         AND COALESCE(amount_paid, 0) = 0
         AND COALESCE(balance_due, total_amount) > 0
         AND issue_date > CURRENT_DATE
       RETURNING id, tenant_id`
    );

    const release = await active.query(
      `UPDATE invoices
       SET invoice_status = 'sent',
           updated_at = CURRENT_TIMESTAMP
       WHERE invoice_status = 'draft'
         AND issue_date <= CURRENT_DATE
       RETURNING id, tenant_id`
    );

    if (ownClient) await active.query('COMMIT');

    const releasedIds = release.rows.map((r: { id: string }) => r.id);
    const tenantIds = Array.from(
      new Set([
        ...demote.rows.map((r: { tenant_id: string }) => r.tenant_id),
        ...release.rows.map((r: { tenant_id: string }) => r.tenant_id),
      ])
    );

    // Apply advance only after invoices become payable/sent
    if (releasedIds.length > 0) {
      try {
        const { applyCreditToRentInvoice } = await import('./payment-allocator');
        for (const row of release.rows as Array<{ id: string; tenant_id: string }>) {
          try {
            await applyCreditToRentInvoice(row.tenant_id, row.id);
          } catch (err) {
            console.warn(`Advance apply skipped for released invoice ${row.id}:`, err);
          }
        }
      } catch (err) {
        console.warn('Advance allocator unavailable after invoice release:', err);
      }
    }

    return {
      releasedCount: release.rowCount || 0,
      demotedCount: demote.rowCount || 0,
      releasedIds,
      tenantIds,
    };
  } catch (error) {
    if (ownClient) await active.query('ROLLBACK');
    throw error;
  } finally {
    if (ownClient) active.release();
  }
}
