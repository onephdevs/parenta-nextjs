'use client';

import { cn } from '@/lib/utils';

export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressTone = 'default' | 'primary' | 'success' | 'danger';

export interface ProgressProps {
  /** 0–100 */
  value: number;
  size?: ProgressSize;
  tone?: ProgressTone;
  /** Optional label above the bar */
  label?: string;
  showValue?: boolean;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}

const sizeStyles: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

const toneStyles: Record<ProgressTone, string> = {
  default: 'bg-gray-900',
  primary: 'bg-blue-600',
  success: 'bg-green-600',
  danger: 'bg-red-600',
};

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function Progress({
  value,
  size = 'md',
  tone = 'default',
  label,
  showValue,
  className,
  trackClassName,
  barClassName,
}: ProgressProps) {
  const pct = clampPercent(value);

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-gray-600">
          {label ? <span>{label}</span> : <span />}
          {showValue ? <span className="font-semibold tabular-nums">{Math.round(pct)}%</span> : null}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'w-full overflow-hidden rounded-full bg-gray-200',
          sizeStyles[size],
          trackClassName
        )}
      >
        <div
          className={cn(
            'rounded-full transition-all duration-300',
            sizeStyles[size],
            toneStyles[tone],
            barClassName
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
