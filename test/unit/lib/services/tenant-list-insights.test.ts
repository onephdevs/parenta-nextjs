import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
  pool: { query: vi.fn(), connect: vi.fn() },
}));

const { getTenantListInsights } = await import('@/lib/services/tenant-list-insights');

describe('getTenantListInsights', () => {
  it('returns an empty map without querying when no tenant ids are given', async () => {
    await expect(getTenantListInsights([])).resolves.toEqual({});
  });
});
