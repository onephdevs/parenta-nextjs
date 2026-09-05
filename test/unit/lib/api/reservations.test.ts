import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getAllReservations } = await import('@/lib/api/reservations');

describe('getAllReservations', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  });

  it('caps the reservations roster at 200', async () => {
    const result = await getAllReservations({ limit: 1000 });
    expect(result.limit).toBe(200);
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listParams).toContain(200);
  });
});
