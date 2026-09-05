import { beforeEach, describe, expect, it, vi } from 'vitest';

const getRecentPayments = vi.fn().mockResolvedValue([]);
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/services/dashboard-service', () => ({
  getRecentPayments,
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { GET } = await import('@/app/api/dashboard/payments/recent/route');

describe('GET /api/dashboard/payments/recent', () => {
  beforeEach(() => {
    getRecentPayments.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/dashboard/payments/recent') as never);
    expect(res.status).toBe(401);
  });

  it('defaults to 10 recent payments', async () => {
    await GET(new Request('http://localhost/api/dashboard/payments/recent') as never);
    expect(getRecentPayments).toHaveBeenCalledWith(10);
  });

  it('forwards the requested limit', async () => {
    await GET(new Request('http://localhost/api/dashboard/payments/recent?limit=25') as never);
    expect(getRecentPayments).toHaveBeenCalledWith(25);
  });
});
