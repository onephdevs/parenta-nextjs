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

const { adjustTenantCredit, getAllTenantsWithCredits } = await import(
  '@/lib/api/tenant-credits'
);

describe('adjustTenantCredit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.calls.length = 0;
    client.query.mockImplementation(async (sql: string, params?: unknown) => {
      client.calls.push({ sql: String(sql), params });
      const s = String(sql);
      if (/INSERT INTO tenant_credits/.test(s)) {
        return {
          rows: [
            {
              id: 'c1',
              tenant_id: 'tenant-1',
              amount: 100,
              source: 'adjustment',
              description: 'Manual',
              payment_id: null,
              applied_to_invoice_id: null,
              status: 'available',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('locks the tenant before inserting a credit adjustment', async () => {
    await adjustTenantCredit('tenant-1', 100, 'Manual', true);
    const order = callOrder(client.calls);
    expect(order[0]).toBe('begin');
    expect(order[1]).toBe('lock');
    expect(order).toContain('insert_credit');
    expect(order.indexOf('lock')).toBeLessThan(order.indexOf('insert_credit'));
  });
});

describe('getAllTenantsWithCredits', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('caps the credits report instead of aggregating every active tenant', async () => {
    await getAllTenantsWithCredits();
    expect(String(mockPool.query.mock.calls[0]?.[0])).toMatch(/LIMIT 200/);
  });
});
