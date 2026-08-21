'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DetailSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** White detail card with titled header — pairs with DescriptionList. */
export function DetailSection({
  title,
  description,
  children,
  actions,
  className,
}: DetailSectionProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-gray-200 bg-white',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="min-w-0">
          <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-gray-600">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-shrink-0 gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
