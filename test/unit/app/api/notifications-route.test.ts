import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();
const requireRole = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'u1', role: 'admin' } },
}));

vi.mock('@/lib/api-auth', () => ({
  requireRole,
}));

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery },
  pool: { query: mockQuery },
}));

vi.mock('@/lib/services/activity-taxonomy', () => ({
  formatActivityDescription: vi.fn(() => 'desc'),
  formatActorName: vi.fn(() => 'Ada'),
}));

const { GET } = await import('@/app/api/notifications/route');

describe('GET /api/notifications', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ total: 0, unread: 0 }], rowCount: 1 });
    requireRole.mockReset();
    requireRole.mockResolvedValue({
      error: null,
      session: { user: { id: 'u1', role: 'admin' } },
    });
  });

  it('rejects unauthenticated callers', async () => {
    requireRole.mockResolvedValueOnce({
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
      session: null,
    });
    const res = await GET(new Request('http://localhost/api/notifications') as never);
    expect(res.status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('defaults to limit 20', async () => {
    await GET(new Request('http://localhost/api/notifications') as never);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual(['u1', 20, 0]);
  });

  it('caps oversized limits at 50', async () => {
    await GET(new Request('http://localhost/api/notifications?limit=999') as never);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual(['u1', 50, 0]);
  });
});
