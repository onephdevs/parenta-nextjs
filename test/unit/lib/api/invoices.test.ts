import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getInvoices } = await import('@/lib/api/invoices');

describe('getInvoices', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  });

  it('pages invoices with LIMIT instead of loading the full ledger', async () => {
    await getInvoices({}, 2, 20);
    const listSql = String(mockQuery.mock.calls[1]?.[0] ?? '');
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listSql).toMatch(/LIMIT \$/);
    expect(listParams).toContain(20);
    expect(listParams).toContain(20);
  });
});
