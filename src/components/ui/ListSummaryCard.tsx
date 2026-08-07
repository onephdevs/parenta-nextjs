'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ListSummaryCardProps {
  title: string;
  value: ReactNode;
  footer: ReactNode;
  icon: ReactNode;
  className?: string;
}

/** Billing-style summary tile used across admin list pages. */
export function ListSummaryCard({
  title,
  value,
  footer,
  icon,
  className,
}: ListSummaryCardProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg bg-white shadow', className)}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="truncate text-sm font-medium text-gray-900">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-sm text-gray-900">{footer}</div>
      </div>
    </div>
  );
}
