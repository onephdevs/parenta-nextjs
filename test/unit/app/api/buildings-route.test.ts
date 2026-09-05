import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllBuildings = vi.fn().mockResolvedValue({
  buildings: [],
  pagination: { page: 1, limit: 100, total: 0 },
});

vi.mock('@/lib/api/buildings', () => ({
  getAllBuildings,
  createBuilding: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin: vi.fn(async () => ({ error: null, session: { user: { id: 'admin-1' } } })),
}));

vi.mock('@/lib/services/activity-logger', () => ({
  logActivitySafe: vi.fn(),
}));

const { GET } = await import('@/app/api/buildings/route');

describe('GET /api/buildings', () => {
  beforeEach(() => {
    getAllBuildings.mockClear();
    getAllBuildings.mockResolvedValue({
      buildings: [],
      pagination: { page: 1, limit: 100, total: 0 },
    });
  });

  it('defaults to 100 buildings and caps the roster at 200', async () => {
    await GET(new Request('http://localhost/api/buildings'));
    expect(getAllBuildings).toHaveBeenCalledWith({ limit: 100 });

    await GET(new Request('http://localhost/api/buildings?limit=999'));
    expect(getAllBuildings).toHaveBeenCalledWith({ limit: 200 });
  });
});
