'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
export type BadgeVariant = 'solid' | 'dot';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  /** `dot` matches the tenants list pill (bordered, colored status dot). */
  variant?: BadgeVariant;
  className?: string;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
};

const dotColor: Record<BadgeTone, string> = {
  neutral: 'bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-400',
  danger: 'bg-rose-500',
  info: 'bg-blue-500',
  purple: 'bg-violet-500',
};

const dotText: Record<BadgeTone, string> = {
  neutral: 'text-gray-700',
  success: 'text-emerald-800',
  warning: 'text-amber-800',
  danger: 'text-rose-800',
  info: 'text-blue-800',
  purple: 'text-violet-800',
};

export function Badge({
  children,
  tone = 'neutral',
  size = 'sm',
  variant = 'solid',
  className,
}: BadgeProps) {
  if (variant === 'dot') {
    return (
      <span
        className={cn(
          'inline-flex max-w-[12rem] items-center gap-1.5 rounded-md border border-gray-200/80 bg-white px-1.5 py-0.5 text-[11px] font-medium',
          dotText[tone],
          className
        )}
      >
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotColor[tone])} />
        <span className="truncate">{children}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
