import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { leaseTemplatesTableExists } = await import('@/lib/api/lease-templates');

describe('leaseTemplatesTableExists', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns true when the table is present', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });

    await expect(leaseTemplatesTableExists()).resolves.toBe(true);
  });

  it('throws when the existence check fails instead of returning false', async () => {
    mockQuery.mockRejectedValueOnce(new Error('permission denied'));

    await expect(leaseTemplatesTableExists()).rejects.toThrow('permission denied');
  });
});
