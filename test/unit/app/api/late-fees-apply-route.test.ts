import { beforeEach, describe, expect, it, vi } from 'vitest';

const applyLateFees = vi.fn();
const isLateFeesEnabled = vi.fn();
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/services/late-fee-service', () => ({
  applyLateFees,
}));

vi.mock('@/lib/ops-policy-settings', () => ({
  isLateFeesEnabled,
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { POST } = await import('@/app/api/late-fees/apply/route');

describe('POST /api/late-fees/apply', () => {
  beforeEach(() => {
    applyLateFees.mockReset();
    isLateFeesEnabled.mockReset();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await POST(
      new Request('http://localhost/api/late-fees/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when late fees are disabled', async () => {
    isLateFeesEnabled.mockResolvedValueOnce(false);
    const res = await POST(
      new Request('http://localhost/api/late-fees/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: true }),
      }) as never
    );
    expect(res.status).toBe(403);
    expect(applyLateFees).not.toHaveBeenCalled();
  });

  it('applies late fees when the policy is on', async () => {
    isLateFeesEnabled.mockResolvedValueOnce(true);
    applyLateFees.mockResolvedValueOnce({
      success: true,
      fees_applied: 1,
      total_fee_amount: 100,
      applications: [],
      errors: [],
    });
    const res = await POST(
      new Request('http://localhost/api/late-fees/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_ids: ['i1'], dry_run: true }),
      }) as never
    );
    expect(res.status).toBe(200);
    expect(applyLateFees).toHaveBeenCalledWith(['i1'], true);
  });
});
