import { describe, expect, it } from 'vitest';

import { formatLeaseTerm, formatLeaseTermShort, ordinalDay } from '@/lib/leases-shared';

describe('lease labels', () => {
  it('formats open-ended terms', () => {
    expect(formatLeaseTerm('2026-09-01', null)).toBe('Sep 1, 2026 – Open-ended');
  });

  it('shortens same-year terms', () => {
    expect(formatLeaseTermShort('2026-01-01', '2026-12-31')).toBe('Jan–Dec 2026');
  });

  it('uses English ordinals for rent due day', () => {
    expect(ordinalDay(1)).toBe('1st');
    expect(ordinalDay(2)).toBe('2nd');
    expect(ordinalDay(3)).toBe('3rd');
    expect(ordinalDay(11)).toBe('11th');
    expect(ordinalDay(22)).toBe('22nd');
  });
});
