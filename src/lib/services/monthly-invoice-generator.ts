/**
 * Monthly Invoice Generator Service
 * Generates monthly rent invoices for tenants with active leases
 * Automatically applies available advance to newly created invoices
 */

import pool from '@/lib/db';
import { generateInvoicesForTenant } from './invoice-generator';
import { autoApplyAdvanceToUnpaidRentInvoices } from './payment-allocator';
import { dueDateForBillingMonth } from '@/lib/billing/invoice-due';
import { resolveRentDueDay } from '@/lib/billing/billing-cycle';

/**
 * Generate next month's rent invoice for a tenant with an active lease
 * Only creates rent invoices - other invoice types remain manually created
 */
export async function generateNextMonthRentInvoice(
  tenantId: string
): Promise<{
  success: boolean;
  invoiceCreated: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  advanceApplied: boolean;
  advanceAmount?: number;
  message: string;
}> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get tenant's active lease assignment
    const assignmentResult = await client.query(
      `SELECT 
        tra.id,
        tra.tenant_id,
        tra.room_id,
        tra.start_date,
        tra.end_date,
        tra.monthly_rate,
        tra.billing_cycle_start_day,
        r.room_number,
        b.name as building_name
      FROM tenant_room_assignments tra
      INNER JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE tra.tenant_id = $1
        AND tra.assignment_status = 'active'
        AND (tra.end_date IS NULL OR tra.end_date >= CURRENT_DATE)
      ORDER BY tra.start_date DESC
      LIMIT 1`,
      [tenantId]
    );

    if (assignmentResult.rows.length === 0) {
      return {
        success: false,
        invoiceCreated: false,
        advanceApplied: false,
        message: 'No active lease assignment found for tenant'
      };
    }

    const assignment = assignmentResult.rows[0];
    const assignmentStart = new Date(assignment.start_date);
    const assignmentEnd = assignment.end_date
      ? new Date(assignment.end_date)
      : new Date(assignmentStart.getFullYear() + 1, assignmentStart.getMonth(), assignmentStart.getDate());
    const monthlyRent = parseFloat(assignment.monthly_rate);
    const rentDueDay = resolveRentDueDay({
      billingCycleStartDay:
        assignment.billing_cycle_start_day != null
          ? Number(assignment.billing_cycle_start_day)
          : null,
      startDate: assignment.start_date,
      fallbackDay: 5,
    });

    // Calculate next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1); // First day of next month

    // Check if invoice for next month already exists
    const existingInvoiceResult = await client.query(
      `SELECT i.id, i.invoice_number
       FROM invoices i
       INNER JOIN invoice_line_items ili ON i.id = ili.invoice_id
       WHERE i.tenant_id = $1
         AND ili.item_type = 'rent'
         AND DATE_TRUNC('month', i.billing_period_start) = DATE_TRUNC('month', $2::date)
         AND i.billing_period_start >= $2::date`,
      [tenantId, nextMonth]
    );

    if (existingInvoiceResult.rows.length > 0) {
      return {
        success: true,
        invoiceCreated: false,
        advanceApplied: false,
        message: `Invoice for ${nextMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })} already exists`
      };
    }

    // Check if next month is within lease period
    if (nextMonth > assignmentEnd || nextMonth < assignmentStart) {
      return {
        success: false,
        invoiceCreated: false,
        advanceApplied: false,
        message: `Next month is outside the lease period (${assignmentStart.toLocaleDateString()} - ${assignmentEnd.toLocaleDateString()})`
      };
    }

    // Generate invoice for next month only
    const dueDate = dueDateForBillingMonth(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      rentDueDay
    );

    const billingPeriodStart = new Date(nextMonth);
    const billingPeriodEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
    const { initialInvoiceStatusForIssueDate } = await import(
      '@/lib/services/invoice-issue-timing'
    );
    const invoiceStatus = initialInvoiceStatusForIssueDate(billingPeriodStart);

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create invoice — stays draft until the billing month's issue_date
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
        billingPeriodStart,
        dueDate,
        billingPeriodStart,
        billingPeriodEnd,
        monthlyRent,
        0, // No tax
        monthlyRent,
        0, // Not paid yet
        invoiceStatus,
        `Auto-generated rent invoice for ${assignment.building_name} - ${assignment.room_number}`
      ]
    );

    const invoiceId = invoiceResult.rows[0].id;

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
        `Monthly Rent - ${nextMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}`,
        1,
        monthlyRent,
        'rent'
      ]
    );

    await client.query('COMMIT');

    // Automatically apply available advance only once the invoice is issued
    let advanceApplied = false;
    let advanceAmount = 0;
    if (invoiceStatus === 'sent') {
      try {
        const advanceResult = await autoApplyAdvanceToUnpaidRentInvoices(tenantId);
        if (advanceResult.success && advanceResult.totalApplied > 0) {
          advanceApplied = true;
          advanceAmount = advanceResult.totalApplied;
        }
      } catch (advanceError) {
        console.warn('Could not auto-apply advance to newly created invoice:', advanceError);
      }
    }

    return {
      success: true,
      invoiceCreated: true,
      invoiceId,
      invoiceNumber,
      advanceApplied,
      advanceAmount: advanceApplied ? advanceAmount : undefined,
      message: `Successfully generated rent invoice for ${nextMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}${advanceApplied ? `. Applied ₱${advanceAmount.toFixed(2)} advance.` : ''}`
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating next month rent invoice:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Generate next month's rent invoices for all tenants with active leases
 * Can be called monthly via cron job or scheduled task
 */
export async function generateMonthlyRentInvoicesForAllTenants(): Promise<{
  success: boolean;
  totalTenants: number;
  invoicesCreated: number;
  advanceApplied: number;
  errors: Array<{ tenantId: string; error: string }>;
}> {
  const client = await pool.connect();
  
  try {
    // Get all tenants with active lease assignments
    const tenantsResult = await client.query(
      `SELECT DISTINCT tra.tenant_id
       FROM tenant_room_assignments tra
       WHERE tra.assignment_status = 'active'
         AND tra.assignment_end >= CURRENT_DATE
         AND tra.assignment_start <= (CURRENT_DATE + INTERVAL '1 month')`
    );

    const tenantIds = tenantsResult.rows.map(row => row.tenant_id);
    let invoicesCreated = 0;
    let advanceApplied = 0;
    const errors: Array<{ tenantId: string; error: string }> = [];

    for (const tenantId of tenantIds) {
      try {
        const result = await generateNextMonthRentInvoice(tenantId);
        if (result.invoiceCreated) {
          invoicesCreated++;
          if (result.advanceApplied) {
            advanceApplied++;
          }
        }
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
      invoicesCreated,
      advanceApplied,
      errors
    };

  } catch (error) {
    console.error('Error generating monthly rent invoices:', error);
    throw error;
  } finally {
    client.release();
  }
}
