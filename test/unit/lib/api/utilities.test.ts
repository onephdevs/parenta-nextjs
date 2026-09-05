import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getUtilityBills, getUpcomingDueBills } = await import('@/lib/api/utilities');

describe('utility bills', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('pages bills with a capped LIMIT', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await getUtilityBills({}, 1, 500);
    expect(result.limit).toBe(100);
    expect(String(mockQuery.mock.calls[1]?.[0])).toMatch(/LIMIT \$/);
  });

  it('parameterizes the due-window instead of interpolating days into SQL', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await getUpcomingDueBills(14);
    const sql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    const params = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(sql).not.toMatch(/INTERVAL '14 days'/);
    expect(sql).toMatch(/\$1::integer/);
    expect(sql).toMatch(/LIMIT 20/);
    expect(params[0]).toBe(14);
  });
});
