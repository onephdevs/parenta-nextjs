'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { PaymentStatusBadge, PaymentTypeBadge } from '@/components/domain/StatusBadges';
import { PaymentClaimThreadPanel } from '@/components/features/payments/PaymentClaimThreadPanel';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { LightboxImage } from '@/components/ui/ImageLightbox';
import { cn } from '@/lib/utils';
import { paymentClaimDisplayFields } from '@/lib/format/payment-claim-display';
import { TenantReplaceReceiptForm } from '@/components/features/tenant/TenantReplaceReceiptForm';

interface PaymentClaimDetail {
  id: string;
  amount: number;
  paymentType?: string;
  paymentMethod?: string;
  status: string;
  paymentDate?: string;
  referenceNumber?: string | null;
  parentaTxnId?: string | null;
  notes?: string | null;
  roomNumber?: string | null;
  buildingName?: string | null;
  invoiceNumber?: string | null;
  receiptFileName?: string | null;
  receiptUrl?: string | null;
  createdAt: string;
  tenantName?: string;
  tenantAvatarUrl?: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusHelp(status: string) {
  const key = status.toLowerCase();
  if (key === 'pending') {
    return 'The office is reviewing your receipt. You can add a note or photo below.';
  }
  if (key === 'failed') {
    return 'The office could not confirm this screenshot. Reply below or send a new one — this request stays open.';
  }
  if (key === 'completed' || key === 'paid') {
    return 'The office confirmed this payment. Your balance has been updated.';
  }
  return 'Track this payment and message the office if you have a question.';
}

export default function TenantPaymentClaimPage() {
  const { status } = useSession();
  const params = useParams();
  const router = useRouter();
  const { showNotification } = useNotifications();
  const { canAccess, isLoading: gateLoading, isPreview } = useTenantPortalGate();
  const theme = useTenantTheme();
  const paymentId = String(params?.id || '');

  const [claim, setClaim] = useState<PaymentClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!paymentId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/payments/${encodeURIComponent(paymentId)}`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Payment not found');
      }
      setClaim(json.data as PaymentClaimDetail);
    } catch (error) {
      setClaim(null);
      showNotification({
        type: 'error',
        title: 'Could not load payment',
        message: error instanceof Error ? error.message : 'Try again',
      });
    } finally {
      setLoading(false);
    }
  }, [paymentId, showNotification]);

  useEffect(() => {
    if (gateLoading || status === 'loading') return;
    if (!canAccess) {
      if (status === 'unauthenticated') {
        router.push('/auth/signin?role=tenant');
      }
      return;
    }
    void load();
  }, [canAccess, gateLoading, load, router, status]);

  if (gateLoading || status === 'loading' || loading) {
    return <TenantPageSkeleton />;
  }

  if (!claim) {
    return (
      <div className={theme.page}>
        <main className={theme.pagePad}>
          <Link
            href="/tenant/payments?tab=pay"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to payments
          </Link>
          <p className="mt-6 text-sm text-gray-500">This payment was not found.</p>
        </main>
      </div>
    );
  }

  const location = [claim.buildingName, claim.roomNumber].filter(Boolean).join(' · ');
  const claimRows = paymentClaimDisplayFields({
    amount: claim.amount,
    method: claim.paymentMethod,
    invoiceNumber: claim.invoiceNumber,
    parentaTxnId: claim.parentaTxnId,
    referenceNumber: claim.referenceNumber,
    notes: claim.notes,
  });

  return (
    <div className={theme.page}>
      <main className={theme.pagePad}>
        <Link
          href="/tenant/payments?tab=pay"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to payments
        </Link>

        <div className={cn(theme.formPanel, 'mt-4 overflow-hidden')}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <PaymentStatusBadge status={claim.status} />
              {claim.paymentType ? <PaymentTypeBadge type={claim.paymentType} /> : null}
            </div>
            <p className="text-sm text-gray-500">
              {[formatDate(claim.paymentDate || claim.createdAt), location]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <dl className="divide-y divide-gray-100">
            {claimRows.map((row) => (
              <div
                key={`${row.label}-${row.value}`}
                className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5 sm:px-5"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {row.label}
                </dt>
                <dd className="text-sm font-medium text-gray-900">{row.value}</dd>
              </div>
            ))}
          </dl>

          {claim.receiptUrl ? (
            <div className="border-t border-gray-100 px-4 py-3 sm:px-5">
              <LightboxImage
                src={claim.receiptUrl}
                alt={claim.receiptFileName || 'Receipt'}
                title={claim.receiptFileName || 'Receipt'}
                className="h-28 w-auto max-w-full object-cover"
                wrapperClassName="block overflow-hidden rounded-lg border border-gray-200"
              />
            </div>
          ) : null}

          <p className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600 sm:px-5">
            {statusHelp(claim.status)}
          </p>

          {claim.status.toLowerCase() === 'failed' && !isPreview ? (
            <div className="border-t border-gray-100 px-4 py-3 sm:px-5">
              <TenantReplaceReceiptForm
                paymentId={claim.id}
                onUploaded={() => void load()}
              />
            </div>
          ) : null}

          <div className="border-t border-gray-100 px-4 py-3 sm:px-5">
            <PaymentClaimThreadPanel
              paymentId={claim.id}
              variant="tenant"
              status={claim.status}
              title="Office conversation"
              flush
              disabled={isPreview}
              conversationClassName="max-h-[min(50vh,28rem)]"
              tenantAvatarUrl={claim.tenantAvatarUrl}
              onPosted={() => void load()}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
