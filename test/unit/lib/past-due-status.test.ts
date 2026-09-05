import { describe, expect, it } from 'vitest';

import { getPastDueStatus, pastDueAmountClass } from '@/lib/past-due-status';

describe('getPastDueStatus', () => {
  it('marks 30+ days past due as escalated', () => {
    const status = getPastDueStatus({ balance: 8000, daysPastDue: 30 });
    expect(status.tier).toBe('escalated');
    expect(status.label).toBe('Escalated');
    expect(pastDueAmountClass(status)).toContain('text-red-600');
  });

  it('marks 1–29 days past due as late', () => {
    expect(getPastDueStatus({ balance: 100, daysPastDue: 1 }).label).toBe('1 day late');
    expect(getPastDueStatus({ balance: 100, daysPastDue: 12 }).label).toBe('12 days late');
  });

  it('marks unpaid balances due within 7 days as due soon', () => {
    expect(getPastDueStatus({ balance: 100, daysPastDue: 0, daysUntilDue: 0 }).label).toBe(
      'due today'
    );
    expect(getPastDueStatus({ balance: 100, daysPastDue: 0, daysUntilDue: 1 }).label).toBe(
      'due tomorrow'
    );
  });

  it('marks a zero balance as current', () => {
    expect(getPastDueStatus({ balance: 0, daysPastDue: 0 }).tier).toBe('current');
  });
});
