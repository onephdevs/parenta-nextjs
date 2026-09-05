import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllTenantsWithCredits = vi.fn().mockResolvedValue([]);
const createTenantCredit = vi.fn();
const adjustTenantCredit = vi.fn();
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/tenant-credits', () => ({
  getAllTenantsWithCredits,
  createTenantCredit,
  adjustTenantCredit,
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { GET, POST } = await import('@/app/api/tenant-credits/route');

describe('GET /api/tenant-credits', () => {
  beforeEach(() => {
    getAllTenantsWithCredits.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects non-admin sessions', async () => {
    getServerSession.mockResolvedValueOnce({ user: { role: 'tenant', id: 't1' } });
    const res = await GET(new Request('http://localhost/api/tenant-credits') as never);
    expect(res.status).toBe(401);
  });

  it('loads the credits report', async () => {
    const res = await GET(new Request('http://localhost/api/tenant-credits') as never);
    expect(res.status).toBe(200);
    expect(getAllTenantsWithCredits).toHaveBeenCalled();
  });
});

describe('POST /api/tenant-credits', () => {
  beforeEach(() => {
    createTenantCredit.mockReset();
    adjustTenantCredit.mockReset();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('requires tenantId and amount', async () => {
    const res = await POST(
      new Request('http://localhost/api/tenant-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 't1' }),
      }) as never
    );
    expect(res.status).toBe(400);
  });

  it('uses the adjust path when action is adjust', async () => {
    adjustTenantCredit.mockResolvedValueOnce({ id: 'c1' });
    const res = await POST(
      new Request('http://localhost/api/tenant-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 't1',
          amount: 100,
          action: 'adjust',
          description: 'Manual',
        }),
      }) as never
    );
    expect(res.status).toBe(200);
    expect(adjustTenantCredit).toHaveBeenCalledWith('t1', 100, 'Manual', true);
    expect(createTenantCredit).not.toHaveBeenCalled();
  });
});
