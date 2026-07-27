/**
 * Invoice Status Recalculation Service
 * Recalculates invoice statuses based on payments and advance balances
 * Ensures status is always system-derived (paid/partial/sent/overdue)
 */

import pool from '@/lib/db';

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

/**
 * Recalculate invoice status for a single invoice
 */
export async function recalculateInvoiceStatus(invoiceId: string): Promise<RecalculationResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get invoice details
    const invoiceResult = await client.query(
      `SELECT 
        i.id,
        i.invoice_number,
        i.total_amount,
        i.amount_paid,
        i.balance_due,
        i.invoice_status,
        i.due_date
      FROM invoices i
      WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    const invoice = invoiceResult.rows[0];
    const oldStatus = invoice.invoice_status;

    // Calculate actual amount_paid from payment allocations and advance applications
    const paymentAllocationsResult = await client.query(
      `SELECT COALESCE(SUM(allocated_amount), 0) as total_allocated
       FROM payment_allocations
       WHERE invoice_id = $1`,
      [invoiceId]
    );

    const advanceApplicationsResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total_advance
       FROM tenant_credits
       WHERE applied_to_invoice_id = $1
         AND status = 'applied'`,
      [invoiceId]
    );

    const depositApplicationsResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total_deposit
       FROM deposit_ledger
       WHERE applied_to_invoice_id = $1
         AND transaction_type = 'applied'`,
      [invoiceId]
    );

    const totalPaid = 
      parseFloat(paymentAllocationsResult.rows[0].total_allocated || 0) +
      parseFloat(advanceApplicationsResult.rows[0].total_advance || 0) +
      parseFloat(depositApplicationsResult.rows[0].total_deposit || 0);

    const totalAmount = parseFloat(invoice.total_amount);
    const balanceDue = totalAmount - totalPaid;

    // Determine new status based on payment and due date
    let newStatus: string;
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
    const isOverdue = dueDate && dueDate < new Date() && balanceDue > 0;

    if (balanceDue <= 0) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = isOverdue ? 'overdue' : 'partial';
    } else {
      newStatus = isOverdue ? 'overdue' : 'sent';
    }

    // Update invoice if status or amount_paid changed
    const updated = oldStatus !== newStatus || Math.abs(parseFloat(invoice.amount_paid) - totalPaid) > 0.01;

    if (updated) {
      await client.query(
        `UPDATE invoices 
         SET amount_paid = $1,
             invoice_status = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [totalPaid, newStatus, invoiceId]
      );
    }

    await client.query('COMMIT');

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      oldStatus,
      newStatus,
      amountPaid: totalPaid,
      balanceDue,
      updated
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recalculating invoice status:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Recalculate all invoice statuses for a tenant
 */
export async function recalculateAllInvoiceStatusesForTenant(tenantId: string): Promise<TenantRecalculationResult> {
  const client = await pool.connect();
  
  try {
    // Get all invoices for tenant
    const invoicesResult = await client.query(
      `SELECT id FROM invoices WHERE tenant_id = $1 ORDER BY due_date ASC, created_at ASC`,
      [tenantId]
    );

    const results: RecalculationResult[] = [];
    let invoicesUpdated = 0;

    for (const row of invoicesResult.rows) {
      try {
        const result = await recalculateInvoiceStatus(row.id);
        results.push(result);
        if (result.updated) {
          invoicesUpdated++;
        }
      } catch (error) {
        console.error(`Error recalculating invoice ${row.id}:`, error);
        // Continue with other invoices
      }
    }

    return {
      tenantId,
      invoicesUpdated,
      results
    };

  } catch (error) {
    console.error('Error recalculating invoice statuses for tenant:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Recalculate invoice statuses for all tenants (batch operation)
 */
export async function recalculateInvoiceStatusesForAllTenants(): Promise<{
  success: boolean;
  totalTenants: number;
  totalInvoicesUpdated: number;
  errors: Array<{ tenantId: string; error: string }>;
}> {
  const client = await pool.connect();
  
  try {
    // Get all unique tenant IDs with invoices
    const tenantsResult = await client.query(
      `SELECT DISTINCT tenant_id FROM invoices ORDER BY tenant_id`
    );

    const tenantIds = tenantsResult.rows.map(row => row.tenant_id);
    let totalInvoicesUpdated = 0;
    const errors: Array<{ tenantId: string; error: string }> = [];

    for (const tenantId of tenantIds) {
      try {
        const result = await recalculateAllInvoiceStatusesForTenant(tenantId);
        totalInvoicesUpdated += result.invoicesUpdated;
      } catch (error) {
        errors.push({
          tenantId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: true,
      totalTenants: tenantIds.length,
      totalInvoicesUpdated,
      errors
    };

  } catch (error) {
    console.error('Error recalculating invoice statuses for all tenants:', error);
    throw error;
  } finally {
    client.release();
  }
}
