import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateInvoicesForTenant = vi.fn();
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/services/invoice-generator', () => ({
  generateInvoicesForTenant,
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { POST } = await import('@/app/api/invoices/generate/route');

describe('POST /api/invoices/generate', () => {
  beforeEach(() => {
    generateInvoicesForTenant.mockReset();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await POST(
      new Request('http://localhost/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it('requires tenant, room, lease dates, and monthly rent', async () => {
    const res = await POST(
      new Request('http://localhost/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 't1', monthlyRent: 8000 }),
      }) as never
    );
    expect(res.status).toBe(400);
    expect(generateInvoicesForTenant).not.toHaveBeenCalled();
  });
});
