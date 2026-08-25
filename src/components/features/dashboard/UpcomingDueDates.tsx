'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { TableCard, WorkItemRow } from '@/components/ui';
import { formatShortDate } from '@/lib/utils';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';

interface UpcomingDueDatesProps {
  dueDates: any[];
}

export default function UpcomingDueDates({ dueDates }: UpcomingDueDatesProps) {
  if (!dueDates || dueDates.length === 0) {
    return (
      <TableCard title="Upcoming Due Dates">
        <p className="px-4 py-6 text-sm text-gray-500">
          No upcoming invoices in the next 30 days
        </p>
      </TableCard>
    );
  }

  return (
    <TableCard
      title="Upcoming Due Dates"
      actions={
        <Link
          href="/admin/financial/invoices"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          View all
        </Link>
      }
    >
      {dueDates.slice(0, 8).map((invoice) => {
        const days = Number(invoice.daysUntilDue) || 0;
        const tone: WorkItemTone = days <= 3 ? 'danger' : days <= 7 ? 'warning' : 'info';
        return (
          <WorkItemRow
            key={invoice.id}
            href={invoice.id ? `/admin/financial/invoices/${invoice.id}` : undefined}
            title={invoice.tenantName || invoice.invoiceNumber || 'Invoice'}
            subtitle={invoice.invoiceNumber}
            badges={[
              {
                key: 'due',
                label: days === 1 ? 'Due in 1 day' : `Due in ${days} days`,
                tone,
              },
            ]}
            date={formatShortDate(invoice.dueDate)}
            metaLabel={days <= 3 ? `${days} days left` : 'Upcoming'}
            metaDetail={`₱${Number(invoice.remainingAmount || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
            })}`}
            metaTone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'default'}
            dotTone={tone}
            trailingIcon={
              tone === 'danger' ? <AlertTriangle className="h-4 w-4 text-rose-500" /> : null
            }
          />
        );
      })}
    </TableCard>
  );
}
