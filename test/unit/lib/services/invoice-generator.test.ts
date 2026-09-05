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
  autoApplyAdvanceToUnpaidRentInvoices: vi.fn().mockResolvedValue({
    totalApplied: 0,
    success: true,
    invoicesUpdated: 0,
    remainingAdvance: 0,
  }),
}));

const { generateInvoicesForTenant } = await import('@/lib/services/invoice-generator');

describe('generateInvoicesForTenant', () => {
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
      if (/SELECT first_name, last_name, email FROM tenants/.test(s)) {
        return {
          rows: [{ first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' }],
          rowCount: 1,
        };
      }
      if (/FROM rooms r/.test(s)) {
        return { rows: [{ room_number: '1', building_name: 'Balibago' }], rowCount: 1 };
      }
      if (/billing_cycle_start_day/.test(s)) {
        return {
          rows: [{ billing_cycle_start_day: 5, start_date: new Date('2026-09-01') }],
          rowCount: 1,
        };
      }
      if (/item_type = 'rent'/.test(s)) {
        return { rows: [{ id: 'inv-existing' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('locks the tenant before reading existing rent invoices for the month', async () => {
    await generateInvoicesForTenant({
      tenantId: 'tenant-1',
      roomId: 'room-1',
      leaseStartDate: new Date('2026-09-01'),
      leaseEndDate: new Date('2026-09-15'),
      monthlyRent: 8000,
    });

    const order = callOrder(client.calls);
    expect(order[0]).toBe('begin');
    expect(order[1]).toBe('lock');
    expect(order).toContain('existing_rent');
    expect(order.indexOf('lock')).toBeLessThan(order.indexOf('existing_rent'));
    expect(order).not.toContain('insert_invoice');
    expect(client.calls[1]?.params).toEqual(['tenant-money:tenant-1']);
  });
});
