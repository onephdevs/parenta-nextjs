import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getNeedsAttention } = await import('@/lib/services/needs-attention-service');

describe('getNeedsAttention', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('loads a COUNT(*) OVER() preview of 5 rows instead of the full roster', async () => {
    const payload = await getNeedsAttention();

    expect(payload.cards).toHaveLength(6);
    expect(mockQuery.mock.calls.length).toBeGreaterThanOrEqual(6);

    const previewQueries = mockQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('LIMIT $1')
    );
    expect(previewQueries.length).toBe(6);

    for (const [sql, params] of previewQueries) {
      expect(String(sql)).toMatch(/COUNT\(\*\) OVER\(\)/);
      expect(params).toEqual([5]);
    }
  });
});
