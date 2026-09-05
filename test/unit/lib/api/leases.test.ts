import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getLeases } = await import('@/lib/api/leases');

describe('getLeases', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  });

  it('pages leases with a max of 100', async () => {
    const result = await getLeases({ limit: 500 });
    expect(result.pagination.limit).toBe(100);
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listParams).toContain(100);
  });
});
