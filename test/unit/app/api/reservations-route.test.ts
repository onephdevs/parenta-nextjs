import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllReservations = vi.fn().mockResolvedValue({ reservations: [], total: 0 });
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/reservations', () => ({
  getAllReservations,
  createReservation: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET, POST } = await import('@/app/api/reservations/route');

describe('GET /api/reservations', () => {
  beforeEach(() => {
    getAllReservations.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/reservations'));
    expect(res.status).toBe(401);
  });

  it('forwards status and limit filters', async () => {
    await GET(new Request('http://localhost/api/reservations?status=active&limit=25'));
    expect(getAllReservations).toHaveBeenCalledWith({ status: 'active', limit: 25 });
  });
});

describe('POST /api/reservations', () => {
  beforeEach(() => {
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('requires tenant, room, expiry, rate, and deposit', async () => {
    const res = await POST(
      new Request('http://localhost/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 't1' }),
      })
    );
    expect(res.status).toBe(400);
  });
});
