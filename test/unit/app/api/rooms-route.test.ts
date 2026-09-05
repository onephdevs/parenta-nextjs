import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllRooms = vi.fn().mockResolvedValue({
  rooms: [],
  pagination: { page: 1, limit: 50, total: 0 },
});
const requireAdmin = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'admin-1' } },
}));

vi.mock('@/lib/api/rooms', () => ({
  getAllRooms,
  createRoom: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin,
}));

vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET, POST } = await import('@/app/api/rooms/route');

describe('GET /api/rooms', () => {
  beforeEach(() => {
    getAllRooms.mockClear();
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
    const res = await GET(new Request('http://localhost/api/rooms'));
    expect(res.status).toBe(401);
  });

  it('loads the default page when no filters are set', async () => {
    await GET(new Request('http://localhost/api/rooms'));
    expect(getAllRooms).toHaveBeenCalledWith(undefined);
  });

  it('forwards building and status filters', async () => {
    await GET(new Request('http://localhost/api/rooms?buildingId=b1&roomStatus=vacant'));
    expect(getAllRooms).toHaveBeenCalledWith({
      buildingId: 'b1',
      roomStatus: 'vacant',
    });
  });
});

describe('POST /api/rooms', () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1' } },
    });
  });

  it('requires building, room number, and type', async () => {
    const res = await POST(
      new Request('http://localhost/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomNumber: '101' }),
      })
    );
    expect(res.status).toBe(400);
  });
});
