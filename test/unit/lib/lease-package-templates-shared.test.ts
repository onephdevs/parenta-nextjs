import { describe, expect, it } from 'vitest';

import {
  formatAdvanceLabel,
  formatDepositLabel,
  formatGraceLabel,
  formatPenaltyFeeLabel,
  formatTermLabel,
} from '@/lib/lease-package-templates-shared';

describe('lease package labels', () => {
  it('describes null term/deposit as not configured', () => {
    expect(formatTermLabel(null)).toBe('No fixed term');
    expect(formatDepositLabel(null)).toBe('Not required');
    expect(formatGraceLabel(null)).toBe('Not set');
  });

  it('pluralizes months and formats penalty fees', () => {
    expect(formatAdvanceLabel(1)).toBe('1 month');
    expect(formatAdvanceLabel(2)).toBe('2 months');
    expect(formatPenaltyFeeLabel('percentage', 5)).toBe('5%');
  });
});
