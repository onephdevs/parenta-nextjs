import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllDashboardMetrics = vi.fn().mockResolvedValue({ occupancy: 0 });
const cacheGet = vi.fn(() => null);
const cacheSet = vi.fn();
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/services/dashboard-service', () => ({
  getAllDashboardMetrics,
}));

vi.mock('@/lib/cache/memory-cache', () => ({
  cacheGet,
  cacheSet,
  DASHBOARD_METRICS_KEY: 'dashboard:metrics',
  DASHBOARD_TTL_MS: 60_000,
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { GET } = await import('@/app/api/dashboard/metrics/route');

describe('GET /api/dashboard/metrics', () => {
  beforeEach(() => {
    getAllDashboardMetrics.mockClear();
    cacheGet.mockReset();
    cacheSet.mockReset();
    cacheGet.mockReturnValue(null);
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/dashboard/metrics') as never);
    expect(res.status).toBe(401);
  });

  it('returns cached metrics without hitting the service', async () => {
    cacheGet.mockReturnValueOnce({ occupancy: 12 });
    const res = await GET(new Request('http://localhost/api/dashboard/metrics') as never);
    const body = await res.json();
    expect(body.cached).toBe(true);
    expect(getAllDashboardMetrics).not.toHaveBeenCalled();
  });

  it('loads and caches metrics on a miss', async () => {
    const res = await GET(new Request('http://localhost/api/dashboard/metrics') as never);
    const body = await res.json();
    expect(body.cached).toBe(false);
    expect(getAllDashboardMetrics).toHaveBeenCalled();
    expect(cacheSet).toHaveBeenCalled();
  });
});
