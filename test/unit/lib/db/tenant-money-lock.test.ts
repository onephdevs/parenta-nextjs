import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lockTenantMoney } from '@/lib/db/tenant-money-lock';

describe('lockTenantMoney', () => {
  const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });

  beforeEach(() => {
    query.mockClear();
  });

  it('takes a transaction-scoped advisory lock keyed by tenant', async () => {
    await lockTenantMoney({ query } as never, 'tenant-42');

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock(hashtext($1))', [
      'tenant-money:tenant-42',
    ]);
  });
});
