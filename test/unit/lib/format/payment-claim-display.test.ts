import { describe, expect, it } from 'vitest';

import {
  extractInvoiceNumberFromNotes,
  paymentClaimDisplayFields,
} from '@/lib/format/payment-claim-display';

describe('payment claim display', () => {
  it('extracts an INV- number and skips a UUID', () => {
    expect(extractInvoiceNumberFromNotes('claim for invoice INV-ABC-1')).toBe('INV-ABC-1');
    expect(
      extractInvoiceNumberFromNotes('claim for invoice aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    ).toBeNull();
  });

  it('builds structured rows without exposing invoice UUIDs', () => {
    const rows = paymentClaimDisplayFields({
      amount: 8000,
      method: 'gcash',
      invoiceNumber: 'INV-1',
      parentaTxnId: 'txn-r-000001-26',
      notes: 'Pay ahead\nGCash / bank reference: REF-9',
    });
    expect(rows.map((r) => r.label)).toEqual(
      expect.arrayContaining(['Submitted', 'Invoice', 'Transaction', 'Reference', 'Type'])
    );
  });
});
