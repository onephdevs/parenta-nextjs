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

vi.mock('@/lib/services/payment-allocator', () => ({
  autoApplyAdvanceToUnpaidRentInvoices: vi.fn(),
}));

const { generateNextMonthRentInvoice } = await import(
  '@/lib/services/monthly-invoice-generator'
);

describe('generateNextMonthRentInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.calls.length = 0;
    client.query.mockImplementation(async (sql: string, params?: unknown) => {
      client.calls.push({ sql: String(sql), params });
      return { rows: [], rowCount: 0 };
    });
  });

  it('locks the tenant then rolls back when there is no active lease', async () => {
    const result = await generateNextMonthRentInvoice('tenant-1');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/No active lease/);
    const order = callOrder(client.calls);
    expect(order[0]).toBe('begin');
    expect(order[1]).toBe('lock');
    expect(order).toContain('rollback');
    expect(order).not.toContain('commit');
    expect(client.calls[1]?.params).toEqual(['tenant-money:tenant-1']);
  });
});
