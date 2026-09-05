import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getPayments, getPendingPaymentClaims } = await import('@/lib/api/payments');

describe('payments lists', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('pages payments with LIMIT instead of loading every receipt', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await getPayments({}, 1, 20);

    const listSql = String(mockQuery.mock.calls[1]?.[0] ?? '');
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listSql).toMatch(/LIMIT \$/);
    expect(listParams).toContain(20);
  });

  it('caps pending payment claims at 50', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await getPendingPaymentClaims();
    const sql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/LIMIT 50/);
  });
});
