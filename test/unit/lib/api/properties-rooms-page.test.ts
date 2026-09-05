import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getRoomsForRoomsPage } = await import('@/lib/api/properties');

describe('getRoomsForRoomsPage', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('caps the rooms master list at 500', async () => {
    await getRoomsForRoomsPage();
    expect(String(mockQuery.mock.calls[0]?.[0])).toMatch(/LIMIT 500/);
  });
});
