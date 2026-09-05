import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getAllBuildings } = await import('@/lib/api/buildings');

describe('getAllBuildings', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  });

  it('pages buildings with LIMIT instead of loading the full roster', async () => {
    await getAllBuildings({ limit: 50 });

    const listSql = String(mockQuery.mock.calls[1]?.[0] ?? '');
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listSql).toMatch(/LIMIT \$/);
    expect(listParams).toContain(50);
  });
});
