/**
 * Single source of truth for invoice due dates, collection status, and day deltas.
 * All payment/pipeline/dashboard/report/reminder paths should use these helpers
 * (or EFFECTIVE_DUE_SQL in SQL) so negotiatedDueDate is never ignored.
 */

export type BillCollectionStatus = 'PAID' | 'UNPAID' | 'PARTIAL';

export type InvoiceDueFields = {
  dueDate?: Date | string | null;
  due_date?: Date | string | null;
  negotiatedDueDate?: Date | string | null;
  negotiated_due_date?: Date | string | null;
};

export type InvoiceBalanceFields = {
  totalAmount?: number | string | null;
  total_amount?: number | string | null;
  amountPaid?: number | string | null;
  amount_paid?: number | string | null;
  balanceDue?: number | string | null;
  balance_due?: number | string | null;
  billStatus?: string | null;
  bill_status?: string | null;
};

/** SQL expression — alias the invoices table as `i`. */
export const EFFECTIVE_DUE_SQL = 'COALESCE(i.negotiated_due_date, i.due_date)';

export function toDateOnly(value: Date | string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const raw = String(value).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function getScheduledDueDate(invoice: InvoiceDueFields): Date | null {
  return toDateOnly(invoice.dueDate ?? invoice.due_date ?? null);
}

/** negotiatedDueDate wins over the original scheduled due_date. */
export function getEffectiveDueDate(invoice: InvoiceDueFields): Date | null {
  return (
    toDateOnly(invoice.negotiatedDueDate ?? invoice.negotiated_due_date ?? null) ??
    getScheduledDueDate(invoice)
  );
}

export function getInvoiceBalance(invoice: InvoiceBalanceFields): number {
  if (invoice.balanceDue != null || invoice.balance_due != null) {
    return Number(invoice.balanceDue ?? invoice.balance_due) || 0;
  }
  const total = Number(invoice.totalAmount ?? invoice.total_amount) || 0;
  const paid = Number(invoice.amountPaid ?? invoice.amount_paid) || 0;
  return total - paid;
}

/**
 * Formal collection status (PAID | UNPAID | PARTIAL).
 * Distinct from workflow invoice_status (draft/sent/overdue/cancelled).
 */
export function getInvoiceCollectionStatus(
  invoice: InvoiceBalanceFields
): BillCollectionStatus {
  const stored = String(invoice.billStatus ?? invoice.bill_status ?? '')
    .toUpperCase()
    .trim();
  if (stored === 'PAID' || stored === 'UNPAID' || stored === 'PARTIAL') {
    return stored;
  }
  const balance = getInvoiceBalance(invoice);
  const paid = Number(invoice.amountPaid ?? invoice.amount_paid) || 0;
  if (balance <= 0.009) return 'PAID';
  if (paid > 0.009) return 'PARTIAL';
  return 'UNPAID';
}

export function deriveBillStatusFromAmounts(
  totalAmount: number,
  amountPaid: number
): BillCollectionStatus {
  const balance = totalAmount - amountPaid;
  if (balance <= 0.009) return 'PAID';
  if (amountPaid > 0.009) return 'PARTIAL';
  return 'UNPAID';
}

export function getDaysPastDue(
  invoiceOrDue: InvoiceDueFields | Date | string | null,
  now: Date = new Date()
): number {
  const due =
    invoiceOrDue instanceof Date || typeof invoiceOrDue === 'string' || invoiceOrDue == null
      ? toDateOnly(invoiceOrDue)
      : getEffectiveDueDate(invoiceOrDue);
  if (!due) return 0;
  const today = toDateOnly(now)!;
  const diff = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

export function getDaysUntilDue(
  invoiceOrDue: InvoiceDueFields | Date | string | null,
  now: Date = new Date()
): number | null {
  const due =
    invoiceOrDue instanceof Date || typeof invoiceOrDue === 'string' || invoiceOrDue == null
      ? toDateOnly(invoiceOrDue)
      : getEffectiveDueDate(invoiceOrDue);
  if (!due) return null;
  const today = toDateOnly(now)!;
  return Math.floor((due.getTime() - today.getTime()) / 86_400_000);
}

export function isInvoiceOverdue(
  invoice: InvoiceDueFields & InvoiceBalanceFields,
  now: Date = new Date()
): boolean {
  const balance = getInvoiceBalance(invoice);
  if (balance <= 0.009) return false;
  const daysPast = getDaysPastDue(invoice, now);
  return daysPast > 0;
}

/** Clamp day-of-month into a valid calendar date for year/month. */
export function dueDateForBillingMonth(
  year: number,
  monthIndex: number,
  dayOfMonth: number
): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const day = Math.min(Math.max(1, dayOfMonth), lastDay);
  return new Date(year, monthIndex, day);
}
