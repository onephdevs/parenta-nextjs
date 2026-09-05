import { describe, expect, it } from 'vitest';

import { formatCurrency, getCurrencySymbol, parseCurrency } from '@/lib/utils/formatCurrency';

describe('formatCurrency', () => {
  it('formats PHP with two decimal places', () => {
    expect(formatCurrency(1500.5, 'PHP')).toMatch(/1,500\.50/);
  });

  it('treats non-finite amounts as zero', () => {
    expect(formatCurrency(Number.NaN)).toMatch(/0\.00/);
  });

  it('parses a formatted string back to a number', () => {
    expect(parseCurrency('₱1,250.75')).toBe(1250.75);
  });

  it('returns the PHP peso symbol by default', () => {
    expect(getCurrencySymbol()).toBe('₱');
  });
});
