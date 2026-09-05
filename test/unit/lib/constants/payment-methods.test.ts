import { describe, expect, it } from 'vitest';

import {
  formatPaymentMethodLabel,
  isAllowedPaymentType,
  resolveAllowedPaymentType,
  toCanonicalPaymentMethod,
} from '@/lib/constants/payment-methods';

describe('payment methods', () => {
  it('canonicalizes aliases like gcash spacing and check/cheque', () => {
    expect(toCanonicalPaymentMethod('GCash')).toBe('gcash');
    expect(toCanonicalPaymentMethod('check')).toBe('cheque');
    expect(toCanonicalPaymentMethod('mystery')).toBe('other');
  });

  it('formats a human label', () => {
    expect(formatPaymentMethodLabel('bank_transfer')).not.toBe('—');
  });

  it('falls back to rent for unknown payment types', () => {
    expect(isAllowedPaymentType('rent')).toBe(true);
    expect(resolveAllowedPaymentType('not-a-type')).toBe('rent');
  });
});
