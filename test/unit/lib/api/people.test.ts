import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { listPeople } = await import('@/lib/api/people');

describe('listPeople', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  });

  it('caps the directory at 200 instead of the full tenant table', async () => {
    await listPeople({ limit: 999 });
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listParams).toContain(200);
    expect(String(mockQuery.mock.calls[1]?.[0])).toMatch(/LIMIT \$/);
  });
});
