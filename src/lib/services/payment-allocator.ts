/**
 * Payment Allocation Service
 * Automatically distributes payments across unpaid invoices
 * Handles excess payments as tenant credits
 */

import { Pool } from 'pg';
import { PaymentAllocationRequest, PaymentAllocationResult } from '@/types/financial';
import { getUnpaidInvoicesForTenant } from './invoice-generator';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Allocate a payment across unpaid invoices
 * Priority: Oldest invoices first (by due date)
 * Creates tenant credit for any excess amount
 */
export async function allocatePaymentToInvoices(
  request: PaymentAllocationRequest
): Promise<PaymentAllocationResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      paymentId,
      tenantId,
      paymentAmount,
      depositAmount = 0,
      useDeposit = false
    } = request;

    // Validate input
    if (!paymentId || !tenantId || !paymentAmount) {
      throw new Error('Missing required fields for payment allocation');
    }

    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    // Check if tenant exists
    const tenantCheck = await client.query(
      'SELECT id FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantCheck.rows.length === 0) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Handle deposit amount if provided
    let depositUsed = 0;
    if (depositAmount > 0) {
      await client.query(
        `INSERT INTO deposit_ledger (
          tenant_id,
          amount,
          transaction_type,
          payment_id,
          description,
          transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tenantId,
          depositAmount,
          'deposit',
          paymentId,
          'Deposit amount from payment',
          new Date()
        ]
      );
    }

    // Check if admin wants to use existing deposit
    let availableFromDeposit = 0;
    if (useDeposit) {
      const depositBalance = await getTenantDepositBalance(tenantId);
      availableFromDeposit = depositBalance;
    }

    // Get unpaid invoices (sorted by due date, oldest first)
    const unpaidInvoices = await getUnpaidInvoicesForTenant(tenantId);

    if (unpaidInvoices.length === 0) {
      // No unpaid invoices - create advance for entire amount
      await client.query(
        `INSERT INTO tenant_credits (
          tenant_id,
          amount,
          source,
          payment_id,
          description,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tenantId,
          paymentAmount,
          'excess_payment',
          paymentId,
          'No unpaid invoices - saved as advance',
          'available'
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        totalAllocated: 0,
        allocations: [],
        creditCreated: true,
        creditAmount: paymentAmount,
        depositUsed: 0,
        message: `No unpaid invoices found. ₱${paymentAmount.toFixed(2)} saved as tenant advance.`
      };
    }

    // Allocate payment to invoices
    let remainingAmount = paymentAmount;
    const allocations: PaymentAllocationResult['allocations'] = [];

    for (const invoice of unpaidInvoices) {
      if (remainingAmount <= 0) break;

      const amountToAllocate = Math.min(remainingAmount, invoice.balanceDue);

      // Create payment allocation record
      await client.query(
        `INSERT INTO payment_allocations (
          payment_id,
          invoice_id,
          allocated_amount,
          allocation_date,
          notes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          paymentId,
          invoice.id,
          amountToAllocate,
          new Date(),
          `Auto-allocated from payment`
        ]
      );

      // Update invoice amount_paid and status
      const newAmountPaid = invoice.amountPaid + amountToAllocate;
      const newBalanceDue = invoice.totalAmount - newAmountPaid;
      let newStatus = invoice.status;

      if (newBalanceDue <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partial';
      }

      await client.query(
        `UPDATE invoices 
         SET amount_paid = $1,
             invoice_status = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [newAmountPaid, newStatus, invoice.id]
      );

      allocations.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountAllocated: amountToAllocate,
        invoiceStatus: newStatus
      });

      remainingAmount -= amountToAllocate;
    }

    // If there's still money left after paying all invoices, create tenant credit
    let creditCreated = false;
    let creditAmount = 0;

    if (remainingAmount > 0) {
      await client.query(
        `INSERT INTO tenant_credits (
          tenant_id,
          amount,
          source,
          payment_id,
          description,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tenantId,
          remainingAmount,
          'excess_payment',
          paymentId,
          `Excess payment after allocating to ${allocations.length} invoice(s)`,
          'available'
        ]
      );

      creditCreated = true;
      creditAmount = remainingAmount;
    }

    // Update payment status to completed
    await client.query(
      `UPDATE payments 
       SET payment_status = 'paid',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [paymentId]
    );

    await client.query('COMMIT');

    const totalAllocated = paymentAmount - remainingAmount;

    return {
      success: true,
      totalAllocated,
      allocations,
      creditCreated,
      creditAmount,
      depositUsed,
      message: buildAllocationMessage(allocations, creditCreated, creditAmount)
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error allocating payment:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Apply tenant credit to an invoice
 */
export async function applyCreditToInvoice(
  tenantId: string,
  invoiceId: string,
  creditAmount?: number
): Promise<{
  success: boolean;
  amountApplied: number;
  remainingCredit: number;
  invoiceStatus: string;
  message: string;
}> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get tenant's available credit
    const creditBalance = await getTenantCreditBalance(tenantId);

    if (creditBalance <= 0) {
      throw new Error('No available credit for this tenant');
    }

    // Get invoice details
    const invoiceResult = await client.query(
      'SELECT id, invoice_number, total_amount, amount_paid, balance_due, invoice_status FROM invoices WHERE id = $1 AND tenant_id = $2',
      [invoiceId, tenantId]
    );

    if (invoiceResult.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.balance_due <= 0) {
      throw new Error('Invoice is already paid');
    }

    // Determine how much credit to apply
    const amountToApply = creditAmount 
      ? Math.min(creditAmount, creditBalance, invoice.balance_due)
      : Math.min(creditBalance, invoice.balance_due);

    // Get available credit records
    const creditsResult = await client.query(
      `SELECT id, amount FROM tenant_credits 
       WHERE tenant_id = $1 AND status = 'available'
       ORDER BY created_at ASC`,
      [tenantId]
    );

    let remainingToApply = amountToApply;
    const creditsToUpdate: string[] = [];

    for (const credit of creditsResult.rows) {
      if (remainingToApply <= 0) break;

      const creditToUse = Math.min(remainingToApply, parseFloat(credit.amount));
      
      // Mark credit as applied
      await client.query(
        `UPDATE tenant_credits 
         SET status = 'applied',
             applied_to_invoice_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [invoiceId, credit.id]
      );

      creditsToUpdate.push(credit.id);
      remainingToApply -= creditToUse;
    }

    // Update invoice
    const newAmountPaid = parseFloat(invoice.amount_paid) + amountToApply;
    const newBalanceDue = parseFloat(invoice.total_amount) - newAmountPaid;
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial';

    await client.query(
      `UPDATE invoices 
       SET amount_paid = $1,
           invoice_status = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newAmountPaid, newStatus, invoiceId]
    );

    await client.query('COMMIT');

    const remainingCredit = creditBalance - amountToApply;

    return {
      success: true,
      amountApplied: amountToApply,
      remainingCredit,
      invoiceStatus: newStatus,
      message: `Applied ₱${amountToApply.toFixed(2)} credit to invoice ${invoice.invoice_number}. Remaining credit: ₱${remainingCredit.toFixed(2)}`
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying credit to invoice:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Apply deposit to an invoice (admin only)
 */
export async function applyDepositToInvoice(
  tenantId: string,
  invoiceId: string,
  depositAmount: number,
  adminUserId: string
): Promise<{
  success: boolean;
  amountApplied: number;
  remainingDeposit: number;
  invoiceStatus: string;
  message: string;
}> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get tenant's deposit balance
    const depositBalance = await getTenantDepositBalance(tenantId);

    if (depositBalance <= 0) {
      throw new Error('No deposit balance available for this tenant');
    }

    if (depositAmount > depositBalance) {
      throw new Error(`Insufficient deposit balance. Available: ₱${depositBalance.toFixed(2)}`);
    }

    // Get invoice details
    const invoiceResult = await client.query(
      'SELECT id, invoice_number, total_amount, amount_paid, balance_due FROM invoices WHERE id = $1 AND tenant_id = $2',
      [invoiceId, tenantId]
    );

    if (invoiceResult.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.balance_due <= 0) {
      throw new Error('Invoice is already paid');
    }

    const amountToApply = Math.min(depositAmount, invoice.balance_due);

    // Record deposit application
    await client.query(
      `INSERT INTO deposit_ledger (
        tenant_id,
        amount,
        transaction_type,
        applied_to_invoice_id,
        description,
        transaction_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tenantId,
        amountToApply,
        'applied',
        invoiceId,
        `Deposit applied to invoice ${invoice.invoice_number}`,
        new Date(),
        adminUserId
      ]
    );

    // Update invoice
    const newAmountPaid = parseFloat(invoice.amount_paid) + amountToApply;
    const newBalanceDue = parseFloat(invoice.total_amount) - newAmountPaid;
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial';

    await client.query(
      `UPDATE invoices 
       SET amount_paid = $1,
           invoice_status = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newAmountPaid, newStatus, invoiceId]
    );

    await client.query('COMMIT');

    const remainingDeposit = depositBalance - amountToApply;

    return {
      success: true,
      amountApplied: amountToApply,
      remainingDeposit,
      invoiceStatus: newStatus,
      message: `Applied ₱${amountToApply.toFixed(2)} deposit to invoice ${invoice.invoice_number}. Remaining deposit: ₱${remainingDeposit.toFixed(2)}`
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying deposit to invoice:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get tenant's current credit balance
 */
export async function getTenantCreditBalance(tenantId: string): Promise<number> {
  try {
    const result = await pool.query(
      'SELECT get_tenant_credit_balance($1) as balance',
      [tenantId]
    );
    return parseFloat(result.rows[0].balance) || 0;
  } catch (error) {
    console.error('Error getting tenant credit balance:', error);
    return 0;
  }
}

/**
 * Get tenant's current deposit balance
 */
export async function getTenantDepositBalance(tenantId: string): Promise<number> {
  try {
    const result = await pool.query(
      'SELECT get_tenant_deposit_balance($1) as balance',
      [tenantId]
    );
    return parseFloat(result.rows[0].balance) || 0;
  } catch (error) {
    console.error('Error getting tenant deposit balance:', error);
    return 0;
  }
}

/**
 * Build a user-friendly message about the allocation result
 */
function buildAllocationMessage(
  allocations: PaymentAllocationResult['allocations'],
  creditCreated: boolean,
  creditAmount: number
): string {
  let message = `Payment allocated to ${allocations.length} invoice(s): `;
  
  message += allocations
    .map(a => `₱${a.amountAllocated.toFixed(2)} to ${a.invoiceNumber}`)
    .join(', ');

  if (creditCreated) {
    message += `. Excess ₱${creditAmount.toFixed(2)} saved as tenant credit.`;
  }

  return message;
}

/**
 * Auto-apply existing credits to a new invoice
 */
export async function autoApplyCreditsToNewInvoice(
  tenantId: string,
  invoiceId: string
): Promise<boolean> {
  try {
    const creditBalance = await getTenantCreditBalance(tenantId);
    
    if (creditBalance > 0) {
      await applyCreditToInvoice(tenantId, invoiceId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error auto-applying credits:', error);
    return false;
  }
}

