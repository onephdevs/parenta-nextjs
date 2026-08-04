/**
 * Payment Allocation Service
 * Automatically distributes payments across unpaid invoices
 * Handles excess payments as tenant credits
 */

import pool from '@/lib/db';
import type { PoolClient } from 'pg';
import { PaymentAllocationRequest, PaymentAllocationResult } from '@/types/financial';
import { getUnpaidInvoicesForTenant, getUnpaidRentInvoicesForTenant } from './invoice-generator';
import {
  getTenantCreditBalance as getCreditBalanceFromApi,
} from '@/lib/api/tenant-credits';
import { getTenantDepositBalance as getDepositBalanceFromApi } from '@/lib/api/deposit-ledger';

/**
 * Allocate a payment across unpaid invoices
 * Priority: Oldest invoices first (by due date)
 * Creates tenant credit for any excess amount
 *
 * Pass `externalClient` to join an outer transaction (caller owns BEGIN/COMMIT).
 */
export async function allocatePaymentToInvoices(
  request: PaymentAllocationRequest,
  externalClient?: PoolClient
): Promise<PaymentAllocationResult> {
  const ownsClient = !externalClient;
  const client = externalClient ?? (await pool.connect());
  
  try {
    if (ownsClient) {
      await client.query('BEGIN');
    }
    
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
    // Prioritize rent invoices, but include all invoice types for manual payments
    // Note: Advance only applies to rent invoices, but manual payments can apply to any invoice
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

    if (ownsClient) {
      await client.query('COMMIT');
    }

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
    if (ownsClient) {
      await client.query('ROLLBACK');
    }
    console.error('Error allocating payment:', error);
    throw error;
  } finally {
    if (ownsClient) {
      client.release();
    }
  }
}

/**
 * Apply tenant credit (advance) to a RENT invoice only
 * Advance must only apply to rent invoices, never to deposits, fees, damages, or other types
 */
export async function applyCreditToRentInvoice(
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

    // Get tenant's available credit (advance)
    const creditBalance = await getTenantCreditBalance(tenantId);

    if (creditBalance <= 0) {
      return {
        success: false,
        amountApplied: 0,
        remainingCredit: 0,
        invoiceStatus: '',
        message: 'No available advance for this tenant'
      };
    }

    // Get invoice details and verify it's a rent invoice
    const invoiceResult = await client.query(
      `SELECT i.id, i.invoice_number, i.total_amount, i.amount_paid, i.balance_due, i.invoice_status,
              COUNT(CASE WHEN ili.item_type = 'rent' THEN 1 END) as rent_items_count,
              COUNT(ili.id) as total_items_count
       FROM invoices i
       LEFT JOIN invoice_line_items ili ON i.id = ili.invoice_id
       WHERE i.id = $1 AND i.tenant_id = $2
       GROUP BY i.id, i.invoice_number, i.total_amount, i.amount_paid, i.balance_due, i.invoice_status`,
      [invoiceId, tenantId]
    );

    if (invoiceResult.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceResult.rows[0];

    // Verify this is a rent invoice - advance only applies to rent invoices
    if (invoice.rent_items_count === 0 || invoice.total_items_count === 0) {
      return {
        success: false,
        amountApplied: 0,
        remainingCredit: creditBalance,
        invoiceStatus: invoice.invoice_status,
        message: 'Advance can only be applied to rent invoices'
      };
    }

    if (invoice.balance_due <= 0) {
      return {
        success: false,
        amountApplied: 0,
        remainingCredit: creditBalance,
        invoiceStatus: invoice.invoice_status,
        message: 'Invoice is already paid'
      };
    }

    // Determine how much credit to apply
    const amountToApply = creditAmount 
      ? Math.min(creditAmount, creditBalance, invoice.balance_due)
      : Math.min(creditBalance, invoice.balance_due);

    // Get available credit records
    const creditsResult = await client.query(
      `SELECT id, amount, description, source, payment_id FROM tenant_credits 
       WHERE tenant_id = $1 AND status = 'available'
       ORDER BY created_at ASC`,
      [tenantId]
    );

    let remainingToApply = amountToApply;

    for (const credit of creditsResult.rows) {
      if (remainingToApply <= 0) break;

      const creditAmountAvailable = parseFloat(credit.amount);
      const creditToUse = Math.min(remainingToApply, creditAmountAvailable);
      const leftover = Number((creditAmountAvailable - creditToUse).toFixed(2));

      if (leftover > 0) {
        // Partial use: shrink this row to the applied portion, keep leftover available
        await client.query(
          `UPDATE tenant_credits
           SET amount = $1,
               status = 'applied',
               applied_to_invoice_id = $2,
               description = COALESCE(description, 'Advance') || $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [
            creditToUse,
            invoiceId,
            ` — applied to invoice ${invoice.invoice_number}`,
            credit.id,
          ]
        );
        await client.query(
          `INSERT INTO tenant_credits (
             tenant_id, amount, source, description, payment_id, status
           ) VALUES ($1, $2, $3, $4, $5, 'available')`,
          [
            tenantId,
            leftover,
            credit.source || 'manual',
            `Unused advance balance (from ₱${creditAmountAvailable.toFixed(2)} prepaid rent)`,
            credit.payment_id || null,
          ]
        );
      } else {
        await client.query(
          `UPDATE tenant_credits 
           SET status = 'applied',
               applied_to_invoice_id = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [invoiceId, credit.id]
        );
      }

      remainingToApply = Number((remainingToApply - creditToUse).toFixed(2));
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
      message: `Applied ₱${amountToApply.toFixed(2)} advance to rent invoice ${invoice.invoice_number}. Remaining advance: ₱${remainingCredit.toFixed(2)}`
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying advance to rent invoice:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Apply tenant credit to an invoice (legacy function - use applyCreditToRentInvoice for rent invoices)
 * This function applies credit to any invoice type - use with caution
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
  // For rent invoices, use the specialized function
  // For other invoice types, this function can be used but advance should only apply to rent
  return applyCreditToRentInvoice(tenantId, invoiceId, creditAmount);
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
 * Get tenant's current credit balance (delegates to tenant-credits API module)
 */
export async function getTenantCreditBalance(tenantId: string): Promise<number> {
  return getCreditBalanceFromApi(tenantId);
}

/**
 * Get tenant's current deposit balance (delegates to deposit-ledger API module)
 */
export async function getTenantDepositBalance(tenantId: string): Promise<number> {
  return getDepositBalanceFromApi(tenantId);
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
 * Auto-apply existing advance (credits) to a new RENT invoice
 * Advance only applies to rent invoices, cascading forward until exhausted
 */
export async function autoApplyCreditsToNewInvoice(
  tenantId: string,
  invoiceId: string
): Promise<boolean> {
  try {
    const result = await applyCreditToRentInvoice(tenantId, invoiceId);
    return result.success;
  } catch (error) {
    console.error('Error auto-applying advance to invoice:', error);
    return false;
  }
}

/**
 * Auto-apply available advance to all unpaid rent invoices (oldest first)
 * Cascades forward until advance balance is exhausted
 */
export async function autoApplyAdvanceToUnpaidRentInvoices(
  tenantId: string
): Promise<{
  success: boolean;
  invoicesUpdated: number;
  totalApplied: number;
  remainingAdvance: number;
}> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get available advance balance
    const advanceBalance = await getTenantCreditBalance(tenantId);
    
    if (advanceBalance <= 0) {
      return {
        success: true,
        invoicesUpdated: 0,
        totalApplied: 0,
        remainingAdvance: 0
      };
    }

    // Get unpaid rent invoices only (oldest first)
    const unpaidRentInvoices = await getUnpaidRentInvoicesForTenant(tenantId);
    
    if (unpaidRentInvoices.length === 0) {
      return {
        success: true,
        invoicesUpdated: 0,
        totalApplied: 0,
        remainingAdvance: advanceBalance
      };
    }

    let remainingAdvance = advanceBalance;
    let invoicesUpdated = 0;
    let totalApplied = 0;

    // Apply advance to each unpaid rent invoice (oldest first) until exhausted
    for (const invoice of unpaidRentInvoices) {
      if (remainingAdvance <= 0) break;

      const amountToApply = Math.min(remainingAdvance, parseFloat(invoice.balance_due));
      
      if (amountToApply > 0) {
        const result = await applyCreditToRentInvoice(tenantId, invoice.id, amountToApply);
        if (result.success) {
          remainingAdvance -= result.amountApplied;
          totalApplied += result.amountApplied;
          invoicesUpdated++;
        }
      }
    }

    await client.query('COMMIT');

    return {
      success: true,
      invoicesUpdated,
      totalApplied,
      remainingAdvance
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error auto-applying advance to unpaid rent invoices:', error);
    throw error;
  } finally {
    client.release();
  }
}

