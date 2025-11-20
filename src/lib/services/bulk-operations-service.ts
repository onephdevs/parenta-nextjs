/**
 * Bulk Operations Service
 * Handles bulk invoice generation, payment imports, and other batch operations
 */

import { Pool } from 'pg';
import pool from '../db';
import { generateInvoicesForTenant } from './invoice-generator';

interface BulkInvoiceResult {
  tenant_id: string;
  tenant_name: string;
  success: boolean;
  invoices_created: number;
  invoice_ids: string[];
  error?: string;
}

interface CSVPaymentRow {
  tenant_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  deposit_amount?: number;
}

interface BulkPaymentResult {
  row_number: number;
  tenant_id: string;
  success: boolean;
  payment_id?: string;
  error?: string;
}

/**
 * Generate monthly invoices for all active tenants
 */
export async function generateMonthlyInvoicesForAllTenants(
  month?: string, // Format: 'YYYY-MM', defaults to next month
  buildingId?: string,
  dbPool: Pool = pool
): Promise<{
  success: boolean;
  total_tenants: number;
  successful: number;
  failed: number;
  results: BulkInvoiceResult[];
}> {
  const client = await dbPool.connect();
  
  try {
    // Calculate target month
    const targetDate = month 
      ? new Date(month + '-01')
      : new Date(new Date().setMonth(new Date().getMonth() + 1));
    
    const targetMonth = targetDate.toISOString().slice(0, 7);
    
    // Get all active tenants with room assignments
    let query = `
      SELECT DISTINCT
        t.id as tenant_id,
        t.first_name || ' ' || t.last_name as tenant_name,
        tra.room_id,
        tra.lease_start_date,
        tra.lease_end_date,
        tra.monthly_rent
      FROM tenants t
      JOIN tenant_room_assignments tra ON tra.tenant_id = t.id
      WHERE t.status = 'active'
        AND tra.status = 'current'
        AND tra.lease_end_date >= CURRENT_DATE
    `;
    
    const params: any[] = [];
    if (buildingId) {
      query += ` AND tra.room_id IN (
        SELECT id FROM rooms WHERE building_id = $1
      )`;
      params.push(buildingId);
    }
    
    const tenantsResult = await client.query(query, params);
    const tenants = tenantsResult.rows;
    
    const results: BulkInvoiceResult[] = [];
    let successful = 0;
    let failed = 0;
    
    for (const tenant of tenants) {
      try {
        // Check if invoice for this month already exists
        const existingInvoice = await client.query(
          `SELECT id FROM invoices 
           WHERE tenant_id = $1 
           AND TO_CHAR(due_date, 'YYYY-MM') = $2
           LIMIT 1`,
          [tenant.tenant_id, targetMonth]
        );
        
        if (existingInvoice.rows.length > 0) {
          results.push({
            tenant_id: tenant.tenant_id,
            tenant_name: tenant.tenant_name,
            success: false,
            invoices_created: 0,
            invoice_ids: [],
            error: `Invoice for ${targetMonth} already exists`,
          });
          failed++;
          continue;
        }
        
        // Generate invoice number
        const invoiceNumberResult = await client.query(
          `SELECT 'INV-' || LPAD(CAST(COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1 AS TEXT), 6, '0') AS next_number
           FROM invoices WHERE invoice_number LIKE 'INV-%'`
        );
        const invoiceNumber = invoiceNumberResult.rows[0].next_number;
        
        // Calculate due date (first day of target month + 5 days)
        const dueDate = new Date(targetDate);
        dueDate.setDate(5);
        
        // Create the invoice
        const invoiceResult = await client.query(
          `INSERT INTO invoices (
            tenant_id, invoice_number, invoice_status, issue_date, due_date,
            total_amount, amount_paid, description
          ) VALUES ($1, $2, 'sent', CURRENT_DATE, $3, $4, 0, $5)
          RETURNING id`,
          [
            tenant.tenant_id,
            invoiceNumber,
            dueDate.toISOString().slice(0, 10),
            tenant.monthly_rent,
            `Monthly rent for ${targetMonth}`,
          ]
        );
        
        results.push({
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenant_name,
          success: true,
          invoices_created: 1,
          invoice_ids: [invoiceResult.rows[0].id],
        });
        successful++;
      } catch (error) {
        results.push({
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenant_name,
          success: false,
          invoices_created: 0,
          invoice_ids: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }
    
    return {
      success: failed === 0,
      total_tenants: tenants.length,
      successful,
      failed,
      results,
    };
  } finally {
    client.release();
  }
}

/**
 * Import payments from CSV data
 */
export async function importPaymentsFromCSV(
  csvData: CSVPaymentRow[],
  createdBy?: string,
  dbPool: Pool = pool
): Promise<{
  success: boolean;
  total_rows: number;
  successful: number;
  failed: number;
  results: BulkPaymentResult[];
}> {
  const client = await dbPool.connect();
  const results: BulkPaymentResult[] = [];
  let successful = 0;
  let failed = 0;
  
  try {
    await client.query('BEGIN');
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // +2 because of 0-index and header row
      
      try {
        // Validate tenant exists
        const tenantCheck = await client.query(
          'SELECT id FROM tenants WHERE id = $1',
          [row.tenant_id]
        );
        
        if (tenantCheck.rows.length === 0) {
          throw new Error(`Tenant ${row.tenant_id} not found`);
        }
        
        // Validate amount
        if (!row.amount || row.amount <= 0) {
          throw new Error('Invalid amount');
        }
        
        // Get tenant's room (for the payment record)
        const roomResult = await client.query(
          `SELECT room_id FROM tenant_room_assignments 
           WHERE tenant_id = $1 AND status = 'current'
           LIMIT 1`,
          [row.tenant_id]
        );
        
        if (roomResult.rows.length === 0) {
          throw new Error('Tenant has no active room assignment');
        }
        
        const roomId = roomResult.rows[0].room_id;
        
        // Create payment record
        const paymentAmount = row.deposit_amount 
          ? row.amount - row.deposit_amount 
          : row.amount;
        
        const paymentResult = await client.query(
          `INSERT INTO payments (
            tenant_id, room_id, amount, type, status,
            payment_date, due_date, payment_method, transaction_id, description
          ) VALUES ($1, $2, $3, 'rent', 'completed', $4, $4, $5, $6, $7)
          RETURNING id`,
          [
            row.tenant_id,
            roomId,
            paymentAmount,
            row.payment_date,
            row.payment_method || 'bank_transfer',
            row.reference_number || null,
            row.notes || 'Imported from CSV',
          ]
        );
        
        const paymentId = paymentResult.rows[0].id;
        
        // Handle deposit if provided
        if (row.deposit_amount && row.deposit_amount > 0) {
          await client.query(
            `INSERT INTO deposit_ledger (
              tenant_id, amount, transaction_type, description, payment_id
            ) VALUES ($1, $2, 'deposit', 'Imported from CSV', $3)`,
            [row.tenant_id, row.deposit_amount, paymentId]
          );
        }
        
        // Allocate payment to invoices (using the existing service)
        await client.query(
          `SELECT allocate_payment_to_invoices($1, $2)`,
          [paymentId, row.tenant_id]
        );
        
        results.push({
          row_number: rowNumber,
          tenant_id: row.tenant_id,
          success: true,
          payment_id: paymentId,
        });
        successful++;
      } catch (error) {
        results.push({
          row_number: rowNumber,
          tenant_id: row.tenant_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }
    
    await client.query('COMMIT');
    
    return {
      success: failed === 0,
      total_rows: csvData.length,
      successful,
      failed,
      results,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Bulk update tenant statuses
 */
export async function bulkUpdateTenantStatus(
  tenantIds: string[],
  newStatus: 'active' | 'inactive' | 'terminated',
  dbPool: Pool = pool
): Promise<{
  success: boolean;
  updated: number;
  failed: number;
}> {
  try {
    const result = await dbPool.query(
      `UPDATE tenants 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($2)
       RETURNING id`,
      [newStatus, tenantIds]
    );
    
    return {
      success: true,
      updated: result.rowCount || 0,
      failed: tenantIds.length - (result.rowCount || 0),
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Bulk send email notifications (placeholder for future integration)
 */
export async function bulkSendNotifications(
  recipientIds: string[],
  notificationType: 'payment_reminder' | 'lease_expiry' | 'invoice_sent',
  dbPool: Pool = pool
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
}> {
  // This is a placeholder for future email integration
  // For now, just log the notification intent
  console.log(`[BULK NOTIFICATION] Type: ${notificationType}, Recipients: ${recipientIds.length}`);
  
  return {
    success: true,
    sent: recipientIds.length,
    failed: 0,
  };
}

