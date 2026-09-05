/**
 * Invoice Generation Service
 * Automatically generates invoices for tenants based on lease terms
 */

import pool from '@/lib/db';
import type { PoolClient } from 'pg';
import { InvoiceGenerationRequest, InvoiceGenerationResult } from '@/types/financial';
import { initialInvoiceStatusForIssueDate } from '@/lib/services/invoice-issue-timing';
import { dueDateForBillingMonth } from '@/lib/billing/invoice-due';
import { resolveRentDueDay } from '@/lib/billing/billing-cycle';
import { lockTenantMoney } from '@/lib/db/tenant-money-lock';

/** Open-ended leases get a rolling year of scheduled (mostly draft) invoices. */
const OPEN_ENDED_INVOICE_MONTHS = 12;

/**
 * Resolve the end date used for rent invoice scheduling.
 * Open-ended leases schedule the next 12 months from start (or from today if start is past).
 */
export function resolveLeaseInvoiceEndDate(
  leaseStartDate: Date | string,
  leaseEndDate?: Date | string | null
): Date {
  if (leaseEndDate) {
    return new Date(leaseEndDate);
  }
  const start = new Date(leaseStartDate);
  const today = new Date();
  const anchor = start > today ? start : today;
  const end = new Date(anchor);
  end.setMonth(end.getMonth() + OPEN_ENDED_INVOICE_MONTHS);
  return end;
}

function billingMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Generate (or top up) rent invoices for a lease.
 * Safe to call multiple times — skips months that already have a rent invoice.
 * Future months are created as draft and released when issue_date is met.
 */
export async function ensureRentInvoicesForLease(params: {
  tenantId: string;
  roomId: string;
  leaseStartDate: Date | string;
  leaseEndDate?: Date | string | null;
  monthlyRent: number;
  depositAmount?: number;
  advanceAmount?: number;
}): Promise<InvoiceGenerationResult> {
  return generateInvoicesForTenant({
    tenantId: params.tenantId,
    roomId: params.roomId,
    leaseStartDate: new Date(params.leaseStartDate),
    leaseEndDate: resolveLeaseInvoiceEndDate(params.leaseStartDate, params.leaseEndDate),
    monthlyRent: params.monthlyRent,
    depositAmount: params.depositAmount,
    advanceAmount: params.advanceAmount,
  });
}

/**
 * Generate invoices for a tenant based on their lease period
 * Creates one invoice per month from lease start to lease end
 */
export async function generateInvoicesForTenant(
  request: InvoiceGenerationRequest
): Promise<InvoiceGenerationResult> {
  const client = await pool.connect();
  let committed = false;
  
  try {
    await client.query('BEGIN');
    await lockTenantMoney(client, request.tenantId);

    const {
      tenantId,
      roomId,
      leaseStartDate,
      leaseEndDate,
      monthlyRent,
      depositAmount,
      advanceAmount
    } = request;

    // Validate input
    if (!tenantId || !roomId || !leaseStartDate || !leaseEndDate || !monthlyRent) {
      throw new Error('Missing required fields for invoice generation');
    }

    if (new Date(leaseEndDate) <= new Date(leaseStartDate)) {
      throw new Error('Lease end date must be after start date');
    }

    // Get tenant information for invoice
    const tenantResult = await client.query(
      'SELECT first_name, last_name, email FROM tenants WHERE id = $1',
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const tenant = tenantResult.rows[0];

    // Get room information
    const roomResult = await client.query(
      `SELECT r.room_number, b.name as building_name 
       FROM rooms r 
       LEFT JOIN buildings b ON r.building_id = b.id 
       WHERE r.id = $1`,
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const room = roomResult.rows[0];

    // Lease billing cycle day (Phase 1) — fall back to start date / legacy day 5
    const cycleResult = await client.query(
      `SELECT billing_cycle_start_day, start_date
       FROM tenant_room_assignments
       WHERE tenant_id = $1 AND room_id = $2
         AND assignment_status = 'active'
       ORDER BY start_date DESC
       LIMIT 1`,
      [tenantId, roomId]
    );
    const cycleRow = cycleResult.rows[0];
    const rentDueDay = resolveRentDueDay({
      billingCycleStartDay:
        cycleRow?.billing_cycle_start_day != null
          ? Number(cycleRow.billing_cycle_start_day)
          : null,
      startDate: cycleRow?.start_date ?? leaseStartDate,
      fallbackDay: 5,
    });

    const startDate = new Date(leaseStartDate);
    const endDate = new Date(leaseEndDate);
    
    // Generate invoices - ONLY rent invoices (deposits are never invoiced)
    const invoiceIds: string[] = [];
    const invoices: Array<{ id: string; invoiceNumber: string; totalAmount: number }> = [];
    let invoiceCounter = 0;
    let skippedExisting = 0;

    // Create advance as tenant credit if provided (advance is prepaid rent, not an invoice)
    if (advanceAmount && advanceAmount > 0) {
      const existingAdvance = await client.query(
        `SELECT id FROM tenant_credits
         WHERE tenant_id = $1 AND source = 'manual'
           AND description ILIKE $2
         LIMIT 1`,
        [tenantId, `%Initial advance payment for ${room.building_name}%`]
      );
      if (existingAdvance.rows.length === 0) {
        await client.query(
          `INSERT INTO tenant_credits (
            tenant_id,
            amount,
            source,
            description,
            status
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            tenantId,
            advanceAmount,
            'manual',
            `Initial advance payment for ${room.building_name} - ${room.room_number}`,
            'available'
          ]
        );
      }
    }

    // Calculate number of months in lease for monthly invoices
    const months: Date[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (current <= endMonth) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    // Generate monthly rent invoices for each month
    for (let i = 0; i < months.length; i++) {
      const invoiceMonth = months[i];
      const monthKey = billingMonthKey(invoiceMonth);

      const existingMonth = await client.query(
        `SELECT i.id
         FROM invoices i
         INNER JOIN invoice_line_items ili ON ili.invoice_id = i.id AND ili.item_type = 'rent'
         WHERE i.tenant_id = $1
           AND i.invoice_status <> 'cancelled'
           AND TO_CHAR(COALESCE(i.billing_period_start, i.due_date, i.issue_date), 'YYYY-MM') = $2
         LIMIT 1`,
        [tenantId, monthKey]
      );
      if (existingMonth.rows.length > 0) {
        skippedExisting += 1;
        continue;
      }

      const dueDate = dueDateForBillingMonth(
        invoiceMonth.getFullYear(),
        invoiceMonth.getMonth(),
        rentDueDay
      );

      // Always bill full monthly rent (no day-based proration).
      // Move-in mid-month still charges one full month; advance covers that month.
      const invoiceAmount = monthlyRent;
      const description = `Monthly Rent - ${invoiceMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`;

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${invoiceCounter}`;
      invoiceCounter++;
      
      // Determine billing period
      const billingPeriodStart = i === 0 ? startDate : new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth(), 1);
      const billingPeriodEnd = new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth() + 1, 0);

      // Create invoice — future months stay draft until issue_date is reached.
      // First month: issue on lease start (not the 1st) so mid-month move-ins match reality.
      const issueDate = i === 0 ? startDate : invoiceMonth;
      const invoiceStatus = initialInvoiceStatusForIssueDate(issueDate);

      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          tenant_id,
          invoice_number,
          issue_date,
          due_date,
          billing_period_start,
          billing_period_end,
          subtotal,
          tax_amount,
          total_amount,
          amount_paid,
          invoice_status,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          tenantId,
          invoiceNumber,
          issueDate,
          dueDate,
          billingPeriodStart,
          billingPeriodEnd,
          invoiceAmount,
          0, // No tax
        invoiceAmount,
        0, // Not paid yet
        invoiceStatus,
        `Auto-generated invoice for ${room.building_name} - ${room.room_number}`
      ]
      );

      const invoiceId = invoiceResult.rows[0].id;
      invoiceIds.push(invoiceId);
      invoices.push({
        id: invoiceId,
        invoiceNumber,
        totalAmount: invoiceAmount,
      });

      // Create invoice line item (rent only)
      await client.query(
        `INSERT INTO invoice_line_items (
          invoice_id,
          description,
          quantity,
          unit_price,
          item_type
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          invoiceId,
          description,
          1,
          invoiceAmount,
          'rent'
        ]
      );
    }

    // Handle deposit if provided
    let depositRecorded = false;
    if (depositAmount && depositAmount > 0) {
      const existingDeposit = await client.query(
        `SELECT id FROM deposit_ledger
         WHERE tenant_id = $1 AND transaction_type = 'deposit'
           AND description ILIKE $2
         LIMIT 1`,
        [tenantId, `%Initial security deposit for ${room.building_name}%`]
      );
      if (existingDeposit.rows.length === 0) {
        await client.query(
          `INSERT INTO deposit_ledger (
            tenant_id,
            amount,
            transaction_type,
            description,
            transaction_date
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            tenantId,
            depositAmount,
            'deposit',
            `Initial security deposit for ${room.building_name} - ${room.room_number}`,
            startDate
          ]
        );
        depositRecorded = true;
      }
    }

    // Must commit before applying advance — payment-allocator uses separate pool
    // connections and cannot see uncommitted invoices/credits.
    await client.query('COMMIT');
    committed = true;

    let advanceApplied = 0;
    try {
      const { autoApplyAdvanceToUnpaidRentInvoices } = await import('./payment-allocator');
      const applyResult = await autoApplyAdvanceToUnpaidRentInvoices(tenantId);
      advanceApplied = applyResult.totalApplied || 0;
    } catch (advanceError) {
      // Log but don't fail invoice generation if advance application fails
      console.warn('Could not auto-apply advance to newly created invoices:', advanceError);
    }

    const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    return {
      success: true,
      invoicesCreated: invoiceIds.length,
      invoiceIds,
      invoices,
      totalAmount,
      firstInvoiceNumber: invoices[0]?.invoiceNumber,
      lastInvoiceNumber: invoices[invoices.length - 1]?.invoiceNumber,
      depositRecorded,
      depositAmount: depositRecorded ? depositAmount : undefined,
      message: `Successfully generated ${invoiceIds.length} rent invoice(s) for ${tenant.first_name} ${tenant.last_name}${skippedExisting ? ` (${skippedExisting} existing month(s) skipped)` : ''}${depositRecorded ? ` and recorded deposit of ₱${depositAmount}` : ''}${advanceApplied > 0 ? ` and applied ₱${advanceApplied} advance` : ''}`
    };

  } catch (error) {
    if (!committed) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Transaction may already be closed
      }
    }
    console.error('Error generating invoices:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Generate a single invoice manually
 * Useful for utility bills, late fees, etc.
 */
export async function generateSingleInvoice(
  tenantId: string,
  dueDate: Date,
  items: Array<{
    description: string;
    amount: number;
    itemType?: 'rent' | 'utilities' | 'fees' | 'deposit' | 'other';
  }>,
  notes?: string
): Promise<{ invoiceId: string; invoiceNumber: string }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = 0; // No tax for now
    const totalAmount = subtotal + taxAmount;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Create invoice
    const invoiceResult = await client.query(
      `INSERT INTO invoices (
        tenant_id,
        invoice_number,
        issue_date,
        due_date,
        subtotal,
        tax_amount,
        total_amount,
        amount_paid,
        invoice_status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        tenantId,
        invoiceNumber,
        new Date(),
        dueDate,
        subtotal,
        taxAmount,
      totalAmount,
      0,
      'sent',
      notes || 'Manually generated invoice'
    ]
    );

    const invoiceId = invoiceResult.rows[0].id;

    // Create invoice line items
    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_line_items (
          invoice_id,
          description,
          quantity,
          unit_price,
          item_type
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          invoiceId,
          item.description,
          1,
          item.amount,
          item.itemType || 'other'
        ]
      );
    }

    await client.query('COMMIT');

    return {
      invoiceId,
      invoiceNumber
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating single invoice:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check for overdue invoices and update their status.
 * Also releases draft invoices whose issue_date has been reached.
 */
export async function updateOverdueInvoices(): Promise<number> {
  try {
    const { releaseDueInvoices } = await import('@/lib/services/invoice-issue-timing');
    await releaseDueInvoices();

    const result = await pool.query(
      `UPDATE invoices 
       SET invoice_status = 'overdue',
           updated_at = CURRENT_TIMESTAMP
       WHERE invoice_status IN ('sent', 'partial') 
       AND COALESCE(negotiated_due_date, due_date) < CURRENT_DATE 
       AND balance_due > 0
       RETURNING id`
    );

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error updating overdue invoices:', error);
    throw error;
  }
}

/**
 * Get unpaid invoices for a tenant (sorted by due date, oldest first)
 */
/**
 * Get unpaid RENT invoices for a tenant (sorted by due date, oldest first)
 * Used for automatic advance application - advance only applies to rent invoices
 */
export async function getUnpaidRentInvoicesForTenant(
  tenantId: string,
  db?: PoolClient
): Promise<Array<{
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  dueDate: Date;
  invoiceStatus: string;
}>> {
  try {
    const exec = db ?? pool;
    const result = await exec.query(
      `SELECT 
        i.id,
        i.invoice_number,
        i.total_amount,
        i.amount_paid,
        i.balance_due,
        i.due_date,
        i.invoice_status
      FROM invoices i
      INNER JOIN invoice_line_items ili ON i.id = ili.invoice_id
      WHERE i.tenant_id = $1
        AND i.balance_due > 0
        AND ili.item_type = 'rent'
        AND i.invoice_status IN ('sent', 'partial', 'overdue')
      GROUP BY i.id, i.invoice_number, i.total_amount, i.amount_paid, i.balance_due, i.due_date, i.invoice_status
      HAVING COUNT(CASE WHEN ili.item_type = 'rent' THEN 1 END) > 0
      ORDER BY i.due_date ASC, i.created_at ASC`,
      [tenantId]
    );

    return result.rows.map(row => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      totalAmount: parseFloat(row.total_amount),
      amountPaid: parseFloat(row.amount_paid),
      balanceDue: parseFloat(row.balance_due),
      dueDate: row.due_date,
      invoiceStatus: row.invoice_status
    }));
  } catch (error) {
    console.error('Error getting unpaid rent invoices:', error);
    throw error;
  }
}

export async function getUnpaidInvoicesForTenant(
  tenantId: string,
  db?: PoolClient
): Promise<Array<{
  id: string;
  invoiceNumber: string;
  dueDate: Date;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  typeLabel: string;
}>> {
  try {
    const exec = db ?? pool;
    const result = await exec.query(
      `SELECT 
        i.id,
        i.invoice_number,
        i.due_date,
        i.total_amount,
        i.amount_paid,
        i.balance_due,
        i.invoice_status as status,
        (
          SELECT ili.item_type
          FROM invoice_line_items ili
          WHERE ili.invoice_id = i.id
          ORDER BY ili.created_at ASC, ili.id ASC
          LIMIT 1
        ) AS primary_item_type
       FROM invoices i
       WHERE i.tenant_id = $1 
       AND i.invoice_status IN ('draft', 'sent', 'issued', 'partial', 'overdue', 'due')
       AND COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009
       ORDER BY i.due_date ASC NULLS LAST, i.created_at ASC`,
      [tenantId]
    );

    return result.rows.map(row => {
      const itemType = String(row.primary_item_type || 'rent').toLowerCase();
      const typeLabel =
        itemType.includes('util') || itemType === 'electricity' || itemType === 'water'
          ? 'Utilities'
          : itemType === 'deposit'
            ? 'Deposit'
            : itemType === 'late_fee' || itemType === 'penalty'
              ? 'Penalty'
              : 'Rent';
      return {
        id: row.id,
        invoiceNumber: row.invoice_number,
        dueDate: row.due_date,
        totalAmount: parseFloat(row.total_amount),
        amountPaid: parseFloat(row.amount_paid),
        balanceDue: parseFloat(row.balance_due),
        status: row.status,
        typeLabel,
      };
    });
  } catch (error) {
    console.error('Error getting unpaid invoices:', error);
    throw error;
  }
}

