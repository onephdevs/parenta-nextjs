import { beforeEach, describe, expect, it, vi } from 'vitest';

const allocatePaymentToInvoices = vi.fn();
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/services/payment-allocator', () => ({
  allocatePaymentToInvoices,
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { POST } = await import('@/app/api/payments/allocate/route');

describe('POST /api/payments/allocate', () => {
  beforeEach(() => {
    allocatePaymentToInvoices.mockReset();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await POST(
      new Request('http://localhost/api/payments/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it('requires paymentId, tenantId, and paymentAmount', async () => {
    const res = await POST(
      new Request('http://localhost/api/payments/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: 'p1' }),
      }) as never
    );
    expect(res.status).toBe(400);
    expect(allocatePaymentToInvoices).not.toHaveBeenCalled();
  });
});
