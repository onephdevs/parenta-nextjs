import { beforeEach, describe, expect, it, vi } from 'vitest';

const getLeases = vi.fn().mockResolvedValue({
  leases: [],
  pagination: { page: 1, limit: 50, total: 0 },
});
const getLeaseStats = vi.fn().mockResolvedValue({ active: 0 });
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/leases', () => ({
  getLeases,
  getLeaseStats,
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { GET } = await import('@/app/api/leases/route');

describe('GET /api/leases', () => {
  beforeEach(() => {
    getLeases.mockClear();
    getLeaseStats.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/leases') as never);
    expect(res.status).toBe(401);
  });

  it('defaults to page 1, limit 50, and includes stats', async () => {
    await GET(new Request('http://localhost/api/leases') as never);
    expect(getLeases).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 50, status: 'all' })
    );
    expect(getLeaseStats).toHaveBeenCalled();
  });

  it('skips stats when includeStats=false', async () => {
    await GET(new Request('http://localhost/api/leases?includeStats=false') as never);
    expect(getLeaseStats).not.toHaveBeenCalled();
  });
});
