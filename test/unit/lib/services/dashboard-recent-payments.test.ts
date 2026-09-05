import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getRecentPayments } = await import('@/lib/services/dashboard-service');

describe('getRecentPayments', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('caps the dashboard widget at 50 rows', async () => {
    await getRecentPayments(999);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([50]);
    expect(String(mockQuery.mock.calls[0]?.[0])).toMatch(/LIMIT \$1/);
  });
});
