import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();
const requireAdmin = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'admin-1' } },
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin,
}));

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery },
  pool: { query: mockQuery },
}));

vi.mock('@/lib/services/activity-taxonomy', () => ({
  formatActivityDescription: vi.fn(() => 'desc'),
  formatActorName: vi.fn(() => 'Ada'),
  isActivityCategory: vi.fn((value: string) => value === 'payments'),
}));

const { GET } = await import('@/app/api/activity/route');

describe('GET /api/activity', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
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
    const res = await GET(new Request('http://localhost/api/activity') as never);
    expect(res.status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('defaults to limit 25', async () => {
    await GET(new Request('http://localhost/api/activity') as never);
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listParams).toEqual([25, 0]);
  });

  it('caps oversized limits at 100', async () => {
    await GET(new Request('http://localhost/api/activity?limit=999') as never);
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listParams).toEqual([100, 0]);
  });
});
