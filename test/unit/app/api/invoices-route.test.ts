import { beforeEach, describe, expect, it, vi } from 'vitest';

const getInvoices = vi.fn().mockResolvedValue({ invoices: [], total: 0, page: 1, limit: 20 });
const createInvoice = vi.fn();
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/invoices', () => ({
  getInvoices,
  createInvoice,
}));

vi.mock('next-auth/next', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET, POST } = await import('@/app/api/invoices/route');

describe('GET /api/invoices', () => {
  beforeEach(() => {
    getInvoices.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects non-admin sessions', async () => {
    getServerSession.mockResolvedValueOnce({ user: { role: 'tenant', id: 't1' } });
    const res = await GET(new Request('http://localhost/api/invoices') as never);
    expect(res.status).toBe(401);
    expect(getInvoices).not.toHaveBeenCalled();
  });

  it('defaults to page 1 and limit 20', async () => {
    await GET(new Request('http://localhost/api/invoices') as never);
    expect(getInvoices).toHaveBeenCalledWith({}, 1, 20);
  });

  it('forwards status and tenant filters', async () => {
    await GET(
      new Request('http://localhost/api/invoices?status=overdue&tenantId=t1&page=3&limit=40') as never
    );
    expect(getInvoices).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'overdue', tenantId: 't1' }),
      3,
      40
    );
  });
});

describe('POST /api/invoices', () => {
  beforeEach(() => {
    createInvoice.mockReset();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('requires tenant, due date, and line items', async () => {
    const res = await POST(
      new Request('http://localhost/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 't1' }),
      }) as never
    );
    expect(res.status).toBe(400);
  });

  it('rejects line items missing a description', async () => {
    const res = await POST(
      new Request('http://localhost/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 't1',
          dueDate: '2026-09-15',
          items: [{ quantity: 1, unitPrice: 1000 }],
        }),
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
