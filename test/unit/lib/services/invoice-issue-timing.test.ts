import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
  pool: { query: vi.fn(), connect: vi.fn() },
}));

const { initialInvoiceStatusForIssueDate } = await import(
  '@/lib/services/invoice-issue-timing'
);

describe('initialInvoiceStatusForIssueDate', () => {
  const now = new Date(2026, 8, 5);

  it('sends invoices whose issue date is today or earlier', () => {
    expect(initialInvoiceStatusForIssueDate(new Date(2026, 8, 5), now)).toBe('sent');
    expect(initialInvoiceStatusForIssueDate(new Date(2026, 8, 1), now)).toBe('sent');
  });

  it('keeps future-dated invoices as draft', () => {
    expect(initialInvoiceStatusForIssueDate(new Date(2026, 9, 1), now)).toBe('draft');
  });
});
