import { describe, expect, it } from 'vitest';

import {
  formatParentaOrId,
  formatParentaTxnId,
  parseParentaTxnId,
  txnTypeFromPaymentType,
} from '@/lib/constants/transaction-ids';

describe('transaction ids', () => {
  it('formats and parses txn-r-000042-26', () => {
    expect(formatParentaTxnId('r', 42, 26)).toBe('txn-r-000042-26');
    expect(parseParentaTxnId('txn-r-000042-26')).toEqual({
      type: 'r',
      sequence: 42,
      yearYy: 26,
    });
  });

  it('maps payment types onto txn letter codes', () => {
    expect(txnTypeFromPaymentType('deposit')).toBe('d');
    expect(txnTypeFromPaymentType('utility')).toBe('b');
    expect(txnTypeFromPaymentType('rent')).toBe('r');
  });

  it('uses a separate OR prefix', () => {
    expect(formatParentaOrId('r', 42, 26)).toBe('or-r-000042-26');
  });
});
