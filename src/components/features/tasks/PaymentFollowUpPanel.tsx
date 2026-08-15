'use client';

import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  PaymentStatusBadge,
  PaymentTypeBadge,
} from '@/components/domain/StatusBadges';
import { extractInvoiceIdFromNotes } from '@/lib/format-payment-notes';
import { looksLikeImage, useImageLightboxOptional } from '@/components/ui/ImageLightbox';
import ConfirmPaymentActions from '@/components/features/ConfirmPaymentActions';
import { PaymentClaimThreadPanel } from '@/components/features/payments/PaymentClaimThreadPanel';
import { getImageUrl } from '@/lib/format/image-url';
import {
  paymentClaimDisplayFields,
  extractInvoiceNumberFromNotes,
} from '@/lib/format/payment-claim-display';

interface InvoiceSummary {
  id: string;
  invoiceNumber?: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  paymentType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentDate?: string | Date;
  referenceNumber?: string;
  parentaTxnId?: string;
  notes?: string;
  receiptFilePath?: string;
  receiptFileName?: string;
}

interface PaymentFollowUpPanelProps {
  cardId: string;
  tenantId?: string;
  tenantName?: string;
  invoiceId?: string;
  buildingId?: string;
  roomId?: string;
  balanceAmount?: number;
  onClaimSettled?: (action: 'confirm' | 'reject') => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount || 0);
}

function asPaymentRows(value: unknown): PaymentRow[] {
  if (Array.isArray(value)) return value as PaymentRow[];
  if (value && typeof value === 'object') {
    const nested =
      (value as { payments?: unknown; data?: unknown }).payments ??
      (value as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested as PaymentRow[];
  }
  return [];
}

class PaymentPanelErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Something went wrong loading this claim',
    };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not open the payment claim on this card. Use Financial → Payments to
          confirm the receipt.
          <p className="mt-1 text-xs text-red-700">{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function PaymentFollowUpPanelInner({
  tenantId,
  invoiceId,
  onClaimSettled,
}: PaymentFollowUpPanelProps) {
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const { open: openLightbox } = useImageLightboxOptional();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(Boolean(tenantId));
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [threadTick, setThreadTick] = useState(0);

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
      setPayments(asPaymentRows(json.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, [tenantId]);

  const claimedInvoiceId = useMemo(() => {
    const preferred = [
      ...payments.filter(
        (payment) => (payment.paymentStatus || '').toLowerCase() === 'pending'
      ),
      ...payments.filter(
        (payment) => (payment.paymentStatus || '').toLowerCase() === 'failed'
      ),
    ];
    for (const payment of preferred) {
      const fromNotes = extractInvoiceIdFromNotes(payment.notes);
      if (fromNotes) return fromNotes;
    }
    return undefined;
  }, [payments]);

  const focusInvoiceId = claimedInvoiceId || invoiceId;

  const loadInvoice = useCallback(async () => {
    if (!focusInvoiceId) {
      setInvoice(null);
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(focusInvoiceId)}`);
      const json = await res.json();
      if (!res.ok || !json.success) return;
      setInvoice(json.data as InvoiceSummary);
    } catch {
      setInvoice(null);
    }
  }, [focusInvoiceId]);

  useEffect(() => {
    setError(null);
    void loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    if (tenantId && loadingPayments) return;
    void loadInvoice();
  }, [loadInvoice, loadingPayments, tenantId]);

  const paymentRows = Array.isArray(payments) ? payments : [];
  const openClaims = paymentRows.filter((p) =>
    ['pending', 'failed'].includes((p.paymentStatus || '').toLowerCase())
  );

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

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loadingPayments ? (
        <p className="text-sm text-gray-500">Loading claim…</p>
      ) : openClaims.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          No payment claim on this card.
        </p>
      ) : (
        openClaims.map((payment) => {
          const isPending =
            (payment.paymentStatus || '').toLowerCase() === 'pending';
          const isRejected =
            (payment.paymentStatus || '').toLowerCase() === 'failed';
          const claimInvoiceId = extractInvoiceIdFromNotes(payment.notes);
          const claimInvoiceNumber =
            extractInvoiceNumberFromNotes(payment.notes) ||
            (claimInvoiceId && invoice?.id === claimInvoiceId
              ? invoice.invoiceNumber
              : undefined);
          const claimRows = paymentClaimDisplayFields({
            amount: Number(payment.amount || 0),
            method: payment.paymentMethod,
            invoiceNumber: claimInvoiceNumber,
            parentaTxnId: payment.parentaTxnId,
            referenceNumber: payment.referenceNumber,
            notes: payment.notes,
          });
          const receiptUrl = payment.receiptFilePath
            ? getImageUrl(payment.receiptFilePath)
            : null;
          return (
            <div
              key={payment.id}
              className={
                isRejected
                  ? 'overflow-hidden rounded-xl border border-rose-200 bg-white'
                  : 'overflow-hidden rounded-xl border border-amber-200 bg-white'
              }
            >
              <div
                className={
                  isRejected
                    ? 'flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 bg-rose-50 px-4 py-3'
                    : 'flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3'
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  {payment.paymentStatus && (
                    <PaymentStatusBadge status={payment.paymentStatus} />
                  )}
                  {payment.paymentType && (
                    <PaymentTypeBadge type={payment.paymentType} />
                  )}
                  <a
                    href={`/admin/financial/payments/${payment.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Open payment
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                {isPending ? (
                  <ConfirmPaymentActions
                    compact
                    paymentId={payment.id}
                    referenceNumber={payment.referenceNumber}
                    invoiceNumber={claimInvoiceNumber}
                    parentaTxnId={payment.parentaTxnId}
                    amountLabel={formatCurrency(Number(payment.amount || 0))}
                    onDone={(action) => {
                      void loadPayments();
                      void loadInvoice();
                      setThreadTick((n) => n + 1);
                      onClaimSettled?.(action);
                    }}
                  />
                ) : (
                  <p className="text-sm text-rose-800">
                    Waiting for a new screenshot on this same request.
                  </p>
                )}
              </div>
              <dl className="divide-y divide-gray-100">
                {claimRows.map((row) => (
                  <div
                    key={`${row.label}-${row.value}`}
                    className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5"
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {row.label}
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
              {receiptUrl && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      void downloadReceipt(payment.id, payment.receiptFileName)
                    }
                    disabled={downloadingId === payment.id}
                    className="block overflow-hidden rounded-lg border border-gray-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptUrl}
                      alt={payment.receiptFileName || 'Receipt'}
                      className="h-28 w-auto max-w-full object-cover"
                    />
                  </button>
                </div>
              )}
              <div className="border-t border-gray-100 px-4 py-3">
                <PaymentClaimThreadPanel
                  key={`${payment.id}-${threadTick}`}
                  paymentId={payment.id}
                  variant="admin"
                  status={payment.paymentStatus}
                  title="Tenant conversation"
                  flush
                  conversationClassName="max-h-80"
                  onPosted={() => setThreadTick((n) => n + 1)}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function PaymentFollowUpPanel(props: PaymentFollowUpPanelProps) {
  return (
    <PaymentPanelErrorBoundary key={props.tenantId || props.cardId}>
      <PaymentFollowUpPanelInner {...props} />
    </PaymentPanelErrorBoundary>
  );
}
