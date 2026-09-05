import { beforeEach, describe, expect, it, vi } from 'vitest';

import { callOrder, createMockClient } from '../../_support/mock-pg';

const client = createMockClient();
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(async () => client),
};

vi.mock('@/lib/db', () => ({
  default: mockPool,
  pool: mockPool,
}));

const { allocatePaymentToInvoices } = await import('@/lib/services/payment-allocator');

describe('allocatePaymentToInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.calls.length = 0;
    client.query.mockImplementation(async (sql: string, params?: unknown) => {
      client.calls.push({ sql: String(sql), params });
      const s = String(sql);
      if (/pg_advisory_xact_lock/.test(s)) {
        return { rows: [], rowCount: 1 };
      }
      if (/SELECT id FROM tenants WHERE id = \$1/.test(s)) {
        return { rows: [{ id: 'tenant-1' }], rowCount: 1 };
      }
      if (/get_tenant_deposit_balance/.test(s)) {
        return { rows: [{ balance: 250 }], rowCount: 1 };
      }
      if (/FROM invoices i/.test(s)) {
        return { rows: [], rowCount: 0 };
      }
      if (/INSERT INTO tenant_credits/.test(s)) {
        return { rows: [{ id: 'credit-1' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('takes an advisory lock before reading deposit balance inside the transaction', async () => {
    await allocatePaymentToInvoices(
      {
        paymentId: 'pay-1',
        tenantId: 'tenant-1',
        paymentAmount: 100,
        useDeposit: true,
      },
      client as never
    );

    const order = callOrder(client.calls);
    expect(order[0]).toBe('lock');
    expect(order).toContain('deposit_balance');
    expect(order.indexOf('lock')).toBeLessThan(order.indexOf('deposit_balance'));
    expect(client.calls[0]?.params).toEqual(['tenant-money:tenant-1']);
  });
});
