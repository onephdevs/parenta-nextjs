import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllMeterReadings = vi.fn().mockResolvedValue({
  readings: [],
  total: 0,
  limit: 20,
  offset: 0,
});
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/meterReadings', () => ({
  getAllMeterReadings,
  createMeterReading: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET, POST } = await import('@/app/api/meter-readings/route');

describe('GET /api/meter-readings', () => {
  beforeEach(() => {
    getAllMeterReadings.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/meter-readings') as never);
    expect(res.status).toBe(401);
  });

  it('defaults to limit 20', async () => {
    await GET(new Request('http://localhost/api/meter-readings') as never);
    expect(getAllMeterReadings).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 })
    );
  });
});

describe('POST /api/meter-readings', () => {
  beforeEach(() => {
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('requires building, utility type, date, and reading value', async () => {
    const res = await POST(
      new Request('http://localhost/api/meter-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId: 'b1' }),
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
