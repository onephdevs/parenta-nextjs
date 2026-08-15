import { formatPaymentMethodLabel } from '@/lib/constants/payment-methods';
import { stripInternalInvoiceId } from '@/lib/format-payment-notes';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export interface PaymentClaimDetailRow {
  label: string;
  value: string;
}

function extractMatch(text: string, re: RegExp): string | null {
  const match = text.match(re);
  return match?.[1]?.trim() || null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function extractInvoiceNumberFromNotes(notes?: string | null): string | null {
  const text = stripInternalInvoiceId(notes || '');
  const invoiceNumber =
    extractMatch(text, /\b(INV-[A-Z0-9-]+)\b/i) ||
    extractMatch(text, /claim for invoice\s+([^\s(]+)/i);
  if (!invoiceNumber || isUuid(invoiceNumber)) return null;
  return invoiceNumber;
}

/**
 * Structured rows for the payment-claim seed card (no invoice UUID).
 */
export function paymentClaimDisplayFields(input: {
  amount?: number | null;
  method?: string | null;
  invoiceNumber?: string | null;
  parentaTxnId?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
}): PaymentClaimDetailRow[] {
  const notes = stripInternalInvoiceId(input.notes || '');
  const rows: PaymentClaimDetailRow[] = [];

  const amount = Number(input.amount || 0);
  const method = input.method
    ? formatPaymentMethodLabel(input.method)
    : extractMatch(notes, /via\s+([^\n]+)/i);
  if (amount > 0) {
    rows.push({
      label: 'Submitted',
      value: method ? `${formatCurrency(amount)} via ${method}` : formatCurrency(amount),
    });
  }

  const invoiceNumber =
    extractInvoiceNumberFromNotes(notes) || input.invoiceNumber || null;
  if (invoiceNumber) {
    rows.push({ label: 'Invoice', value: invoiceNumber });
  }

  const parentaTxn =
    input.parentaTxnId || extractMatch(notes, /\b(txn-[a-z]+-\d+-\d+)\b/i);
  if (parentaTxn) {
    rows.push({ label: 'Transaction', value: parentaTxn });
  }

  const reference =
    input.referenceNumber ||
    extractMatch(notes, /GCash \/ bank reference:\s*(.+)$/im);
  if (reference) {
    rows.push({ label: 'Reference', value: reference });
  }

  if (/pay ahead/i.test(notes)) {
    rows.push({ label: 'Type', value: 'Pay ahead' });
  }

  const status = extractMatch(notes, /^Status:\s*(.+)$/im);
  if (status) {
    rows.push({ label: 'Status', value: status });
  }

  const tenantNotes =
    extractMatch(notes, /Tenant notes:\s*(.+)$/im) ||
    extractMatch(notes, /^Notes:\s*(.+)$/im);
  if (tenantNotes && tenantNotes.toLowerCase() !== 'pay ahead') {
    rows.push({ label: 'Notes', value: tenantNotes });
  }

  return rows;
}
