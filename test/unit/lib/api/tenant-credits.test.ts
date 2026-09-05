import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { getTenantCreditBalance } = await import('@/lib/api/tenant-credits');

describe('getTenantCreditBalance', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('rethrows when the balance query fails instead of returning zero', async () => {
    mockQuery.mockRejectedValueOnce(new Error('function missing'));

    await expect(getTenantCreditBalance('tenant-1')).rejects.toThrow('function missing');
  });
});
