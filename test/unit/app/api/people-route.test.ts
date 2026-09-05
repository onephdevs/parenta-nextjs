import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listPeople = vi.fn().mockResolvedValue({ people: [], total: 0 });
const getPeopleStats = vi.fn().mockResolvedValue({ total: 0 });
const requireAdmin = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'admin-1' } },
}));

vi.mock('@/lib/api/people', () => ({
  listPeople,
  getPeopleStats,
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin,
}));

const { GET } = await import('@/app/api/people/route');

describe('GET /api/people', () => {
  beforeEach(() => {
    listPeople.mockClear();
    getPeopleStats.mockClear();
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1' } },
    });
  });

  it('rejects unauthenticated callers', async () => {
    requireAdmin.mockResolvedValueOnce({
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
      session: null,
    });
    const res = await GET(new Request('http://localhost/api/people') as never);
    expect(res.status).toBe(401);
  });

  it('defaults to limit 200 and badge all', async () => {
    await GET(new Request('http://localhost/api/people') as never);
    expect(listPeople).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 200, offset: 0, badge: 'all' })
    );
  });

  it('maps legacy current status to the active badge', async () => {
    await GET(new Request('http://localhost/api/people?status=current&limit=50') as never);
    expect(listPeople).toHaveBeenCalledWith(
      expect.objectContaining({ badge: 'active', limit: 50 })
    );
  });
});
