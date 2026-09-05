import { describe, expect, it } from 'vitest';

import {
  billingCycleStartDayFromDate,
  resolveRentDueDay,
} from '@/lib/billing/billing-cycle';

describe('billingCycleStartDayFromDate', () => {
  it('uses the UTC day of the move-in date', () => {
    expect(billingCycleStartDayFromDate('2026-09-17T00:00:00.000Z')).toBe(17);
  });

  it('returns null for missing or invalid dates', () => {
    expect(billingCycleStartDayFromDate(null)).toBeNull();
    expect(billingCycleStartDayFromDate('not-a-date')).toBeNull();
  });
});

describe('resolveRentDueDay', () => {
  it('prefers the stored assignment day', () => {
    expect(
      resolveRentDueDay({ billingCycleStartDay: 12, startDate: '2026-01-03', fallbackDay: 5 })
    ).toBe(12);
  });

  it('derives from start date when the stored day is missing', () => {
    expect(resolveRentDueDay({ startDate: '2026-09-08T00:00:00.000Z', fallbackDay: 5 })).toBe(8);
  });

  it('falls back to day 5 when nothing else is available', () => {
    expect(resolveRentDueDay({})).toBe(5);
  });
});
