import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUtilityBills = vi.fn().mockResolvedValue({ bills: [], total: 0 });
const getUtilityBillSummary = vi.fn().mockResolvedValue({ total: 0 });
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/utilities', () => ({
  getUtilityBills,
  getUtilityBillSummary,
  createUtilityBill: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { GET, POST } = await import('@/app/api/utilities/route');

describe('GET /api/utilities', () => {
  beforeEach(() => {
    getUtilityBills.mockClear();
    getUtilityBillSummary.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/utilities') as never);
    expect(res.status).toBe(401);
  });

  it('returns the summary when requested', async () => {
    await GET(new Request('http://localhost/api/utilities?summary=true&buildingId=1') as never);
    expect(getUtilityBillSummary).toHaveBeenCalledWith(
      expect.objectContaining({ buildingId: 1 })
    );
    expect(getUtilityBills).not.toHaveBeenCalled();
  });

  it('defaults the bill list to page 1 and limit 20', async () => {
    await GET(new Request('http://localhost/api/utilities') as never);
    expect(getUtilityBills).toHaveBeenCalledWith(expect.any(Object), 1, 20);
  });
});

describe('POST /api/utilities', () => {
  beforeEach(() => {
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('requires bill fields including provider and amount', async () => {
    const res = await POST(
      new Request('http://localhost/api/utilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId: 1, utilityType: 'electricity' }),
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
