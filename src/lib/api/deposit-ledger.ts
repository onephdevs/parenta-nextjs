/**
 * Deposit Ledger API
 * Handles all deposit transaction operations
 */

import pool from '@/lib/db';
import { DepositTransaction, DepositLedgerSummary, CreateDepositTransactionData } from '@/types/financial';

/**
 * Get all deposit transactions for a tenant
 */
export async function getTenantDepositTransactions(tenantId: string): Promise<DepositTransaction[]> {
  try {
    const result = await pool.query(
      `SELECT 
        dl.*,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        i.invoice_number,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
       FROM deposit_ledger dl
       LEFT JOIN tenants t ON dl.tenant_id = t.id
       LEFT JOIN invoices i ON dl.applied_to_invoice_id = i.id
       LEFT JOIN users u ON dl.created_by = u.id
       WHERE dl.tenant_id = $1
       ORDER BY dl.transaction_date DESC, dl.created_at DESC`,
      [tenantId]
    );

    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      amount: parseFloat(row.amount),
      transactionType: row.transaction_type,
      appliedToInvoiceId: row.applied_to_invoice_id,
      paymentId: row.payment_id,
      description: row.description,
      transactionDate: row.transaction_date,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tenantName: row.tenant_name,
      invoiceNumber: row.invoice_number,
      createdByName: row.created_by_name
    }));
  } catch (error) {
    console.error('Error getting deposit transactions:', error);
    throw error;
  }
}

/**
 * Get tenant deposit balance
 */
export async function getTenantDepositBalance(tenantId: string): Promise<number> {
  try {
    const result = await pool.query(
      'SELECT get_tenant_deposit_balance($1) as balance',
      [tenantId]
    );
    return parseFloat(result.rows[0].balance) || 0;
  } catch (error) {
    console.error('Error getting deposit balance:', error);
    return 0;
  }
}

/**
 * Get deposit summary for a tenant
 */
export async function getTenantDepositSummary(tenantId: string): Promise<DepositLedgerSummary> {
  try {
    const result = await pool.query(
      `SELECT 
        t.id as tenant_id,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        COALESCE(SUM(CASE WHEN dl.transaction_type = 'deposit' THEN dl.amount ELSE 0 END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN dl.transaction_type = 'refund' THEN dl.amount ELSE 0 END), 0) as total_refunds,
        COALESCE(SUM(CASE WHEN dl.transaction_type = 'applied' THEN dl.amount ELSE 0 END), 0) as total_applied,
        get_tenant_deposit_balance(t.id) as current_balance
       FROM tenants t
       LEFT JOIN deposit_ledger dl ON t.id = dl.tenant_id
       WHERE t.id = $1
       GROUP BY t.id, t.first_name, t.last_name`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    const row = result.rows[0];
    return {
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      totalDeposits: parseFloat(row.total_deposits),
      totalRefunds: parseFloat(row.total_refunds),
      totalApplied: parseFloat(row.total_applied),
      currentBalance: parseFloat(row.current_balance)
    };
  } catch (error) {
    console.error('Error getting deposit summary:', error);
    throw error;
  }
}

/**
 * Create a deposit transaction
 */
export async function createDepositTransaction(data: CreateDepositTransactionData): Promise<DepositTransaction> {
  try {
    const result = await pool.query(
      `INSERT INTO deposit_ledger (
        tenant_id,
        amount,
        transaction_type,
        applied_to_invoice_id,
        payment_id,
        description,
        transaction_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.tenantId,
        data.amount,
        data.transactionType,
        data.appliedToInvoiceId || null,
        data.paymentId || null,
        data.description || null,
        data.transactionDate || new Date()
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      amount: parseFloat(row.amount),
      transactionType: row.transaction_type,
      appliedToInvoiceId: row.applied_to_invoice_id,
      paymentId: row.payment_id,
      description: row.description,
      transactionDate: row.transaction_date,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error creating deposit transaction:', error);
    throw error;
  }
}

/**
 * Refund deposit to tenant (creates a negative transaction)
 */
export async function refundDeposit(
  tenantId: string,
  amount: number,
  description: string,
  adminUserId: string
): Promise<DepositTransaction> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check available deposit balance
    const balance = await getTenantDepositBalance(tenantId);

    if (balance < amount) {
      throw new Error(`Insufficient deposit balance. Available: ₱${balance.toFixed(2)}, Requested: ₱${amount.toFixed(2)}`);
    }

    // Create refund transaction
    const result = await client.query(
      `INSERT INTO deposit_ledger (
        tenant_id,
        amount,
        transaction_type,
        description,
        transaction_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        tenantId,
        amount,
        'refund',
        description || 'Deposit refund',
        new Date(),
        adminUserId
      ]
    );

    await client.query('COMMIT');

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      amount: parseFloat(row.amount),
      transactionType: row.transaction_type,
      appliedToInvoiceId: row.applied_to_invoice_id,
      paymentId: row.payment_id,
      description: row.description,
      transactionDate: row.transaction_date,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error refunding deposit:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Apply deposit to an invoice
 */
export async function applyDepositToInvoice(
  tenantId: string,
  invoiceId: string,
  amount: number,
  adminUserId: string
): Promise<{
  transaction: DepositTransaction;
  invoiceStatus: string;
  remainingBalance: number;
}> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check available deposit balance
    const balance = await getTenantDepositBalance(tenantId);

    if (balance < amount) {
      throw new Error(`Insufficient deposit balance. Available: ₱${balance.toFixed(2)}, Requested: ₱${amount.toFixed(2)}`);
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

    if (parseFloat(invoice.balance_due) <= 0) {
      throw new Error('Invoice is already paid');
    }

    const amountToApply = Math.min(amount, parseFloat(invoice.balance_due));

    // Create deposit application transaction
    const transactionResult = await client.query(
      `INSERT INTO deposit_ledger (
        tenant_id,
        amount,
        transaction_type,
        applied_to_invoice_id,
        description,
        transaction_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
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

    const row = transactionResult.rows[0];
    const remainingBalance = balance - amountToApply;

    return {
      transaction: {
        id: row.id,
        tenantId: row.tenant_id,
        amount: parseFloat(row.amount),
        transactionType: row.transaction_type,
        appliedToInvoiceId: row.applied_to_invoice_id,
        paymentId: row.payment_id,
        description: row.description,
        transactionDate: row.transaction_date,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      },
      invoiceStatus: newStatus,
      remainingBalance
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
 * Get all tenants with deposit balances
 */
export async function getAllTenantsWithDeposits(): Promise<DepositLedgerSummary[]> {
  try {
    const result = await pool.query(
      `SELECT 
        t.id as tenant_id,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        COALESCE(SUM(CASE WHEN dl.transaction_type = 'deposit' THEN dl.amount ELSE 0 END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN dl.transaction_type = 'refund' THEN dl.amount ELSE 0 END), 0) as total_refunds,
        COALESCE(SUM(CASE WHEN dl.transaction_type = 'applied' THEN dl.amount ELSE 0 END), 0) as total_applied,
        get_tenant_deposit_balance(t.id) as current_balance
       FROM tenants t
       LEFT JOIN deposit_ledger dl ON t.id = dl.tenant_id
       WHERE t.tenant_status = 'active'
       GROUP BY t.id, t.first_name, t.last_name
       HAVING get_tenant_deposit_balance(t.id) > 0
       ORDER BY current_balance DESC`
    );

    return result.rows.map(row => ({
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      totalDeposits: parseFloat(row.total_deposits),
      totalRefunds: parseFloat(row.total_refunds),
      totalApplied: parseFloat(row.total_applied),
      currentBalance: parseFloat(row.current_balance)
    }));
  } catch (error) {
    console.error('Error getting tenants with deposits:', error);
    throw error;
  }
}

/**
 * Get deposit transaction history for a tenant
 */
export async function getDepositTransactionHistory(
  tenantId: string,
  limit: number = 50
): Promise<DepositTransaction[]> {
  try {
    const result = await pool.query(
      `SELECT 
        dl.*,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        i.invoice_number,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
       FROM deposit_ledger dl
       LEFT JOIN tenants t ON dl.tenant_id = t.id
       LEFT JOIN invoices i ON dl.applied_to_invoice_id = i.id
       LEFT JOIN users u ON dl.created_by = u.id
       WHERE dl.tenant_id = $1
       ORDER BY dl.transaction_date DESC, dl.created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      amount: parseFloat(row.amount),
      transactionType: row.transaction_type,
      appliedToInvoiceId: row.applied_to_invoice_id,
      paymentId: row.payment_id,
      description: row.description,
      transactionDate: row.transaction_date,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tenantName: row.tenant_name,
      invoiceNumber: row.invoice_number,
      createdByName: row.created_by_name
    }));
  } catch (error) {
    console.error('Error getting deposit transaction history:', error);
    throw error;
  }
}

/**
 * Adjust deposit balance (admin only)
 */
export async function adjustDepositBalance(
  tenantId: string,
  amount: number,
  description: string,
  adminUserId: string,
  isIncrease: boolean
): Promise<DepositTransaction> {
  try {
    const actualAmount = isIncrease ? Math.abs(amount) : -Math.abs(amount);

    const result = await pool.query(
      `INSERT INTO deposit_ledger (
        tenant_id,
        amount,
        transaction_type,
        description,
        transaction_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        tenantId,
        actualAmount,
        'adjustment',
        description,
        new Date(),
        adminUserId
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      amount: parseFloat(row.amount),
      transactionType: row.transaction_type,
      appliedToInvoiceId: row.applied_to_invoice_id,
      paymentId: row.payment_id,
      description: row.description,
      transactionDate: row.transaction_date,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error adjusting deposit balance:', error);
    throw error;
  }
}

/**
 * Delete a deposit transaction (only if it hasn't been applied)
 */
export async function deleteDepositTransaction(
  transactionId: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM deposit_ledger 
       WHERE id = $1 
       AND transaction_type NOT IN ('applied', 'refund')
       AND applied_to_invoice_id IS NULL
       RETURNING id`,
      [transactionId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting deposit transaction:', error);
    throw error;
  }
}

