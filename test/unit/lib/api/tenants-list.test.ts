import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getAllTenants } = await import('@/lib/api/tenants');

describe('getAllTenants', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  });

  it('caps dropdown/list requests at 200', async () => {
    await getAllTenants({ limit: 1000 });
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listParams).toContain(200);
    expect(listParams).not.toContain(1000);
  });
});
