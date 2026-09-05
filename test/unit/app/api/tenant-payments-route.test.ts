import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();
const requireTenantAccess = vi.fn();

vi.mock('@/lib/api/require-tenant-access', () => ({
  requireTenantAccess,
}));

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery },
  pool: { query: mockQuery },
}));

vi.mock('@/lib/services/invoice-issue-timing', () => ({
  releaseDueInvoices: vi.fn(),
}));

const { GET } = await import('@/app/api/tenant/payments/route');

describe('GET /api/tenant/payments', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({
      rows: [
        {
          total_payments: 0,
          total_paid: 0,
          total_pending: 0,
          total_overdue: 0,
          upcoming_invoices: 0,
          outstanding_balance: 0,
        },
      ],
      rowCount: 1,
    });
    requireTenantAccess.mockReset();
  });

  it('rejects unauthenticated callers', async () => {
    requireTenantAccess.mockResolvedValueOnce({
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
      tenant: null,
    });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('loads a bounded schedule and history for the tenant', async () => {
    requireTenantAccess.mockResolvedValueOnce({
      error: null,
      tenant: { id: 't1' },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).toMatch(/LIMIT 50/);
    expect(sql).toMatch(/LIMIT 6/);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual(['t1']);
  });
});
