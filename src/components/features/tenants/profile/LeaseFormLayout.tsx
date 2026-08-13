'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Shared Alfonso two-column form section (Edit / Renew lease pages). */
export function LeaseFormSection({
  title,
  subtitle,
  description,
  children,
  last,
}: {
  title: string;
  subtitle?: string;
  description: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className={cn(
        'grid grid-cols-1 gap-8 py-10 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] lg:gap-12',
        !last && 'border-b border-gray-200'
      )}
    >
      <div className="max-w-xs">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1.5 text-sm font-semibold text-gray-800">{subtitle}</p>
        ) : null}
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function LeaseFormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

export function LeaseTemplatePair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

export function LeaseFinanceRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-8 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className={cn('tabular-nums text-gray-900', emphasize ? 'font-bold' : 'font-semibold')}>
        {value}
      </dd>
    </div>
  );
}

export const leaseFieldClass =
  'h-11 rounded-lg border-gray-300 text-sm text-gray-900 shadow-none focus:border-gray-900 focus:ring-gray-900/20';
