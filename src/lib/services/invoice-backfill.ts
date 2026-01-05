/**
 * Invoice Backfill Service
 * One-time demo backfill to generate rent invoices for tenants with active leases
 * but no existing rent invoices. Applies existing payments and advance balances.
 * 
 * NOTE: This is a temporary one-time operation for demo purposes only.
 * Moving forward, invoices are only generated when tenants are assigned.
 */

import { Pool } from 'pg';
import { generateInvoicesForTenant } from './invoice-generator';
import { autoApplyAdvanceToUnpaidRentInvoices, allocatePaymentToInvoices } from './payment-allocator';
import { getUnpaidRentInvoicesForTenant } from './invoice-generator';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface BackfillResult {
  tenantId: string;
  tenantName: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  success: boolean;
  invoicesCreated: number;
  paymentsApplied: number;
  advanceApplied: number;
  error?: string;
}

/**
 * Find all tenants with active leases but no existing rent invoices
 */
export async function findTenantsNeedingBackfill(): Promise<Array<{
  tenantId: string;
  tenantName: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  monthlyRent: number;
}>> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT
        tra.tenant_id,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        tra.room_id,
        r.room_number,
        b.name as building_name,
        tra.assignment_start as lease_start_date,
        tra.assignment_end as lease_end_date,
        tra.monthly_rate as monthly_rent
      FROM tenant_room_assignments tra
      INNER JOIN tenants t ON tra.tenant_id = t.id
      INNER JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE tra.assignment_status = 'active'
        AND tra.assignment_end >= CURRENT_DATE
        AND tra.assignment_start <= CURRENT_DATE
        AND NOT EXISTS (
          SELECT 1
          FROM invoices i
          INNER JOIN invoice_line_items ili ON i.id = ili.invoice_id
          WHERE i.tenant_id = tra.tenant_id
            AND ili.item_type = 'rent'
        )
      ORDER BY tra.assignment_start ASC`
    );

    return result.rows.map(row => ({
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      roomId: row.room_id,
      roomNumber: row.room_number,
      buildingName: row.building_name,
      leaseStartDate: row.lease_start_date,
      leaseEndDate: row.lease_end_date,
      monthlyRent: parseFloat(row.monthly_rent)
    }));
  } catch (error) {
    console.error('Error finding tenants needing backfill:', error);
    throw error;
  }
}

/**
 * Get all payments for a tenant that haven't been allocated to invoices
 */
async function getUnallocatedPayments(tenantId: string): Promise<Array<{
  id: string;
  amount: number;
  paymentDate: Date;
  paymentType: string;
}>> {
  try {
    const result = await pool.query(
      `SELECT 
        p.id,
        p.amount,
        p.payment_date,
        p.payment_type,
        COALESCE(SUM(pa.allocated_amount), 0) as allocated_amount
      FROM payments p
      LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
      WHERE p.tenant_id = $1
        AND p.payment_status = 'completed'
        AND p.payment_type IN ('rent', 'advance')
      GROUP BY p.id, p.amount, p.payment_date, p.payment_type
      HAVING COALESCE(SUM(pa.allocated_amount), 0) < p.amount
      ORDER BY p.payment_date ASC`,
      [tenantId]
    );

    return result.rows.map(row => ({
      id: row.id,
      amount: parseFloat(row.amount) - parseFloat(row.allocated_amount || 0),
      paymentDate: row.payment_date,
      paymentType: row.payment_type
    }));
  } catch (error) {
    console.error('Error getting unallocated payments:', error);
    return [];
  }
}

/**
 * Backfill rent invoices for a single tenant
 */
export async function backfillInvoicesForTenant(
  tenantId: string,
  tenantName: string,
  roomId: string,
  roomNumber: string,
  buildingName: string,
  leaseStartDate: Date,
  leaseEndDate: Date,
  monthlyRent: number
): Promise<BackfillResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Generate rent invoices for the lease period
    // Allow retroactive generation for backfill only (skipExistingCheck = true, allowRetroactive = true)
    const invoiceResult = await generateInvoicesForTenant({
      tenantId,
      roomId,
      leaseStartDate,
      leaseEndDate,
      monthlyRent,
      depositAmount: undefined, // Deposits are never invoiced
      advanceAmount: undefined  // Advance is handled separately
    }, {
      allowRetroactive: true,  // Allow backfilling invoices for existing leases
      skipExistingCheck: true  // Skip the check that prevents retroactive invoices
    });

    if (!invoiceResult.success || invoiceResult.invoicesCreated === 0) {
      await client.query('ROLLBACK');
      return {
        tenantId,
        tenantName,
        roomId,
        roomNumber,
        buildingName,
        success: false,
        invoicesCreated: 0,
        paymentsApplied: 0,
        advanceApplied: 0,
        error: 'Failed to generate invoices'
      };
    }

    // Get unallocated payments for this tenant
    const unallocatedPayments = await getUnallocatedPayments(tenantId);
    
    // Apply payments to invoices (oldest first)
    let paymentsApplied = 0;
    for (const payment of unallocatedPayments) {
      if (payment.paymentType === 'rent') {
        // Only apply rent payments to invoices (advance is handled separately)
        try {
          const allocationResult = await allocatePaymentToInvoices({
            paymentId: payment.id,
            tenantId,
            paymentAmount: payment.amount,
            depositAmount: 0,
            useDeposit: false
          });
          
          if (allocationResult.success) {
            paymentsApplied += allocationResult.allocations.length;
          }
        } catch (error) {
          console.warn(`Could not apply payment ${payment.id} to invoices:`, error);
        }
      }
    }

    // Apply available advance to unpaid rent invoices (cascading forward)
    let advanceApplied = 0;
    try {
      const advanceResult = await autoApplyAdvanceToUnpaidRentInvoices(tenantId);
      if (advanceResult.success && advanceResult.totalApplied > 0) {
        advanceApplied = advanceResult.invoicesUpdated;
      }
    } catch (error) {
      console.warn(`Could not apply advance for tenant ${tenantId}:`, error);
    }

    await client.query('COMMIT');

    return {
      tenantId,
      tenantName,
      roomId,
      roomNumber,
      buildingName,
      success: true,
      invoicesCreated: invoiceResult.invoicesCreated,
      paymentsApplied,
      advanceApplied
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error backfilling invoices for tenant ${tenantId}:`, error);
    return {
      tenantId,
      tenantName,
      roomId,
      roomNumber,
      buildingName,
      success: false,
      invoicesCreated: 0,
      paymentsApplied: 0,
      advanceApplied: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    client.release();
  }
}

/**
 * Backfill rent invoices for all tenants with active leases but no invoices
 * This is a one-time demo operation
 */
export async function backfillInvoicesForAllTenants(): Promise<{
  success: boolean;
  totalTenants: number;
  successful: number;
  failed: number;
  results: BackfillResult[];
}> {
  try {
    // Find all tenants needing backfill
    const tenantsNeedingBackfill = await findTenantsNeedingBackfill();
    
    if (tenantsNeedingBackfill.length === 0) {
      return {
        success: true,
        totalTenants: 0,
        successful: 0,
        failed: 0,
        results: []
      };
    }

    const results: BackfillResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process each tenant
    for (const tenant of tenantsNeedingBackfill) {
      const result = await backfillInvoicesForTenant(
        tenant.tenantId,
        tenant.tenantName,
        tenant.roomId,
        tenant.roomNumber,
        tenant.buildingName,
        tenant.leaseStartDate,
        tenant.leaseEndDate,
        tenant.monthlyRent
      );

      results.push(result);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      success: true,
      totalTenants: tenantsNeedingBackfill.length,
      successful,
      failed,
      results
    };

  } catch (error) {
    console.error('Error in backfill operation:', error);
    throw error;
  }
}
