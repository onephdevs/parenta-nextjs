import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
  pool: { query: vi.fn(), connect: vi.fn() },
}));

const { resolveLeaseInvoiceEndDate } = await import('@/lib/services/invoice-generator');

describe('resolveLeaseInvoiceEndDate', () => {
  it('uses the explicit lease end when present', () => {
    expect(resolveLeaseInvoiceEndDate('2026-01-01', '2026-12-31')).toEqual(new Date('2026-12-31'));
  });

  it('schedules 12 months from today when the lease is open-ended and already started', () => {
    const start = new Date('2020-01-01');
    const end = resolveLeaseInvoiceEndDate(start, null);
    const expected = new Date();
    expected.setMonth(expected.getMonth() + 12);
    expect(end.getFullYear()).toBe(expected.getFullYear());
    expect(end.getMonth()).toBe(expected.getMonth());
  });
});
