import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getCardsForBoard } = await import('@/lib/api/pipeline');

describe('getCardsForBoard', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('loads a capped board instead of the full closed+open roster', async () => {
    await getCardsForBoard('payments', { limit: 999 });

    const sql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    const params = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(sql).toMatch(/LIMIT \$3/);
    expect(sql).toMatch(/card_status = 'open'/);
    expect(params[0]).toBe('payments');
    expect(params[2]).toBe(500);
  });
});
