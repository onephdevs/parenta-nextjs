import type { PoolClient } from 'pg';

/**
 * Serialize deposit/credit/invoice-apply mutations for one tenant.
 * Released automatically on COMMIT/ROLLBACK (pg_advisory_xact_lock).
 *
 * Before: balance/count was read on the pool outside the writer transaction, so
 * two concurrent refunds or applies could both see the same available amount
 * and both proceed. After: the decision read runs on the same client, after
 * this lock, inside the same transaction as the write.
 */
export async function lockTenantMoney(client: PoolClient, tenantId: string): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    `tenant-money:${tenantId}`,
  ]);
}

export async function selectTenantDepositBalance(
  client: PoolClient,
  tenantId: string
): Promise<number> {
  const result = await client.query<{ balance: string | number }>(
    'SELECT get_tenant_deposit_balance($1) as balance',
    [tenantId]
  );
  return parseFloat(String(result.rows[0]?.balance ?? 0)) || 0;
}

export async function selectTenantCreditBalance(
  client: PoolClient,
  tenantId: string
): Promise<number> {
  const result = await client.query<{ balance: string | number }>(
    'SELECT get_tenant_credit_balance($1) as balance',
    [tenantId]
  );
  return parseFloat(String(result.rows[0]?.balance ?? 0)) || 0;
}
