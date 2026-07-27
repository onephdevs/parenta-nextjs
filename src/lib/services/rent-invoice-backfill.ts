/**
 * Rent Invoice Backfill Service
 * One-time demo backfill to generate rent invoices for tenants with active leases but no existing rent invoices
 */

import pool from '@/lib/db';
import { generateInvoicesForTenant } from './invoice-generator';
import { autoApplyAdvanceToUnpaidRentInvoices } from './payment-allocator';
import { recalculateAllInvoiceStatusesForTenant } from './invoice-status-recalculator';

export interface BackfillResult {
  tenantId: string;
  tenantName: string;
  assignmentId: string;
  roomNumber: string;
  buildingName: string;
  invoicesCreated: number;
  paymentsApplied: number;
  advanceApplied: number;
  statusesUpdated: number;
  success: boolean;
  error?: string;
}

export interface BackfillSummary {
  success: boolean;
  totalTenantsProcessed: number;
  totalInvoicesCreated: number;
  totalPaymentsApplied: number;
  totalAdvanceApplied: number;
  totalStatusesUpdated: number;
  results: BackfillResult[];
  errors: Array<{ tenantId: string; error: string }>;
}

/**
 * Identify tenants with active assignments but no rent invoices
 */
export async function identifyTenantsNeedingBackfill(): Promise<Array<{
  tenantId: string;
  assignmentId: string;
  startDate: Date;
  endDate: Date | null;
  monthlyRate: number;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  tenantName: string;
}>> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT DISTINCT
        tra.tenant_id,
        tra.id as assignment_id,
        tra.start_date,
        tra.end_date,
        tra.monthly_rate,
        r.id as room_id,
        r.room_number,
        b.name as building_name,
        t.first_name || ' ' || t.last_name as tenant_name
      FROM tenant_room_assignments tra
      JOIN tenants t ON tra.tenant_id = t.id
      JOIN rooms r ON tra.room_id = r.id
      JOIN buildings b ON r.building_id = b.id
      WHERE tra.assignment_status = 'active'
        AND (tra.end_date IS NULL OR tra.end_date >= CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1
          FROM invoices i
          JOIN invoice_line_items ili ON i.id = ili.invoice_id
          WHERE i.tenant_id = tra.tenant_id
            AND ili.item_type = 'rent'
        )
      ORDER BY tra.start_date ASC`
    );

    return result.rows.map(row => ({
      tenantId: row.tenant_id,
      assignmentId: row.assignment_id,
      startDate: row.start_date,
      endDate: row.end_date,
      monthlyRate: parseFloat(row.monthly_rate),
      roomId: row.room_id,
      roomNumber: row.room_number,
      buildingName: row.building_name,
      tenantName: row.tenant_name
    }));
  } catch (error) {
    console.error('Error identifying tenants needing backfill:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get existing payments for a tenant that haven't been allocated to invoices
 * This helps us understand what payments need to be applied after invoice generation
 */
async function getUnallocatedPaymentsForTenant(tenantId: string): Promise<Array<{
  paymentId: string;
  amount: number;
  paymentDate: Date;
  paymentType: string;
}>> {
  const client = await pool.connect();
  
  try {
    // Get payments that haven't been fully allocated to invoices
    const result = await client.query(
      `SELECT 
        p.id as payment_id,
        p.amount,
        p.payment_date,
        p.payment_type,
        COALESCE(SUM(pa.allocated_amount), 0) as allocated_amount
      FROM payments p
      LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
      WHERE p.tenant_id = $1
        AND p.payment_status = 'paid'
        AND p.payment_type != 'deposit'
      GROUP BY p.id, p.amount, p.payment_date, p.payment_type
      HAVING p.amount > COALESCE(SUM(pa.allocated_amount), 0)
      ORDER BY p.payment_date ASC`,
      [tenantId]
    );

    return result.rows.map(row => ({
      paymentId: row.payment_id,
      amount: parseFloat(row.amount) - parseFloat(row.allocated_amount || 0),
      paymentDate: row.payment_date,
      paymentType: row.payment_type
    }));
  } catch (error) {
    console.error('Error getting unallocated payments:', error);
    return [];
  } finally {
    client.release();
  }
}

/**
 * Backfill rent invoices for all tenants with active leases but no rent invoices
 */
export async function backfillRentInvoicesForActiveTenants(): Promise<BackfillSummary> {
  const client = await pool.connect();
  
  const summary: BackfillSummary = {
    success: true,
    totalTenantsProcessed: 0,
    totalInvoicesCreated: 0,
    totalPaymentsApplied: 0,
    totalAdvanceApplied: 0,
    totalStatusesUpdated: 0,
    results: [],
    errors: []
  };

  try {
    // Identify tenants needing backfill
    const tenantsNeedingBackfill = await identifyTenantsNeedingBackfill();
    
    summary.totalTenantsProcessed = tenantsNeedingBackfill.length;

    if (tenantsNeedingBackfill.length === 0) {
      return summary;
    }

    // Process each tenant
    for (const tenant of tenantsNeedingBackfill) {
      const result: BackfillResult = {
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        assignmentId: tenant.assignmentId,
        roomNumber: tenant.roomNumber,
        buildingName: tenant.buildingName,
        invoicesCreated: 0,
        paymentsApplied: 0,
        advanceApplied: 0,
        statusesUpdated: 0,
        success: false
      };

      try {
        // Determine end date for invoice generation
        // Use end_date if available, otherwise use current date + 1 year as default
        const invoiceEndDate = tenant.endDate || new Date();
        if (!tenant.endDate) {
          // If no end date, generate invoices for 12 months from start date
          invoiceEndDate.setFullYear(invoiceEndDate.getFullYear() + 1);
        }

        // Generate rent invoices for the lease period
        const invoiceResult = await generateInvoicesForTenant({
          tenantId: tenant.tenantId,
          roomId: tenant.roomId,
          leaseStartDate: tenant.startDate,
          leaseEndDate: invoiceEndDate,
          monthlyRent: tenant.monthlyRate,
          depositAmount: undefined, // Deposits are not invoiced
          advanceAmount: undefined // Advance will be applied from existing credits
        });

        result.invoicesCreated = invoiceResult.invoicesCreated;
        summary.totalInvoicesCreated += invoiceResult.invoicesCreated;

        // Get unallocated payments before applying them
        const unallocatedPayments = await getUnallocatedPaymentsForTenant(tenant.tenantId);
        
        // Apply existing payments to invoices
        // Note: We need to allocate payments that haven't been allocated yet
        // The payment-allocator service handles this, but we need to trigger it
        // For now, we'll rely on the recalculation to properly set amounts
        
        // Apply advance balances to rent invoices (oldest first)
        const advanceResult = await autoApplyAdvanceToUnpaidRentInvoices(tenant.tenantId);
        if (advanceResult.success) {
          result.advanceApplied = advanceResult.totalApplied;
          summary.totalAdvanceApplied += advanceResult.totalApplied;
        }

        // Recalculate invoice statuses based on payments and advance
        const statusResult = await recalculateAllInvoiceStatusesForTenant(tenant.tenantId);
        result.statusesUpdated = statusResult.invoicesUpdated;
        summary.totalStatusesUpdated += statusResult.invoicesUpdated;

        // Count payments that were applied (approximate - based on unallocated payments)
        result.paymentsApplied = unallocatedPayments.length;
        summary.totalPaymentsApplied += unallocatedPayments.length;

        result.success = true;
        summary.results.push(result);

      } catch (error) {
        result.success = false;
        result.error = error instanceof Error ? error.message : 'Unknown error';
        summary.errors.push({
          tenantId: tenant.tenantId,
          error: result.error
        });
        summary.results.push(result);
        console.error(`Error backfilling invoices for tenant ${tenant.tenantId}:`, error);
      }
    }

    return summary;

  } catch (error) {
    summary.success = false;
    console.error('Error in backfill process:', error);
    throw error;
  } finally {
    client.release();
  }
}
