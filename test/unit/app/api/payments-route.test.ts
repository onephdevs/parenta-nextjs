import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPayments = vi.fn().mockResolvedValue({ payments: [], total: 0 });
const requireAdminOrCaretaker = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'admin-1', role: 'admin' } },
}));

vi.mock('@/lib/api/payments', () => ({
  getPayments,
  createPayment: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdminOrCaretaker,
}));

vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));
vi.mock('@/lib/cache/memory-cache', () => ({ invalidateDashboardCache: vi.fn() }));
vi.mock('@/lib/db', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
  pool: { query: vi.fn(), connect: vi.fn() },
}));

const { GET, POST } = await import('@/app/api/payments/route');

describe('GET /api/payments', () => {
  beforeEach(() => {
    getPayments.mockClear();
    requireAdminOrCaretaker.mockReset();
    requireAdminOrCaretaker.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1', role: 'admin' } },
    });
  });

  it('rejects unauthenticated callers', async () => {
    requireAdminOrCaretaker.mockResolvedValueOnce({
      error: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
      }),
      session: null,
    });
    const res = await GET(new Request('http://localhost/api/payments'));
    expect(res.status).toBe(401);
  });

  it('defaults to page 1 and limit 20', async () => {
    await GET(new Request('http://localhost/api/payments'));
    expect(getPayments).toHaveBeenCalledWith({}, 1, 20);
  });

  it('forwards tenant and status filters with the requested page', async () => {
    await GET(
      new Request('http://localhost/api/payments?tenantId=t1&paymentStatus=completed&page=2&limit=50')
    );
    expect(getPayments).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', paymentStatus: 'completed' }),
      2,
      50
    );
  });
});

describe('POST /api/payments', () => {
  beforeEach(() => {
    requireAdminOrCaretaker.mockReset();
    requireAdminOrCaretaker.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1', role: 'admin' } },
    });
  });

  it('requires a tenant id', async () => {
    const res = await POST(
      new Request('http://localhost/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100, paymentType: 'rent', paymentDate: '2026-09-01' }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/tenant/i);
  });

  it('rejects a non-positive amount', async () => {
    const res = await POST(
      new Request('http://localhost/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 't1',
          amount: 0,
          paymentType: 'rent',
          paymentDate: '2026-09-01',
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('requires a payment type', async () => {
    const res = await POST(
      new Request('http://localhost/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 't1',
          amount: 500,
          paymentDate: '2026-09-01',
        }),
      })
    );
    expect(res.status).toBe(400);
  });
});
