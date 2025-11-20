/**
 * Tenant Credits API
 * Handles all tenant credit operations
 */

import { Pool } from 'pg';
import { TenantCredit, TenantCreditSummary, CreateTenantCreditData } from '@/types/financial';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Get all credits for a tenant
 */
export async function getTenantCredits(tenantId: string): Promise<TenantCredit[]> {
  try {
    const result = await pool.query(
      `SELECT 
        tc.*,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        i.invoice_number,
        p.reference_number as payment_reference
       FROM tenant_credits tc
       LEFT JOIN tenants t ON tc.tenant_id = t.id
       LEFT JOIN invoices i ON tc.applied_to_invoice_id = i.id
       LEFT JOIN payments p ON tc.payment_id = p.id
       WHERE tc.tenant_id = $1
       ORDER BY tc.created_at DESC`,
      [tenantId]
    );

    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      amount: parseFloat(row.amount),
      source: row.source,
      description: row.description,
      paymentId: row.payment_id,
      appliedToInvoiceId: row.applied_to_invoice_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tenantName: row.tenant_name,
      invoiceNumber: row.invoice_number,
      paymentReference: row.payment_reference
    }));
  } catch (error) {
    console.error('Error getting tenant credits:', error);
    throw error;
  }
}

/**
 * Get tenant credit balance
 */
export async function getTenantCreditBalance(tenantId: string): Promise<number> {
  try {
    const result = await pool.query(
      'SELECT get_tenant_credit_balance($1) as balance',
      [tenantId]
    );
    return parseFloat(result.rows[0].balance) || 0;
  } catch (error) {
    console.error('Error getting credit balance:', error);
    return 0;
  }
}

/**
 * Get credit summary for a tenant
 */
export async function getTenantCreditSummary(tenantId: string): Promise<TenantCreditSummary> {
  try {
    const result = await pool.query(
      `SELECT 
        t.id as tenant_id,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        COALESCE(SUM(tc.amount), 0) as total_credits,
        COALESCE(SUM(CASE WHEN tc.status = 'available' THEN tc.amount ELSE 0 END), 0) as available_credits,
        COALESCE(SUM(CASE WHEN tc.status = 'applied' THEN tc.amount ELSE 0 END), 0) as applied_credits,
        COALESCE(SUM(CASE WHEN tc.status = 'refunded' THEN tc.amount ELSE 0 END), 0) as refunded_credits
       FROM tenants t
       LEFT JOIN tenant_credits tc ON t.id = tc.tenant_id
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
      totalCredits: parseFloat(row.total_credits),
      availableCredits: parseFloat(row.available_credits),
      appliedCredits: parseFloat(row.applied_credits),
      refundedCredits: parseFloat(row.refunded_credits)
    };
  } catch (error) {
    console.error('Error getting credit summary:', error);
    throw error;
  }
}

/**
 * Create a new tenant credit
 */
export async function createTenantCredit(data: CreateTenantCreditData): Promise<TenantCredit> {
  try {
    const result = await pool.query(
      `INSERT INTO tenant_credits (
        tenant_id,
        amount,
        source,
        description,
        payment_id,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        data.tenantId,
        data.amount,
        data.source,
        data.description || null,
        data.paymentId || null,
        'available'
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      amount: parseFloat(row.amount),
      source: row.source,
      description: row.description,
      paymentId: row.payment_id,
      appliedToInvoiceId: row.applied_to_invoice_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error creating tenant credit:', error);
    throw error;
  }
}

/**
 * Update tenant credit status
 */
export async function updateTenantCreditStatus(
  creditId: string,
  status: 'available' | 'applied' | 'refunded',
  appliedToInvoiceId?: string
): Promise<TenantCredit> {
  try {
    const result = await pool.query(
      `UPDATE tenant_credits 
       SET status = $1,
           applied_to_invoice_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, appliedToInvoiceId || null, creditId]
    );

    if (result.rows.length === 0) {
      throw new Error('Credit not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      amount: parseFloat(row.amount),
      source: row.source,
      description: row.description,
      paymentId: row.payment_id,
      appliedToInvoiceId: row.applied_to_invoice_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error updating credit status:', error);
    throw error;
  }
}

/**
 * Delete a tenant credit (only if status is 'available')
 */
export async function deleteTenantCredit(creditId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM tenant_credits 
       WHERE id = $1 AND status = 'available'
       RETURNING id`,
      [creditId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting tenant credit:', error);
    throw error;
  }
}

/**
 * Get all tenants with credit balances
 */
export async function getAllTenantsWithCredits(): Promise<TenantCreditSummary[]> {
  try {
    const result = await pool.query(
      `SELECT 
        t.id as tenant_id,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        COALESCE(SUM(tc.amount), 0) as total_credits,
        COALESCE(SUM(CASE WHEN tc.status = 'available' THEN tc.amount ELSE 0 END), 0) as available_credits,
        COALESCE(SUM(CASE WHEN tc.status = 'applied' THEN tc.amount ELSE 0 END), 0) as applied_credits,
        COALESCE(SUM(CASE WHEN tc.status = 'refunded' THEN tc.amount ELSE 0 END), 0) as refunded_credits
       FROM tenants t
       LEFT JOIN tenant_credits tc ON t.id = tc.tenant_id
       WHERE t.tenant_status = 'active'
       GROUP BY t.id, t.first_name, t.last_name
       HAVING COALESCE(SUM(CASE WHEN tc.status = 'available' THEN tc.amount ELSE 0 END), 0) > 0
       ORDER BY available_credits DESC`
    );

    return result.rows.map(row => ({
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      totalCredits: parseFloat(row.total_credits),
      availableCredits: parseFloat(row.available_credits),
      appliedCredits: parseFloat(row.applied_credits),
      refundedCredits: parseFloat(row.refunded_credits)
    }));
  } catch (error) {
    console.error('Error getting tenants with credits:', error);
    throw error;
  }
}

/**
 * Manually adjust tenant credit (admin only)
 */
export async function adjustTenantCredit(
  tenantId: string,
  amount: number,
  description: string,
  isIncrease: boolean
): Promise<TenantCredit> {
  try {
    const actualAmount = isIncrease ? Math.abs(amount) : -Math.abs(amount);

    const result = await pool.query(
      `INSERT INTO tenant_credits (
        tenant_id,
        amount,
        source,
        description,
        status
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        tenantId,
        actualAmount,
        'adjustment',
        description,
        actualAmount > 0 ? 'available' : 'applied'
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      amount: parseFloat(row.amount),
      source: row.source,
      description: row.description,
      paymentId: row.payment_id,
      appliedToInvoiceId: row.applied_to_invoice_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error adjusting tenant credit:', error);
    throw error;
  }
}

/**
 * Get credit transaction history for a tenant
 */
export async function getTenantCreditHistory(
  tenantId: string,
  limit: number = 50
): Promise<TenantCredit[]> {
  try {
    const result = await pool.query(
      `SELECT 
        tc.*,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        i.invoice_number,
        p.reference_number as payment_reference
       FROM tenant_credits tc
       LEFT JOIN tenants t ON tc.tenant_id = t.id
       LEFT JOIN invoices i ON tc.applied_to_invoice_id = i.id
       LEFT JOIN payments p ON tc.payment_id = p.id
       WHERE tc.tenant_id = $1
       ORDER BY tc.created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      amount: parseFloat(row.amount),
      source: row.source,
      description: row.description,
      paymentId: row.payment_id,
      appliedToInvoiceId: row.applied_to_invoice_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tenantName: row.tenant_name,
      invoiceNumber: row.invoice_number,
      paymentReference: row.payment_reference
    }));
  } catch (error) {
    console.error('Error getting credit history:', error);
    throw error;
  }
}

