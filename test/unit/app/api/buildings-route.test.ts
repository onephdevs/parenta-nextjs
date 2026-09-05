import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllBuildings = vi.fn().mockResolvedValue({
  buildings: [],
  pagination: { page: 1, limit: 100, total: 0 },
});
const requireAdmin = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'admin-1' } },
}));

vi.mock('@/lib/api/buildings', () => ({
  getAllBuildings,
  createBuilding: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin,
}));

vi.mock('@/lib/services/activity-logger', () => ({
  logActivitySafe: vi.fn(),
}));

const { GET, POST } = await import('@/app/api/buildings/route');

describe('GET /api/buildings', () => {
  beforeEach(() => {
    getAllBuildings.mockClear();
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1' } },
    });
    getAllBuildings.mockResolvedValue({
      buildings: [],
      pagination: { page: 1, limit: 100, total: 0 },
    });
  });

  it('rejects unauthenticated callers', async () => {
    requireAdmin.mockResolvedValueOnce({
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
      session: null,
    });
    const res = await GET(new Request('http://localhost/api/buildings'));
    expect(res.status).toBe(401);
    expect(getAllBuildings).not.toHaveBeenCalled();
  });

  it('defaults to 100 buildings and caps the roster at 200', async () => {
    await GET(new Request('http://localhost/api/buildings'));
    expect(getAllBuildings).toHaveBeenCalledWith({ limit: 100 });

    await GET(new Request('http://localhost/api/buildings?limit=999'));
    expect(getAllBuildings).toHaveBeenCalledWith({ limit: 200 });
  });
});

describe('POST /api/buildings', () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1' } },
    });
  });

  it('requires name, city, and region', async () => {
    const res = await POST(
      new Request('http://localhost/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Tower' }),
      })
    );
    expect(res.status).toBe(400);
  });
});
