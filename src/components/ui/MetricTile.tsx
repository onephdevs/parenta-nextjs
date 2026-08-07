'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type MetricTileTone = 'green' | 'red' | 'blue' | 'yellow' | 'purple' | 'gray';

export interface MetricTileProps {
  label: string;
  value: ReactNode;
  tone?: MetricTileTone;
  className?: string;
}

const toneStyles: Record<MetricTileTone, string> = {
  green: 'bg-green-50',
  red: 'bg-red-50',
  blue: 'bg-blue-50',
  yellow: 'bg-yellow-50',
  purple: 'bg-purple-50',
  gray: 'bg-gray-50',
};

/** Compact colored metric tile used on report summary grids. */
export function MetricTile({
  label,
  value,
  tone = 'gray',
  className,
}: MetricTileProps) {
  return (
    <div className={cn('rounded-lg p-4', toneStyles[tone], className)}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
