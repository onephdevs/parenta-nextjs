'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StatBlockProps {
  label: string;
  value: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatBlock({ label, value, className, size = 'md' }: StatBlockProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={cn(
          'mt-1 font-bold text-gray-900',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-xl'
        )}
      >
        {value}
      </p>
    </div>
  );
}
