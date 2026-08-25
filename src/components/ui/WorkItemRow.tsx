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
  title: string;
  subtitle?: string | null;
  badges?: WorkItemBadge[];
  date?: string | null;
  dateIcon?: ReactNode;
  metaLabel?: string | null;
  metaDetail?: string | null;
  metaTone?: 'danger' | 'warning' | 'muted' | 'default';
  trailingIcon?: ReactNode;
  actions?: ReactNode;
  dotTone?: WorkItemTone;
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

function RowBody({
  leading,
  idLabel,
  title,
  subtitle,
  badges,
  date,
  dateIcon,
  metaLabel,
  metaDetail,
  metaTone = 'default',
  trailingIcon,
  actions,
  dotTone = 'neutral',
}: Omit<WorkItemRowProps, 'href' | 'onClick' | 'className'>) {
  const visibleBadges = (badges || []).slice(0, 5);
  const moreCount = Math.max(0, (badges?.length || 0) - visibleBadges.length);

  return (
    <>
      {leading ? (
        <div
          className="shrink-0"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {leading}
        </div>
      ) : null}

      <Circle className={cn('h-3.5 w-3.5 shrink-0', dotClass[dotTone])} aria-hidden />

      {idLabel ? (
        <span className="w-14 shrink-0 font-mono text-[11px] text-gray-400 tabular-nums">
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

      {actions ? (
        <div
          className="relative flex shrink-0 items-center gap-1"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}

      <div className="flex w-6 shrink-0 items-center justify-end">{trailingIcon ?? null}</div>
    </>
  );
}

const rowClassName =
  'group flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-slate-50/80';

export function WorkItemRow({
  href,
  onClick,
  className,
  ...body
}: WorkItemRowProps) {
  const classes = cn(rowClassName, className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        <RowBody {...body} />
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(classes, 'w-full text-left')}>
        <RowBody {...body} />
      </button>
    );
  }

  return (
    <div className={classes}>
      <RowBody {...body} />
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
