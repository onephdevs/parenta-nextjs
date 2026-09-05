import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getDocuments } = await import('@/lib/api/documents');

describe('getDocuments', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  });

  it('pages documents and caps oversized limits', async () => {
    const result = await getDocuments({}, 1, 1000);
    expect(result.limit).toBe(100);
    expect(String(mockQuery.mock.calls[1]?.[0])).toMatch(/LIMIT \$/);
  });
});
