import { beforeEach, describe, expect, it, vi } from 'vitest';

const getTenantCreditBalance = vi.fn().mockResolvedValue({ balance: 0 });
const getTenantCreditSummary = vi.fn().mockResolvedValue({});
const getTenantCreditHistory = vi.fn().mockResolvedValue([]);
const getTenantCredits = vi.fn().mockResolvedValue([]);
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/tenant-credits', () => ({
  getTenantCreditBalance,
  getTenantCreditSummary,
  getTenantCreditHistory,
  getTenantCredits,
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { GET } = await import('@/app/api/tenant-credits/[tenantId]/route');

const params = { params: Promise.resolve({ tenantId: 't1' }) };

describe('GET /api/tenant-credits/[tenantId]', () => {
  beforeEach(() => {
    getTenantCreditBalance.mockClear();
    getTenantCreditSummary.mockClear();
    getTenantCreditHistory.mockClear();
    getTenantCredits.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(
      new Request('http://localhost/api/tenant-credits/t1') as never,
      params
    );
    expect(res.status).toBe(401);
  });

  it('defaults to the credit balance', async () => {
    await GET(new Request('http://localhost/api/tenant-credits/t1') as never, params);
    expect(getTenantCreditBalance).toHaveBeenCalledWith('t1');
  });

  it('loads history when type=history', async () => {
    await GET(
      new Request('http://localhost/api/tenant-credits/t1?type=history') as never,
      params
    );
    expect(getTenantCreditHistory).toHaveBeenCalledWith('t1');
    expect(getTenantCreditBalance).not.toHaveBeenCalled();
  });
});
