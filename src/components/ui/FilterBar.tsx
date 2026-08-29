'use client';

import { ReactNode, useEffect, useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';

export type FilterBarColumns = 2 | 3 | 4 | 5 | 6;

export interface FilterBarProps {
  children: ReactNode;
  columns?: FilterBarColumns;
  className?: string;
  /** Override the inner grid class entirely when needed */
  gridClassName?: string;
  /** Optional row below the filter grid (counts, view toggles, etc.) */
  footer?: ReactNode;
  /** Always-visible search field shown beside the filter toggle. */
  search?: ReactNode;
  /** Always-visible actions shown after the filter toggle (e.g. Add). */
  actions?: ReactNode;
  /** Hide extra fields behind a filter control until clicked. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Shown as a count badge on the filter control when greater than 0. */
  activeCount?: number;
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
  search,
  actions,
  collapsible = false,
  defaultOpen = false,
  activeCount = 0,
}: FilterBarProps) {
  const pathname = usePathname();
  const storageKey = `parenta:filterbar:${pathname}`;
  const [open, setOpen] = useState(defaultOpen || activeCount > 0);
  const panelId = useId();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === '1') setOpen(true);
    } catch {
      /* ignore private-mode storage errors */
    }
  }, [storageKey]);

  const fields = (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        gridClassName ?? columnStyles[columns]
      )}
    >
      {children}
    </div>
  );

  if (!collapsible) {
    return (
      <Card className={cn('mb-6', className)}>
        {fields}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </Card>
    );
  }

  return (
    <Card className={cn('mb-6', className)}>
      <div className="flex items-center gap-2 sm:gap-3">
        {search ? <div className="min-w-0 flex-1">{search}</div> : null}
        <div className={cn('relative shrink-0', !search && 'mr-auto')}>
          <IconButton
            label="Filters"
            variant="outline"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              setOpen((value) => {
                const next = !value;
                try {
                  sessionStorage.setItem(storageKey, next ? '1' : '0');
                } catch {
                  /* ignore private-mode storage errors */
                }
                return next;
              });
            }}
            className="h-10 w-10 rounded-md"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </IconButton>
          {activeCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
        {!search && footer ? (
          <div className="min-w-0 flex-1 text-sm text-gray-600">{footer}</div>
        ) : null}
      </div>
      {search && footer ? <div className="mt-3">{footer}</div> : null}
      {open ? (
        <div id={panelId} className="mt-4 border-t border-gray-100 pt-4">
          {fields}
        </div>
      ) : null}
    </Card>
  );
}
