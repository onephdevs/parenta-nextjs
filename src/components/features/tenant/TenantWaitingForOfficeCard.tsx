'use client';

import Link from 'next/link';
import { ChevronRight, MessageSquare } from 'lucide-react';
import {
  PaymentStatusBadge,
  PaymentTypeBadge,
} from '@/components/domain/StatusBadges';
import { formatPaymentMethodLabel } from '@/lib/constants/payment-methods';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';

export interface TenantWaitingClaim {
  id: string;
  amount: number;
  status: string;
  type?: string;
  paymentDate?: string;
  method?: string | null;
  invoiceNumbers?: string | null;
}

interface TenantWaitingForOfficeCardProps {
  claims: TenantWaitingClaim[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount || 0);
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function TenantWaitingForOfficeCard({
  claims,
}: TenantWaitingForOfficeCardProps) {
  const theme = useTenantTheme();
  if (!claims.length) return null;

  return (
    <div className={cn(theme.formPanel, 'overflow-hidden')}>
      <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
        <h3 className={theme.sectionTitle}>Waiting for the office</h3>
        <p className={cn('mt-0.5 text-sm', theme.muted)}>
          Track this request and message the office. If a screenshot is unclear,
          send a new one on the same conversation.
        </p>
      </div>
      <ul className="divide-y divide-gray-100">
        {claims.map((payment) => (
          <li key={payment.id}>
            <Link
              href={`/tenant/payments/${payment.id}`}
              className="flex items-start gap-3 px-4 py-4 transition hover:bg-gray-50 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(payment.amount)}
                  </span>
                  <PaymentStatusBadge status={payment.status} />
                  {payment.type ? <PaymentTypeBadge type={payment.type} /> : null}
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Open
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {[
                    formatDate(payment.paymentDate),
                    payment.invoiceNumbers,
                    payment.method
                      ? formatPaymentMethodLabel(payment.method)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
