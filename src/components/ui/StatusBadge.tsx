'use client';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export type ProfileStatus =
  | 'active'
  | 'inactive'
  | 'past'
  | 'pending'
  | 'upcoming'
  | 'completed'
  | 'terminated'
  | 'overdue'
  | 'unpaid'
  | 'paid'
  | string;

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'success',
  inactive: 'neutral',
  past: 'neutral',
  pending: 'warning',
  upcoming: 'neutral',
  completed: 'info',
  terminated: 'danger',
  overdue: 'danger',
  unpaid: 'purple',
  paid: 'success',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  past: 'Past',
  pending: 'Pending',
  upcoming: 'Upcoming',
  completed: 'Completed',
  terminated: 'Terminated',
  overdue: 'Overdue',
  unpaid: 'Unpaid',
  paid: 'Paid',
};

export interface StatusBadgeProps {
  status: ProfileStatus;
  className?: string;
  /** Optional muted subtext under the badge (e.g. paid date) */
  subtext?: string;
  label?: string;
  tone?: BadgeTone;
}

export function StatusBadge({ status, className, subtext, label, tone }: StatusBadgeProps) {
  const key = String(status || '').toLowerCase();
  const resolvedTone = tone || STATUS_TONE[key] || 'neutral';
  const resolvedLabel = label || STATUS_LABEL[key] || status;

  return (
    <span className={cn('inline-flex flex-col items-start gap-0.5', className)}>
      <Badge tone={resolvedTone}>{resolvedLabel}</Badge>
      {subtext ? <span className="text-[11px] text-gray-500">{subtext}</span> : null}
    </span>
  );
}
