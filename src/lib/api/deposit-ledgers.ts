/**
 * Deposit ledger accounts (SECURITY | UTILITY) with running balance.
 * Separate from legacy flat `deposit_ledger` table used by older payment paths.
 */

import pool from '@/lib/db';
import type { DepositType } from '@/lib/constants/deposits';
import { isDepositType } from '@/lib/constants/deposits';

export interface DepositLedgerAccount {
  id: string;
  assignmentId: string;
  tenantId: string;
  depositType: DepositType;
  initialAmount: number;
  runningBalance: number;
  isActive: boolean;
}

export interface DepositLedgerTransaction {
  id: string;
  depositLedgerId: string;
  amount: number;
  reason: string;
  transactionDate: string;
  createdByContactId: string | null;
  createdByUserId: string | null;
  appliedToInvoiceId: string | null;
  paymentId: string | null;
}

function mapAccount(row: Record<string, unknown>): DepositLedgerAccount {
  const type = String(row.deposit_type || '');
  return {
    id: String(row.id),
    assignmentId: String(row.assignment_id),
    tenantId: String(row.tenant_id),
    depositType: (isDepositType(type) ? type : 'SECURITY') as DepositType,
    initialAmount: Number(row.initial_amount || 0),
    runningBalance: Number(row.running_balance || 0),
    isActive: row.is_active !== false,
  };
}

export async function ensureDepositLedger(params: {
  assignmentId: string;
  tenantId: string;
  depositType: DepositType;
  initialAmount: number;
  createdByUserId?: string | null;
  createdByContactId?: string | null;
}): Promise<DepositLedgerAccount> {
  const existing = await pool.query(
    `SELECT * FROM deposit_ledgers
     WHERE assignment_id = $1 AND deposit_type = $2
     LIMIT 1`,
    [params.assignmentId, params.depositType]
  );
  if (existing.rows[0]) {
    return mapAccount(existing.rows[0]);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await client.query(
      `INSERT INTO deposit_ledgers (
         assignment_id, tenant_id, deposit_type, initial_amount, running_balance
       ) VALUES ($1, $2, $3, $4, 0)
       RETURNING *`,
      [params.assignmentId, params.tenantId, params.depositType, params.initialAmount]
    );
    const account = mapAccount(created.rows[0]);
    if (params.initialAmount !== 0) {
      await client.query(
        `INSERT INTO deposit_transactions (
           deposit_ledger_id, amount, reason, transaction_date,
           created_by_contact_id, created_by_user_id
         ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)`,
        [
          account.id,
          params.initialAmount,
          `${params.depositType} deposit received`,
          params.createdByContactId ?? null,
          params.createdByUserId ?? null,
        ]
      );
    }
    await client.query('COMMIT');
    const refreshed = await pool.query(`SELECT * FROM deposit_ledgers WHERE id = $1`, [
      account.id,
    ]);
    return mapAccount(refreshed.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Apply deposit to a bill: negative amount, updates running_balance via trigger.
 * Returns the updated account.
 */
export async function applyDepositToInvoice(params: {
  depositLedgerId: string;
  amount: number;
  reason: string;
  invoiceId?: string | null;
  paymentId?: string | null;
  createdByContactId?: string | null;
  createdByUserId?: string | null;
  transactionDate?: string;
}): Promise<DepositLedgerAccount> {
  if (params.amount <= 0) {
    throw new Error('applyDepositToInvoice expects a positive amount to deduct');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(
      `SELECT * FROM deposit_ledgers WHERE id = $1 FOR UPDATE`,
      [params.depositLedgerId]
    );
    if (!locked.rows[0]) {
      throw new Error('Deposit ledger not found');
    }
    const balance = Number(locked.rows[0].running_balance || 0);
    if (params.amount > balance) {
      throw new Error(
        `Insufficient deposit balance (${balance}) for deduction of ${params.amount}`
      );
    }

    await client.query(
      `INSERT INTO deposit_transactions (
         deposit_ledger_id, amount, reason, transaction_date,
         created_by_contact_id, created_by_user_id,
         applied_to_invoice_id, payment_id
       ) VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, $6, $7, $8)`,
      [
        params.depositLedgerId,
        -Math.abs(params.amount),
        params.reason,
        params.transactionDate ?? null,
        params.createdByContactId ?? null,
        params.createdByUserId ?? null,
        params.invoiceId ?? null,
        params.paymentId ?? null,
      ]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const refreshed = await pool.query(`SELECT * FROM deposit_ledgers WHERE id = $1`, [
    params.depositLedgerId,
  ]);
  return mapAccount(refreshed.rows[0]);
}

export async function listDepositLedgersForTenant(
  tenantId: string
): Promise<DepositLedgerAccount[]> {
  const result = await pool.query(
    `SELECT * FROM deposit_ledgers
     WHERE tenant_id = $1 AND COALESCE(is_active, true) = true
     ORDER BY deposit_type`,
    [tenantId]
  );
  return result.rows.map(mapAccount);
}

/** Active ledgers with zero running balance (Needs Attention). */
export async function listZeroBalanceDepositLedgers(limit = 50): Promise<
  Array<DepositLedgerAccount & { tenantName: string; roomNumber: string | null }>
> {
  const result = await pool.query(
    `SELECT
       dl.*,
       t.first_name,
       t.last_name,
       r.room_number
     FROM deposit_ledgers dl
     JOIN tenants t ON t.id = dl.tenant_id
     JOIN tenant_room_assignments tra ON tra.id = dl.assignment_id
     LEFT JOIN rooms r ON r.id = tra.room_id
     WHERE dl.is_active = true
       AND dl.running_balance = 0
       AND tra.assignment_status = 'active'
     ORDER BY t.last_name, t.first_name
     LIMIT $1`,
    [limit]
  );
  return result.rows.map((row) => ({
    ...mapAccount(row),
    tenantName: `${row.first_name} ${row.last_name}`.trim(),
    roomNumber: row.room_number ? String(row.room_number) : null,
  }));
}
