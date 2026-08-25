'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

export interface TableCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** When false, skips the overflow-x wrapper already inside Table */
  padding?: 'none' | 'md';
}

/**
 * White shadowed panel used for admin list/report tables.
 * Prefer composing with Table / TableHeader / TableHead / etc.
 */
export function TableCard({
  children,
  title,
  description,
  actions,
  className,
}: TableCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm',
        className
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-gray-600">{description}</p>}
          </div>
          {actions && <div className="flex flex-shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
};
