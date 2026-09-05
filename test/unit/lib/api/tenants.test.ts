import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getTenantById } = await import('@/lib/api/tenants');

describe('getTenantById', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('always joins tenant_agreement_document_id without probing information_schema', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(getTenantById('tenant-1')).resolves.toBeNull();

    const sql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/tenant_agreement_document_id/);
    expect(sql).not.toMatch(/information_schema/);
  });
});
