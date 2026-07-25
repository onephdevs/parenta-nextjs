'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
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

export function Badge({ children, tone = 'neutral', size = 'sm', className }: BadgeProps) {
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
