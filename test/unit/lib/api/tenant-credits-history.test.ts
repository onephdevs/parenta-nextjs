import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getTenantCreditHistory } = await import('@/lib/api/tenant-credits');

describe('getTenantCreditHistory', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('caps history at the requested LIMIT', async () => {
    await getTenantCreditHistory('tenant-1', 25);
    const sql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    const params = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(sql).toMatch(/LIMIT \$2/);
    expect(params).toEqual(['tenant-1', 25]);
  });
});
