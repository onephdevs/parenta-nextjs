import { describe, expect, it } from 'vitest';

import { computeLeaseEndDate, getEffectiveLeaseMonths } from '@/lib/lease-dates';

describe('computeLeaseEndDate', () => {
  it('adds N months minus one day', () => {
    expect(computeLeaseEndDate('2026-08-17', 6)).toBe('2027-02-16');
  });

  it('returns empty for invalid input', () => {
    expect(computeLeaseEndDate('', 6)).toBe('');
    expect(computeLeaseEndDate('2026-08-17', 0)).toBe('');
  });
});

describe('getEffectiveLeaseMonths', () => {
  it('treats -1 as open-ended', () => {
    expect(getEffectiveLeaseMonths(-1)).toBe(0);
  });

  it('uses custom months when the preset is 0', () => {
    expect(getEffectiveLeaseMonths(0, 18)).toBe(18);
  });
});
