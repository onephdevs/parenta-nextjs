'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatCardTone = 'default' | 'purple' | 'blue' | 'green' | 'yellow' | 'red';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  tone?: StatCardTone;
  className?: string;
}

const toneStyles: Record<StatCardTone, { wrap: string; icon: string; value: string }> = {
  default: { wrap: 'bg-white', icon: 'bg-gray-100 text-gray-600', value: 'text-gray-900' },
  purple: { wrap: 'bg-purple-50 border-purple-100', icon: 'bg-purple-100 text-purple-600', value: 'text-purple-700' },
  blue: { wrap: 'bg-blue-50 border-blue-100', icon: 'bg-blue-100 text-blue-600', value: 'text-blue-700' },
  green: { wrap: 'bg-green-50 border-green-100', icon: 'bg-green-100 text-green-600', value: 'text-green-700' },
  yellow: { wrap: 'bg-yellow-50 border-yellow-100', icon: 'bg-yellow-100 text-yellow-700', value: 'text-yellow-800' },
  red: { wrap: 'bg-red-50 border-red-100', icon: 'bg-red-100 text-red-600', value: 'text-red-700' },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone = 'default',
  className,
}: StatCardProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 p-6 shadow-sm',
        styles.wrap,
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className={cn('mt-1 text-2xl font-semibold', styles.value)}>{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {icon && (
          <div className={cn('flex-shrink-0 rounded-md p-3', styles.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
