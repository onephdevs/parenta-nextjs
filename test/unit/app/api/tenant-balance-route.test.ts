import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();
const requireTenantAccess = vi.fn();
const getTenantCompleteDataByTenantId = vi.fn().mockResolvedValue({});
const getBuildingDepositConfig = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api/require-tenant-access', () => ({
  requireTenantAccess,
}));

vi.mock('@/lib/api/tenant-user-link', () => ({
  getTenantCompleteDataByTenantId,
}));

vi.mock('@/lib/api/building-deposit-config', () => ({
  getBuildingDepositConfig,
}));

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery },
  pool: { query: mockQuery },
}));

vi.mock('@/lib/services/late-fee-service', () => ({
  applyAutoLateFees: vi.fn(),
}));

vi.mock('@/lib/services/invoice-issue-timing', () => ({
  releaseDueInvoices: vi.fn(),
}));

const { GET } = await import('@/app/api/tenant/balance/route');

describe('GET /api/tenant/balance', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({
      rows: [
        {
          outstanding_amount: '0',
          outstanding_count: '0',
          past_due_amount: '0',
          past_due_count: '0',
          due_date: null,
          scheduled_due_date: null,
          negotiated_due_date: null,
          balance_due: '0',
          total_amount: '0',
          bill_status: null,
        },
      ],
      rowCount: 1,
    });
    requireTenantAccess.mockReset();
    getTenantCompleteDataByTenantId.mockReset();
    getTenantCompleteDataByTenantId.mockResolvedValue({});
  });

  it('rejects unauthenticated callers', async () => {
    requireTenantAccess.mockResolvedValueOnce({
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
      tenant: null,
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('scopes outstanding and past-due totals to the tenant', async () => {
    requireTenantAccess.mockResolvedValueOnce({
      error: null,
      tenant: { id: 't1' },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual(['t1']);
  });
});
