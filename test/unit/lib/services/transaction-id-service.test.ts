import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockClient } from '../../_support/mock-pg';

const client = createMockClient();
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(async () => client),
};

vi.mock('@/lib/db', () => ({
  default: mockPool,
  pool: mockPool,
}));

const { allocateParentaTxnId } = await import('@/lib/services/transaction-id-service');

describe('allocateParentaTxnId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.calls.length = 0;
    client.query.mockImplementation(async (sql: string, params?: unknown) => {
      client.calls.push({ sql: String(sql), params });
      const s = String(sql);
      if (/UPDATE txn_sequences/.test(s)) {
        return { rows: [{ last_value: 42 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('allocates the sequence inside a transaction before formatting the id', async () => {
    await expect(allocateParentaTxnId('r', 26)).resolves.toBe('txn-r-000042-26');
    const sqls = client.calls.map((c) => c.sql.replace(/\s+/g, ' ').trim());
    expect(sqls[0]).toMatch(/^BEGIN$/i);
    expect(sqls.some((s) => /UPDATE txn_sequences/.test(s))).toBe(true);
    expect(sqls.some((s) => /^COMMIT$/i.test(s))).toBe(true);
  });

  it('rejects an invalid type code before touching the database', async () => {
    await expect(allocateParentaTxnId('z' as never)).rejects.toThrow(/Invalid txn type/);
    expect(mockPool.connect).not.toHaveBeenCalled();
  });
});
