import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getExpenses } = await import('@/lib/api/expenses');

describe('getExpenses', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  });

  it('pages expenses and caps oversized limits', async () => {
    const result = await getExpenses({}, 1, 1000);
    expect(result.limit).toBe(100);
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listParams).toContain(100);
    expect(String(mockQuery.mock.calls[1]?.[0])).toMatch(/LIMIT \$/);
  });
});
