import { describe, expect, it } from 'vitest';

import {
  deriveBillStatusFromAmounts,
  dueDateForBillingMonth,
  getDaysPastDue,
  getEffectiveDueDate,
  getInvoiceBalance,
  getInvoiceCollectionStatus,
  isInvoiceOverdue,
  toDateOnly,
} from '@/lib/billing/invoice-due';

const NOW = new Date(2026, 8, 5);

describe('invoice due helpers', () => {
  it('parses date-only strings without UTC day shift', () => {
    expect(toDateOnly('2026-09-05')).toEqual(new Date(2026, 8, 5));
  });

  it('lets negotiated due date win over the scheduled due date', () => {
    expect(
      getEffectiveDueDate({
        dueDate: '2026-09-01',
        negotiatedDueDate: '2026-09-15',
      })
    ).toEqual(new Date(2026, 8, 15));
  });

  it('prefers stored balance_due over total minus paid', () => {
    expect(getInvoiceBalance({ balance_due: 250, total_amount: 8000, amount_paid: 1000 })).toBe(
      250
    );
    expect(getInvoiceBalance({ totalAmount: 8000, amountPaid: 2000 })).toBe(6000);
  });

  it('derives PAID / PARTIAL / UNPAID from amounts', () => {
    expect(deriveBillStatusFromAmounts(8000, 8000)).toBe('PAID');
    expect(deriveBillStatusFromAmounts(8000, 2000)).toBe('PARTIAL');
    expect(deriveBillStatusFromAmounts(8000, 0)).toBe('UNPAID');
  });

  it('trusts a stored bill_status when it is a collection status', () => {
    expect(getInvoiceCollectionStatus({ bill_status: 'PARTIAL', balance_due: 0 })).toBe('PARTIAL');
  });

  it('counts days past the effective due date', () => {
    expect(getDaysPastDue({ dueDate: '2026-09-01' }, NOW)).toBe(4);
    expect(getDaysPastDue({ dueDate: '2026-09-10' }, NOW)).toBe(0);
  });

  it('is overdue only when there is a balance after the due date', () => {
    expect(isInvoiceOverdue({ dueDate: '2026-09-01', balanceDue: 100 }, NOW)).toBe(true);
    expect(isInvoiceOverdue({ dueDate: '2026-09-01', balanceDue: 0 }, NOW)).toBe(false);
  });

  it('clamps due day into the calendar month (Feb 31 → 28)', () => {
    expect(dueDateForBillingMonth(2026, 1, 31)).toEqual(new Date(2026, 1, 28));
  });
});
