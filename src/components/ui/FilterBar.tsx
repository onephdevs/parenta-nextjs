'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

export type FilterBarColumns = 2 | 3 | 4 | 5 | 6;

export interface FilterBarProps {
  children: ReactNode;
  columns?: FilterBarColumns;
  className?: string;
  /** Override the inner grid class entirely when needed */
  gridClassName?: string;
  /** Optional row below the filter grid (counts, view toggles, etc.) */
  footer?: ReactNode;
}

const columnStyles: Record<FilterBarColumns, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
  6: 'sm:grid-cols-2 lg:grid-cols-6',
};

/** Card + responsive grid shell for list-page search/filter controls. */
export function FilterBar({
  children,
  columns = 4,
  className,
  gridClassName,
  footer,
}: FilterBarProps) {
  return (
    <Card className={cn('mb-6', className)}>
      <div
        className={cn(
          'grid grid-cols-1 gap-4',
          gridClassName ?? columnStyles[columns]
        )}
      >
        {children}
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </Card>
  );
}
