'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileText, Paperclip } from 'lucide-react';
import {
  InvoiceStatusBadge,
  PaymentStatusBadge,
  PaymentTypeBadge,
} from '@/components/domain/StatusBadges';
import { formatPaymentNotesDisplay, formatPaymentNotesForPeople } from '@/lib/format-payment-notes';
import {
  OpportunityDocumentsPanel,
  PAYMENT_DOC_TYPE_OPTIONS,
} from './OpportunityDocumentsPanel';
import { looksLikeImage, useImageLightbox } from '@/components/ui/ImageLightbox';

interface InvoiceSummary {
  id: string;
  invoiceNumber?: string;
  status?: string;
  issueDate?: string | Date;
  dueDate?: string | Date;
  totalAmount?: number;
  paidAmount?: number;
  description?: string;
  notes?: string;
  items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}

interface PaymentRow {
  id: string;
  amount: number;
  paymentType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentDate?: string | Date;
  referenceNumber?: string;
  notes?: string;
  receiptFilePath?: string;
  receiptFileName?: string;
}

interface PaymentFollowUpPanelProps {
  cardId: string;
  tenantId?: string;
  invoiceId?: string;
  buildingId?: string;
  roomId?: string;
  balanceAmount?: number;
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

function formatMethod(method?: string) {
  if (!method) return '—';
  return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function notesMentionInvoice(notes: string | undefined, invoiceId: string | undefined) {
  if (!notes || !invoiceId) return false;
  return notes.toLowerCase().includes(invoiceId.toLowerCase());
}

export function PaymentFollowUpPanel({
  cardId,
  tenantId,
  invoiceId,
  buildingId,
  roomId,
  balanceAmount,
}: PaymentFollowUpPanelProps) {
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const { open: openLightbox } = useImageLightbox();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loadingInvoice, setLoadingInvoice] = useState(Boolean(invoiceId));
  const [loadingPayments, setLoadingPayments] = useState(Boolean(tenantId));
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [depositBalance, setDepositBalance] = useState<number | null>(null);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      setInvoice(null);
      setLoadingInvoice(false);
      return;
    }
    setLoadingInvoice(true);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load invoice');
      }
      setInvoice(json.data as InvoiceSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
      setInvoice(null);
    } finally {
      setLoadingInvoice(false);
    }
  }, [invoiceId]);

  const loadPayments = useCallback(async () => {
    if (!tenantId) {
      setPayments([]);
      setLoadingPayments(false);
      return;
    }
    setLoadingPayments(true);
    try {
      const res = await fetch(
        `/api/payments?tenantId=${encodeURIComponent(tenantId)}&limit=12`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load payments');
      }
      setPayments((json.data || []) as PaymentRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, [tenantId]);

  useEffect(() => {
    setError(null);
    void loadInvoice();
    void loadPayments();
  }, [loadInvoice, loadPayments]);

  useEffect(() => {
    if (!tenantId) {
      setDepositBalance(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/deposit-ledger/${encodeURIComponent(tenantId)}?type=balance`
        );
        if (!res.ok) return;
        const data = await res.json();
        const bal =
          typeof data?.data === 'number'
            ? data.data
            : data?.data?.balance ?? data?.balance ?? null;
        if (!cancelled && bal != null) setDepositBalance(Number(bal));
      } catch {
        if (!cancelled) setDepositBalance(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function downloadReceipt(paymentId: string, fileNameHint?: string) {
    setDownloadingId(paymentId);
    try {
      const response = await fetch(`/api/payments/${paymentId}/receipt`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to download receipt');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match?.[1] || fileNameHint || `receipt-${paymentId}.pdf`;
      const url = URL.createObjectURL(blob);

      if (
        looksLikeImage({
          mimeType: blob.type,
          fileName,
        })
      ) {
        openLightbox({ src: url, alt: fileName, title: fileName });
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  }

  const balanceDue =
    invoice != null
      ? Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0))
      : balanceAmount != null
        ? Number(balanceAmount)
        : null;

  const recordPaymentHref =
    tenantId && invoiceId
      ? `/admin/financial/payments/new?tenantId=${encodeURIComponent(tenantId)}&invoiceId=${encodeURIComponent(invoiceId)}&amount=${encodeURIComponent(String(balanceDue ?? ''))}`
      : tenantId
        ? `/admin/financial/payments/new?tenantId=${encodeURIComponent(tenantId)}`
        : '/admin/financial/payments/new';

  const sortedPayments = [...payments].sort((a, b) => {
    const aMatch = notesMentionInvoice(a.notes, invoiceId) ? 1 : 0;
    const bMatch = notesMentionInvoice(b.notes, invoiceId) ? 1 : 0;
    return bMatch - aMatch;
  });

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Linked invoice — what this chase is for */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Invoice</h3>
            <p className="text-xs text-gray-500">
              What this follow-up is chasing — open Financial to record money.
            </p>
          </div>
          {invoiceId && (
            <a
              href={`/admin/financial/invoices/${invoiceId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
            >
              Open invoice
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {!invoiceId ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            No invoice linked to this card yet. Sync may attach one when rent is due.
          </div>
        ) : loadingInvoice ? (
          <p className="text-sm text-gray-500">Loading invoice…</p>
        ) : !invoice ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Invoice not found. It may have been deleted — check Financial.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {invoice.invoiceNumber || 'Invoice'}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Due {formatDate(invoice.dueDate)} · Issued {formatDate(invoice.issueDate)}
                </p>
              </div>
              {invoice.status && <InvoiceStatusBadge status={invoice.status} />}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-gray-500">Total</dt>
                <dd className="font-semibold text-gray-900">
                  {formatCurrency(Number(invoice.totalAmount || 0))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Paid</dt>
                <dd className="font-semibold text-green-700">
                  {formatCurrency(Number(invoice.paidAmount || 0))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Balance due</dt>
                <dd className="font-semibold text-gray-900">
                  {formatCurrency(balanceDue ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Line items</dt>
                <dd className="font-semibold text-gray-900">
                  {invoice.items?.length ?? 0}
                </dd>
              </div>
            </dl>

            {invoice.items && invoice.items.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-gray-200 pt-3">
                {invoice.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 text-gray-700">{item.description}</span>
                    <span className="shrink-0 font-medium text-gray-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {!invoice.items?.length && (invoice.description || invoice.notes) && (
              <p className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-700">
                {formatPaymentNotesForPeople(invoice.description || invoice.notes)}
              </p>
            )}

            {depositBalance != null &&
              depositBalance > 0 &&
              (balanceDue == null || balanceDue > 0) && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Using deposit: ₱{depositBalance.toLocaleString()} available. Recording a
                payment will apply deposit to unpaid invoices by default (cash first).
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-3">
              <a
                href={recordPaymentHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Record payment
              </a>
              {tenantId && (
                <a
                  href={`/admin/financial/payments?tenantId=${encodeURIComponent(tenantId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  All payments
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Payments — transaction ID, method, what for */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Recent payments</h3>
          <p className="text-xs text-gray-500">
            Transaction ID, method, and what each payment was for.
          </p>
        </div>

        {!tenantId ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            Link a tenant to see their payment history.
          </div>
        ) : loadingPayments ? (
          <p className="text-sm text-gray-500">Loading payments…</p>
        ) : sortedPayments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            No payments recorded for this tenant yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {sortedPayments.map((payment) => {
              const { label, billingPeriodLabel } = formatPaymentNotesDisplay(
                payment.notes
              );
              const linkedToInvoice = notesMentionInvoice(payment.notes, invoiceId);
              return (
                <li key={payment.id} className="px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(payment.amount || 0))}
                        <span className="ml-2 font-normal text-gray-500">
                          · {formatDate(payment.paymentDate)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-gray-700">
                        {label || 'No description'}
                      </p>
                      {billingPeriodLabel && (
                        <p className="text-xs text-gray-500">
                          Billing period: {billingPeriodLabel}
                        </p>
                      )}
                      {linkedToInvoice && (
                        <p className="mt-1 text-xs font-medium text-indigo-700">
                          Linked to this invoice
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {payment.paymentStatus && (
                        <PaymentStatusBadge status={payment.paymentStatus} />
                      )}
                      {payment.paymentType && (
                        <PaymentTypeBadge type={payment.paymentType} />
                      )}
                    </div>
                  </div>

                  <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-gray-500">Transaction ID</dt>
                      <dd className="font-mono text-sm font-semibold text-gray-900">
                        {payment.referenceNumber || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Method</dt>
                      <dd className="text-gray-800">
                        {formatMethod(payment.paymentMethod)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <a
                      href={`/admin/financial/payments/${payment.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                    >
                      Payment details
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {payment.receiptFilePath ? (
                      <button
                        type="button"
                        onClick={() =>
                          void downloadReceipt(payment.id, payment.receiptFileName)
                        }
                        disabled={downloadingId === payment.id}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:underline disabled:opacity-50"
                      >
                        <Paperclip className="h-3 w-3" />
                        {downloadingId === payment.id
                          ? 'Opening…'
                          : looksLikeImage({ fileName: payment.receiptFileName })
                            ? payment.receiptFileName || 'View receipt'
                            : payment.receiptFileName || 'Download receipt'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <FileText className="h-3 w-3" />
                        No receipt uploaded
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Card attachments */}
      <section className="space-y-3 border-t border-gray-100 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
          <p className="text-xs text-gray-500">
            Receipts, invoice copies, or screenshots attached to this chase card.
          </p>
        </div>
        <OpportunityDocumentsPanel
          cardId={cardId}
          buildingId={buildingId}
          roomId={roomId}
          description="Upload a receipt screenshot, bank transfer proof, or invoice copy for this follow-up."
          docTypeOptions={PAYMENT_DOC_TYPE_OPTIONS}
          defaultDocType="receipt"
        />
      </section>
    </div>
  );
}
