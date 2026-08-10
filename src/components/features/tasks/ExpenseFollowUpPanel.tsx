'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileText, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ExpenseCategoryBadge } from '@/components/domain/StatusBadges';
import { Button } from '@/components/ui/Button';
import {
  formatPaymentNotesForPeople,
  formatPaymentNotesLabel,
} from '@/lib/format-payment-notes';
import {
  formatReportCategoryLabel,
  UTILITY_TYPE_LABELS,
} from '@/lib/constants/bills-expenses';
import {
  OpportunityDocumentsPanel,
  PAYMENT_DOC_TYPE_OPTIONS,
} from './OpportunityDocumentsPanel';
import { looksLikeImage, useImageLightbox } from '@/components/ui/ImageLightbox';

const EXPENSE_DOC_TYPE_OPTIONS = [
  { value: 'receipt', label: 'Receipt / proof of payment' },
  { value: 'utility_bill', label: 'Utility bill / invoice' },
  { value: 'invoice', label: 'Vendor invoice' },
  { value: 'other', label: 'Other' },
];

interface UtilityBillDetail {
  id: string;
  utilityType?: string;
  provider?: string;
  accountNumber?: string;
  amount?: number;
  billStatus?: string;
  dueDate?: string | Date;
  billingPeriodStart?: string | Date;
  billingPeriodEnd?: string | Date;
  usageAmount?: number;
  usageUnit?: string;
  meterReading?: number;
  billUrl?: string;
  notes?: string;
  buildingName?: string;
  roomNumber?: string;
}

interface ExpenseDetail {
  id: string;
  category?: string;
  description?: string;
  amount?: number;
  expenseDate?: string | Date;
  vendorName?: string;
  vendor?: string;
  vendorContact?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  expenseStatus?: string;
  notes?: string;
  buildingName?: string;
  roomNumber?: string;
}

interface ExpenseFollowUpPanelProps {
  cardId: string;
  expenseId?: string;
  utilityBillId?: string;
  buildingId?: string;
  roomId?: string;
  amount?: number;
  source?: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount || 0);
}

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatLabel(value?: string) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status?: string }) {
  const key = (status || 'pending').toLowerCase();
  const tone =
    key === 'paid'
      ? 'success'
      : key === 'approved'
        ? 'info'
        : key === 'overdue' || key === 'rejected' || key === 'disputed'
          ? 'danger'
          : key === 'pending'
            ? 'warning'
            : 'neutral';
  return <Badge tone={tone}>{formatLabel(key)}</Badge>;
}

function utilityTypeLabel(type?: string) {
  if (!type) return 'Utility';
  const key = type.toLowerCase() as keyof typeof UTILITY_TYPE_LABELS;
  return UTILITY_TYPE_LABELS[key] || formatLabel(type);
}

export function ExpenseFollowUpPanel({
  cardId,
  expenseId,
  utilityBillId,
  buildingId,
  roomId,
  amount,
  source,
}: ExpenseFollowUpPanelProps) {
  const [bill, setBill] = useState<UtilityBillDetail | null>(null);
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(utilityBillId || expenseId));
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const { open: openLightbox } = useImageLightbox();

  const load = useCallback(async () => {
    if (!utilityBillId && !expenseId) {
      setBill(null);
      setExpense(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (utilityBillId) {
        const res = await fetch(`/api/utilities/${encodeURIComponent(utilityBillId)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load utility bill');
        }
        setBill(json.data as UtilityBillDetail);
        setExpense(null);
      } else if (expenseId) {
        const res = await fetch(`/api/expenses/${encodeURIComponent(expenseId)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load expense');
        }
        setExpense(json.data as ExpenseDetail);
        setBill(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expense details');
      setBill(null);
      setExpense(null);
    } finally {
      setLoading(false);
    }
  }, [utilityBillId, expenseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markPaid() {
    setSavingStatus(true);
    setError(null);
    try {
      if (utilityBillId) {
        const res = await fetch(`/api/utilities/${encodeURIComponent(utilityBillId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ billStatus: 'paid' }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to mark bill paid');
        }
      } else if (expenseId) {
        const res = await fetch(`/api/expenses/${encodeURIComponent(expenseId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expenseStatus: 'paid' }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to mark expense paid');
        }
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  }

  const isUtility = Boolean(utilityBillId);
  const status = isUtility ? bill?.billStatus : expense?.expenseStatus;
  const isPaid = (status || '').toLowerCase() === 'paid';
  const displayAmount =
    bill?.amount ?? expense?.amount ?? amount ?? 0;

  const adminHref = utilityBillId
    ? '/admin/bills-expenses/utility-bills'
    : expenseId
      ? `/admin/financial/expenses/${expenseId}`
      : '/admin/financial/expenses';

  const receiptHref = bill?.billUrl || expense?.receiptUrl;

  function openReceiptFile() {
    if (!receiptHref) return;
    if (looksLikeImage({ url: receiptHref })) {
      openLightbox({
        src: receiptHref,
        alt: 'Receipt',
        title: 'Receipt',
      });
      return;
    }
    window.open(receiptHref, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {isUtility ? 'Utility bill' : expenseId ? 'Expense' : 'Bill / expense'}
            </h3>
            <p className="text-xs text-gray-500">
              What this card is for — amount, vendor/provider, paid status, and receipts.
            </p>
          </div>
          {(utilityBillId || expenseId) && (
            <a
              href={adminHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
            >
              Open in Financial
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {!utilityBillId && !expenseId ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            No linked utility bill or expense yet. Sync the Expenses board, or create the bill in
            Financial — cards sync from utility bills and vendor expenses.
            {source ? (
              <p className="mt-2 text-xs text-gray-400">Card source: {source}</p>
            ) : null}
          </div>
        ) : loading ? (
          <p className="text-sm text-gray-500">Loading expense details…</p>
        ) : bill ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {utilityTypeLabel(bill.utilityType)}
                  {bill.provider ? ` · ${bill.provider}` : ''}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {[bill.buildingName, bill.roomNumber].filter(Boolean).join(' · ') ||
                    'Building / room not set'}
                </p>
              </div>
              <StatusBadge status={bill.billStatus} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-gray-500">Amount</dt>
                <dd className="font-semibold text-gray-900">
                  {formatCurrency(Number(bill.amount || 0))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Due</dt>
                <dd className="font-semibold text-gray-900">{formatDate(bill.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Billing period</dt>
                <dd className="font-medium text-gray-900">
                  {formatDate(bill.billingPeriodStart)} – {formatDate(bill.billingPeriodEnd)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Account #</dt>
                <dd className="font-mono text-sm font-semibold text-gray-900">
                  {bill.accountNumber || '—'}
                </dd>
              </div>
            </dl>

            {(bill.usageAmount != null || bill.meterReading != null) && (
              <p className="mt-3 text-sm text-gray-700">
                Usage:{' '}
                <span className="font-medium">
                  {bill.usageAmount ?? bill.meterReading}
                  {bill.usageUnit ? ` ${bill.usageUnit}` : ''}
                </span>
              </p>
            )}

            {bill.notes && (
              <p className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-700">
                {formatPaymentNotesForPeople(bill.notes)}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-3">
              {!isPaid && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void markPaid()}
                  isLoading={savingStatus}
                  isDisabled={savingStatus}
                >
                  Mark as paid
                </Button>
              )}
              {receiptHref && (
                <button
                  type="button"
                  onClick={openReceiptFile}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {looksLikeImage({ url: receiptHref }) ? 'View bill file' : 'Open bill file'}
                </button>
              )}
            </div>
          </div>
        ) : expense ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {formatPaymentNotesLabel(
                    expense.description,
                    formatReportCategoryLabel(expense.category) || 'Expense'
                  )}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {[
                    expense.vendorName || expense.vendor,
                    expense.buildingName,
                    expense.roomNumber,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Vendor / property not set'}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {expense.category && (
                  <ExpenseCategoryBadge category={expense.category} />
                )}
                <StatusBadge status={expense.expenseStatus} />
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-gray-500">Amount</dt>
                <dd className="font-semibold text-gray-900">
                  {formatCurrency(Number(expense.amount || 0))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Expense date</dt>
                <dd className="font-semibold text-gray-900">
                  {formatDate(expense.expenseDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Payment method</dt>
                <dd className="font-medium text-gray-900">
                  {formatLabel(expense.paymentMethod)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Vendor contact</dt>
                <dd className="font-medium text-gray-900">
                  {expense.vendorContact || '—'}
                </dd>
              </div>
            </dl>

            {expense.notes && (
              <p className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-700">
                {formatPaymentNotesForPeople(expense.notes)}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-3">
              {!isPaid && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void markPaid()}
                  isLoading={savingStatus}
                  isDisabled={savingStatus}
                >
                  Mark as paid
                </Button>
              )}
              {receiptHref && (
                <button
                  type="button"
                  onClick={openReceiptFile}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {looksLikeImage({ url: receiptHref }) ? 'View receipt' : 'Open receipt'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Linked record not found. It may have been deleted — check Financial.
            {displayAmount > 0 && (
              <p className="mt-1">Card amount: {formatCurrency(displayAmount)}</p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-gray-100 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
          <p className="text-xs text-gray-500">
            Upload the bill PDF, receipt, or payment proof for this chase card.
          </p>
        </div>
        <OpportunityDocumentsPanel
          cardId={cardId}
          buildingId={buildingId}
          roomId={roomId}
          description="Attach utility bills, vendor invoices, or payment receipts."
          docTypeOptions={
            isUtility
              ? [
                  { value: 'utility_bill', label: 'Utility bill' },
                  { value: 'receipt', label: 'Payment receipt' },
                  { value: 'other', label: 'Other' },
                ]
              : EXPENSE_DOC_TYPE_OPTIONS.length
                ? EXPENSE_DOC_TYPE_OPTIONS
                : PAYMENT_DOC_TYPE_OPTIONS
          }
          defaultDocType={isUtility ? 'utility_bill' : 'receipt'}
        />
      </section>
    </div>
  );
}
