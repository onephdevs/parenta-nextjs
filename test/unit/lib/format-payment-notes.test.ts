import { describe, expect, it } from 'vitest';

import {
  extractInvoiceIdFromNotes,
  formatPaymentNotesForPeople,
  parsePaymentNotes,
  preserveLedgerTagOnSave,
  stripInternalInvoiceId,
} from '@/lib/format-payment-notes';

const TAG = '[ledger:2026-06-16:2026-07-15]';
const UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('payment notes', () => {
  it('hides ledger tags and invoice UUIDs from people', () => {
    const parsed = parsePaymentNotes(`Electric unpaid 835 ${TAG} (invoice_id=${UUID})`);
    expect(parsed.label).toBe('Electric unpaid 835');
    expect(parsed.periodStart).toBe('2026-06-16');
    expect(extractInvoiceIdFromNotes(`claim (invoice_id=${UUID})`)).toBe(UUID);
    expect(stripInternalInvoiceId(`hello (invoice_id=${UUID})`)).toBe('hello');
  });

  it('shows a billing period on the people-facing string', () => {
    expect(formatPaymentNotesForPeople(`Electric ${TAG}`)).toMatch(/Billing period:/);
  });

  it('re-attaches the ledger tag when saving an edited label', () => {
    expect(preserveLedgerTagOnSave('Electric unpaid', `old ${TAG}`)).toBe(
      `Electric unpaid ${TAG}`
    );
  });
});
