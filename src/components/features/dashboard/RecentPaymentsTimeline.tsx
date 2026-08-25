'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { TableCard, WorkItemRow } from '@/components/ui';
import { formatShortDate } from '@/lib/utils';

interface RecentPaymentsTimelineProps {
  payments: any[];
}

export default function RecentPaymentsTimeline({ payments }: RecentPaymentsTimelineProps) {
  if (!payments || payments.length === 0) {
    return (
      <TableCard title="Recent Payments">
        <p className="px-4 py-6 text-sm text-gray-500">No recent payments</p>
      </TableCard>
    );
  }

  return (
    <TableCard
      title="Recent Payments"
      actions={
        <Link
          href="/admin/financial/payments"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          View all
        </Link>
      }
    >
      {payments.map((payment) => (
        <WorkItemRow
          key={payment.id}
          href={payment.id ? `/admin/financial/payments/${payment.id}` : undefined}
          title={payment.tenantName || 'Payment'}
          subtitle={[payment.paymentMethod, payment.paymentType].filter(Boolean).join(' · ')}
          badges={[
            { key: 'status', label: 'Paid', tone: 'success' },
            ...(payment.paymentType
              ? [{ key: 'type', label: String(payment.paymentType), tone: 'info' as const }]
              : []),
          ]}
          date={formatShortDate(payment.paymentDate)}
          metaLabel="Paid"
          metaDetail={`₱${Number(payment.amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}`}
          metaTone="muted"
          dotTone="success"
          trailingIcon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        />
      ))}
    </TableCard>
  );
}
