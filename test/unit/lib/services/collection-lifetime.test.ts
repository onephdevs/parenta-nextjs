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

const { commitLifetimePeriod } = await import('@/lib/services/collection-lifetime');

describe('commitLifetimePeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.calls.length = 0;
    mockPool.query.mockResolvedValue({ rows: [{ total: 0 }], rowCount: 1 });
    client.query.mockImplementation(async (sql: string, params?: unknown) => {
      client.calls.push({ sql: String(sql), params });
      const s = String(sql);
      if (/FROM collection_lifetime_period_commits/.test(s)) {
        return { rows: [], rowCount: 0 };
      }
      if (/FOR UPDATE/.test(s)) {
        return { rows: [{ overall_collection: 100 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('locks lifetime totals with FOR UPDATE before adding the period', async () => {
    await commitLifetimePeriod({
      startDate: '2026-06-16',
      endDate: '2026-07-15',
    });

    const sqls = client.calls.map((c) => c.sql.replace(/\s+/g, ' '));
    expect(sqls[0].trim()).toMatch(/^BEGIN$/i);
    const lockIdx = sqls.findIndex((s) => /FOR UPDATE/.test(s));
    const insertIdx = sqls.findIndex((s) => /INSERT INTO collection_lifetime_period_commits/.test(s));
    expect(lockIdx).toBeGreaterThan(0);
    expect(insertIdx).toBeGreaterThan(lockIdx);
  });
});
