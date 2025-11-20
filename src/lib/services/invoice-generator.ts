/**
 * Invoice Generation Service
 * Automatically generates invoices for tenants based on lease terms
 */

import { Pool } from 'pg';
import { InvoiceGenerationRequest, InvoiceGenerationResult } from '@/types/financial';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Generate invoices for a tenant based on their lease period
 * Creates one invoice per month from lease start to lease end
 */
export async function generateInvoicesForTenant(
  request: InvoiceGenerationRequest
): Promise<InvoiceGenerationResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      tenantId,
      roomId,
      leaseStartDate,
      leaseEndDate,
      monthlyRent,
      depositAmount
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

    // Calculate number of months in lease
    const startDate = new Date(leaseStartDate);
    const endDate = new Date(leaseEndDate);
    
    const months: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    // Generate invoices for each month
    const invoiceIds: string[] = [];
    
    for (let i = 0; i < months.length; i++) {
      const invoiceMonth = months[i];
      const dueDate = new Date(invoiceMonth);
      dueDate.setDate(5); // Due on the 5th of each month
      
      // For the first month, if start date is after the 1st, prorate the rent
      let invoiceAmount = monthlyRent;
      let description = `Monthly Rent - ${invoiceMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
      
      if (i === 0 && startDate.getDate() > 1) {
        const daysInMonth = new Date(
          invoiceMonth.getFullYear(),
          invoiceMonth.getMonth() + 1,
          0
        ).getDate();
        const daysRemaining = daysInMonth - startDate.getDate() + 1;
        invoiceAmount = (monthlyRent / daysInMonth) * daysRemaining;
        description = `Prorated Rent - ${invoiceMonth.toLocaleString('default', { month: 'long', year: 'numeric' })} (${daysRemaining} days)`;
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${i}`;
      
      // Determine billing period
      const billingPeriodStart = i === 0 ? startDate : new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth(), 1);
      const billingPeriodEnd = new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth() + 1, 0);

      // Create invoice
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
          invoiceMonth,
          dueDate,
          billingPeriodStart,
          billingPeriodEnd,
          invoiceAmount,
          0, // No tax
          invoiceAmount,
          0, // Not paid yet
          'pending',
          `Auto-generated invoice for ${room.building_name} - ${room.room_number}`
        ]
      );

      const invoiceId = invoiceResult.rows[0].id;
      invoiceIds.push(invoiceId);

      // Create invoice line item
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

    await client.query('COMMIT');

    return {
      success: true,
      invoicesCreated: invoiceIds.length,
      invoiceIds,
      depositRecorded,
      depositAmount: depositRecorded ? depositAmount : undefined,
      message: `Successfully generated ${invoiceIds.length} invoice(s) for ${tenant.first_name} ${tenant.last_name}${depositRecorded ? ` and recorded deposit of ₱${depositAmount}` : ''}`
    };

  } catch (error) {
    await client.query('ROLLBACK');
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
        'pending',
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
 * Check for overdue invoices and update their status
 */
export async function updateOverdueInvoices(): Promise<number> {
  try {
    const result = await pool.query(
      `UPDATE invoices 
       SET invoice_status = 'overdue' 
       WHERE invoice_status IN ('pending', 'sent', 'partial') 
       AND due_date < CURRENT_DATE 
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
export async function getUnpaidInvoicesForTenant(tenantId: string): Promise<Array<{
  id: string;
  invoiceNumber: string;
  dueDate: Date;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
}>> {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        invoice_number,
        due_date,
        total_amount,
        amount_paid,
        balance_due,
        invoice_status as status
       FROM invoices
       WHERE tenant_id = $1 
       AND invoice_status IN ('pending', 'sent', 'partial', 'overdue')
       AND balance_due > 0
       ORDER BY due_date ASC`,
      [tenantId]
    );

    return result.rows.map(row => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      dueDate: row.due_date,
      totalAmount: parseFloat(row.total_amount),
      amountPaid: parseFloat(row.amount_paid),
      balanceDue: parseFloat(row.balance_due),
      status: row.status
    }));
  } catch (error) {
    console.error('Error getting unpaid invoices:', error);
    throw error;
  }
}

