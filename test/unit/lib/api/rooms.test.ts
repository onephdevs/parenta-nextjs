import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getAllRooms } = await import('@/lib/api/rooms');

describe('getAllRooms', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  });

  it('pages rooms with LIMIT instead of loading the full building', async () => {
    await getAllRooms({ limit: 25 });
    const listSql = String(mockQuery.mock.calls[1]?.[0] ?? '');
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listSql).toMatch(/LIMIT \$/);
    expect(listParams).toContain(25);
  });
});
