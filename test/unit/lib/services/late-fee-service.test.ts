import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { calculateLateFeeForInvoice } = await import('@/lib/services/late-fee-service');

describe('calculateLateFeeForInvoice', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('rethrows when the late-fee function fails instead of swallowing', async () => {
    mockQuery.mockRejectedValueOnce(new Error('function missing'));
    await expect(calculateLateFeeForInvoice('inv-1', 'set-1')).rejects.toThrow('function missing');
  });
});
