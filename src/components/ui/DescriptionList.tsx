'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DescriptionListProps {
  children: ReactNode;
  className?: string;
}

export interface DescriptionItemProps {
  label: string;
  children: ReactNode;
  /** Force stripe (otherwise alternate via CSS nth-child when using DescriptionList) */
  striped?: boolean;
  className?: string;
}

/** Zebra label/value detail list used on entity detail pages. */
export function DescriptionList({ children, className }: DescriptionListProps) {
  return (
    <dl className={cn('divide-y divide-gray-200 border-t border-gray-200', className)}>
      {children}
    </dl>
  );
}

export function DescriptionItem({
  label,
  children,
  striped,
  className,
}: DescriptionItemProps) {
  return (
    <div
      className={cn(
        'px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6',
        striped === true && 'bg-gray-50',
        striped === false && 'bg-white',
        striped === undefined && 'odd:bg-gray-50 even:bg-white',
        className
      )}
    >
      <dt className="text-sm font-medium text-gray-900">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
  );
}
