'use client';

import Link from 'next/link';
import { Calendar, Circle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

export type WorkItemTone = BadgeTone;

export interface WorkItemBadge {
  key: string;
  label: string;
  tone?: WorkItemTone;
}

export interface WorkItemRowProps {
  href?: string;
  onClick?: () => void;
  leading?: ReactNode;
  idLabel?: string;
  idLabelClassName?: string;
  title: string;
  subtitle?: string | null;
  badges?: WorkItemBadge[];
  date?: string | null;
  dateIcon?: ReactNode;
  metaLabel?: string | null;
  metaDetail?: string | null;
  metaTone?: 'danger' | 'warning' | 'muted' | 'default';
  extra?: ReactNode;
  trailingIcon?: ReactNode;
  actions?: ReactNode;
  dotTone?: WorkItemTone;
  showBadges?: boolean;
  showDate?: boolean;
  showMeta?: boolean;
  showTrailing?: boolean;
  className?: string;
}

const dotClass: Record<WorkItemTone, string> = {
  neutral: 'fill-slate-400 text-slate-400',
  success: 'fill-emerald-500 text-emerald-500',
  warning: 'fill-amber-400 text-amber-400',
  danger: 'fill-rose-500 text-rose-500',
  info: 'fill-blue-500 text-blue-500',
  purple: 'fill-violet-500 text-violet-500',
};

const metaClass: Record<NonNullable<WorkItemRowProps['metaTone']>, string> = {
  danger: 'text-rose-600',
  warning: 'text-amber-600',
  muted: 'text-gray-400',
  default: 'text-gray-600',
};

function InteractiveSlot({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex shrink-0 items-center gap-1"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

function RowBody({
  leading,
  idLabel,
  idLabelClassName,
  title,
  subtitle,
  badges,
  date,
  dateIcon,
  metaLabel,
  metaDetail,
  metaTone = 'default',
  extra,
  trailingIcon,
  actions,
  dotTone = 'neutral',
  showBadges = true,
  showDate = true,
  showMeta = true,
  showTrailing = true,
  includeSlots = true,
}: Omit<WorkItemRowProps, 'href' | 'onClick' | 'className'> & { includeSlots?: boolean }) {
  const visibleBadges = (badges || []).slice(0, 5);
  const moreCount = Math.max(0, (badges?.length || 0) - visibleBadges.length);

  return (
    <>
      {includeSlots && leading ? <InteractiveSlot>{leading}</InteractiveSlot> : null}

      <Circle className={cn('h-3.5 w-3.5 shrink-0', dotClass[dotTone])} aria-hidden />

      {idLabel ? (
        <span
          className={cn(
            'w-24 shrink-0 font-mono text-[11px] text-gray-400 tabular-nums',
            idLabelClassName
          )}
        >
          {idLabel}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 group-hover:text-gray-950">
          {title}
        </p>
        {subtitle ? (
          <p className="truncate text-xs text-gray-500">{subtitle}</p>
        ) : null}
      </div>

      {showBadges ? (
        <div className="hidden min-w-0 flex-[1.4] flex-wrap items-center justify-end gap-1.5 md:flex">
          {visibleBadges.map((badge) => (
            <Badge key={badge.key} variant="dot" tone={badge.tone || 'neutral'}>
              {badge.label}
            </Badge>
          ))}
          {moreCount > 0 ? (
            <span className="text-[11px] font-medium text-gray-500">{moreCount} more</span>
          ) : null}
          {visibleBadges.length === 0 ? (
            <span className="text-[11px] text-gray-400">—</span>
          ) : null}
        </div>
      ) : null}

      {showDate ? (
        <div className="hidden w-24 shrink-0 items-center justify-end gap-1 text-xs text-gray-600 lg:flex">
          {date ? (
            <>
              {dateIcon ?? <Calendar className="h-3.5 w-3.5 text-gray-400" />}
              <span className="tabular-nums">{date}</span>
            </>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </div>
      ) : null}

      {showMeta ? (
        <div className="hidden w-40 shrink-0 flex-col items-end justify-center sm:flex">
          {metaLabel || metaDetail ? (
            <>
              {metaLabel ? (
                <span
                  className={cn('max-w-full truncate text-[11px] font-semibold', metaClass[metaTone])}
                  title={metaLabel}
                >
                  {metaLabel}
                </span>
              ) : null}
              {metaDetail ? (
                <span
                  className="max-w-full truncate text-[10px] tabular-nums text-gray-500"
                  title={metaDetail}
                >
                  {metaDetail}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-[11px] text-gray-300">—</span>
          )}
        </div>
      ) : null}

      {extra ? <div className="flex shrink-0 items-center gap-2">{extra}</div> : null}

      {includeSlots && actions ? <InteractiveSlot>{actions}</InteractiveSlot> : null}

      {showTrailing ? (
        <div className="flex w-6 shrink-0 items-center justify-end">{trailingIcon ?? null}</div>
      ) : null}
    </>
  );
}

const rowClassName =
  'group flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-slate-50/80';

export interface WorkItemHeaderProps {
  /** Ticket / row id column — width matches `idLabel` on `WorkItemRow`. */
  id?: ReactNode;
  title?: ReactNode;
  status?: ReactNode;
  date?: ReactNode;
  meta?: ReactNode;
  extra?: ReactNode;
  leading?: ReactNode;
  showStatus?: boolean;
  showDate?: boolean;
  showMeta?: boolean;
  /** Reserve space for a single trailing action icon so columns line up. */
  showActions?: boolean;
  showTrailing?: boolean;
  className?: string;
}

export function WorkItemHeader({
  id,
  title = 'Item',
  status = 'Status',
  date = 'Date',
  meta = 'Amount',
  extra,
  leading,
  showStatus = true,
  showDate = true,
  showMeta = true,
  showActions = false,
  showTrailing = true,
  className,
}: WorkItemHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-gray-200 bg-slate-50/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500',
        className
      )}
      role="row"
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {id ? (
        <div className="w-24 shrink-0" role="columnheader">
          {id}
        </div>
      ) : null}
      <div className="min-w-0 flex-1" role="columnheader">
        {title}
      </div>
      {showStatus ? (
        <div
          className="hidden min-w-0 flex-[1.4] items-center justify-end md:flex"
          role="columnheader"
        >
          {status}
        </div>
      ) : null}
      {showDate ? (
        <div className="hidden w-24 shrink-0 items-center justify-end lg:flex" role="columnheader">
          {date}
        </div>
      ) : null}
      {showMeta ? (
        <div className="hidden w-40 shrink-0 items-center justify-end sm:flex" role="columnheader">
          {meta}
        </div>
      ) : null}
      {extra ? (
        <div className="flex shrink-0 items-center justify-end gap-2" role="columnheader">
          {extra}
        </div>
      ) : null}
      {showActions ? <div className="w-5 shrink-0" aria-hidden /> : null}
      {showTrailing ? <div className="w-6 shrink-0" aria-hidden /> : null}
    </div>
  );
}

export function WorkItemRow({
  href,
  onClick,
  className,
  leading,
  actions,
  ...body
}: WorkItemRowProps) {
  const classes = cn(rowClassName, className);
  const main = <RowBody {...body} includeSlots={false} />;

  if (href) {
    return (
      <div className={classes}>
        {leading ? <InteractiveSlot>{leading}</InteractiveSlot> : null}
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
          {main}
        </Link>
        {actions ? <InteractiveSlot>{actions}</InteractiveSlot> : null}
      </div>
    );
  }

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.currentTarget !== event.target) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
        className={cn(classes, 'w-full cursor-pointer text-left')}
      >
        {leading ? <InteractiveSlot>{leading}</InteractiveSlot> : null}
        {main}
        {actions ? <InteractiveSlot>{actions}</InteractiveSlot> : null}
      </div>
    );
  }

  return (
    <div className={classes}>
      {leading ? <InteractiveSlot>{leading}</InteractiveSlot> : null}
      {main}
      {actions ? <InteractiveSlot>{actions}</InteractiveSlot> : null}
    </div>
  );
}

export function WorkItemList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
