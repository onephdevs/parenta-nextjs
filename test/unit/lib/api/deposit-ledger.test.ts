import { beforeEach, describe, expect, it, vi } from 'vitest';

import { callOrder, createMockClient, createMockPool } from '../../_support/mock-pg';

const client = createMockClient();
const mockPool = createMockPool(client);

vi.mock('@/lib/db', () => ({
  default: mockPool,
  pool: mockPool,
}));

const { getTenantDepositBalance, refundDeposit } = await import('@/lib/api/deposit-ledger');

describe('getTenantDepositBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.calls.length = 0;
  });

  it('rethrows when the balance query fails instead of returning zero', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('function missing'));

    await expect(getTenantDepositBalance('tenant-1')).rejects.toThrow('function missing');
  });
});

describe('refundDeposit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.calls.length = 0;
    client.query.mockImplementation(async (sql: string, params?: unknown) => {
      client.calls.push({ sql: String(sql), params });
      const s = String(sql);
      if (/^BEGIN$/i.test(s.trim()) || /^COMMIT$/i.test(s.trim()) || /^ROLLBACK$/i.test(s.trim())) {
        return { rows: [], rowCount: 0 };
      }
      if (/pg_advisory_xact_lock/.test(s)) {
        return { rows: [], rowCount: 1 };
      }
      if (/get_tenant_deposit_balance/.test(s)) {
        return { rows: [{ balance: 1000 }], rowCount: 1 };
      }
      if (/INSERT INTO deposit_ledger/.test(s)) {
        return {
          rows: [
            {
              id: 'tx-1',
              tenant_id: 'tenant-1',
              amount: 100,
              transaction_type: 'refund',
              applied_to_invoice_id: null,
              payment_id: null,
              description: 'Refund',
              transaction_date: new Date('2026-09-05'),
              created_by: 'admin-1',
              created_at: new Date('2026-09-05'),
              updated_at: new Date('2026-09-05'),
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('locks the tenant then reads balance inside the transaction before inserting', async () => {
    await refundDeposit('tenant-1', 100, 'Refund', 'admin-1');

    const order = callOrder(client.calls);
    expect(order[0]).toBe('begin');
    expect(order[1]).toBe('lock');
    expect(order[2]).toBe('deposit_balance');
    expect(order).toContain('insert_deposit');
    expect(order.indexOf('lock')).toBeLessThan(order.indexOf('deposit_balance'));
    expect(order.indexOf('deposit_balance')).toBeLessThan(order.indexOf('insert_deposit'));
    expect(client.calls[1]?.params).toEqual(['tenant-money:tenant-1']);
  });

  it('does not insert a refund when the in-transaction balance is insufficient', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    client.query.mockImplementation(async (sql: string, params?: unknown) => {
      client.calls.push({ sql: String(sql), params });
      const s = String(sql);
      if (/get_tenant_deposit_balance/.test(s)) {
        return { rows: [{ balance: 50 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(refundDeposit('tenant-1', 100, 'Refund', 'admin-1')).rejects.toThrow(
      /Insufficient deposit balance/
    );

    expect(callOrder(client.calls)).toEqual(['begin', 'lock', 'deposit_balance', 'rollback']);
    expect(callOrder(client.calls)).not.toContain('insert_deposit');
  });
});
