import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllAssets = vi.fn().mockResolvedValue({ assets: [], total: 0 });
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/assets', () => ({
  getAllAssets,
  createAsset: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET, POST } = await import('@/app/api/assets/route');

describe('GET /api/assets', () => {
  beforeEach(() => {
    getAllAssets.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/assets') as never);
    expect(res.status).toBe(401);
  });

  it('forwards a list limit when provided', async () => {
    await GET(new Request('http://localhost/api/assets?limit=40') as never);
    expect(getAllAssets).toHaveBeenCalledWith(expect.objectContaining({ limit: 40 }));
  });

  it('drops a non-UUID buildingId', async () => {
    await GET(new Request('http://localhost/api/assets?buildingId=undefined') as never);
    expect(getAllAssets).toHaveBeenCalledWith(
      expect.objectContaining({ buildingId: undefined })
    );
  });
});

describe('POST /api/assets', () => {
  beforeEach(() => {
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('requires asset name and type', async () => {
    const res = await POST(
      new Request('http://localhost/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetName: 'Fridge' }),
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
