import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getUpcomingDueDates, getTopTenantsByPayments } = await import(
  '@/lib/services/dashboard-service'
);

describe('dashboard hot-path queries', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('caps upcoming due dates at 20 rows instead of every invoice in the window', async () => {
    await getUpcomingDueDates(30);

    const sql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/LIMIT 20/);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([30]);
  });

  it('ranks top tenants in SQL over the last 12 months with LIMIT', async () => {
    await getTopTenantsByPayments(5);

    const sql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    const params = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(sql).toMatch(/INTERVAL '12 months'/);
    expect(sql).toMatch(/LIMIT \$1/);
    expect(params[0]).toBe(5);
  });
});
