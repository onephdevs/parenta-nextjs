import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
  pool: { query: vi.fn(), connect: vi.fn() },
}));

const { deriveInvoiceStatus } = await import('@/lib/services/invoice-status-recalculator');

const NOW = new Date(2026, 8, 5);

describe('deriveInvoiceStatus', () => {
  it('keeps cancelled invoices cancelled', () => {
    expect(
      deriveInvoiceStatus({
        totalAmount: 8000,
        totalPaid: 0,
        dueDate: '2026-09-01',
        currentStatus: 'cancelled',
        now: NOW,
      }).newStatus
    ).toBe('cancelled');
  });

  it('keeps unpaid future-dated invoices as draft', () => {
    expect(
      deriveInvoiceStatus({
        totalAmount: 8000,
        totalPaid: 0,
        dueDate: '2026-10-05',
        issueDate: '2026-10-01',
        currentStatus: 'draft',
        now: NOW,
      }).newStatus
    ).toBe('draft');
  });

  it('marks fully paid invoices paid', () => {
    const result = deriveInvoiceStatus({
      totalAmount: 8000,
      totalPaid: 8000,
      dueDate: '2026-09-01',
      now: NOW,
    });
    expect(result.newStatus).toBe('paid');
    expect(result.billStatus).toBe('PAID');
  });

  it('marks unpaid past-due invoices overdue', () => {
    expect(
      deriveInvoiceStatus({
        totalAmount: 8000,
        totalPaid: 0,
        dueDate: '2026-09-01',
        now: NOW,
      }).newStatus
    ).toBe('overdue');
  });

  it('uses negotiated due date when deciding overdue', () => {
    expect(
      deriveInvoiceStatus({
        totalAmount: 8000,
        totalPaid: 0,
        dueDate: '2026-09-01',
        negotiatedDueDate: '2026-09-20',
        now: NOW,
      }).newStatus
    ).toBe('sent');
  });
});
