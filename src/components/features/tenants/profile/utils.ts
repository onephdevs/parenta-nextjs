import type { TenantProfileAssignment } from './types';

export function formatProfileDate(value?: string | Date | null, fallback = '—'): string {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function formatDateRange(
  start?: string | null,
  end?: string | null
): string {
  return `${formatProfileDate(start)} - ${formatProfileDate(end, 'Present')}`;
}

export function derivePersonBadge(input: {
  currentAssignment?: TenantProfileAssignment | null;
  assignmentHistory?: TenantProfileAssignment[];
  tenantStatus?: string;
}): 'active' | 'past' | 'inactive' | 'pending' {
  if (input.currentAssignment) return 'active';
  const history = input.assignmentHistory || [];
  if (history.length > 0) return 'past';
  if (input.tenantStatus === 'pending') return 'pending';
  return 'inactive';
}

/** Map assignment row → lease history badge (Upcoming / Active / Completed / Terminated). */
export function deriveLeaseRowStatus(assignment: TenantProfileAssignment): string {
  const status = String(assignment.assignmentStatus || '').toLowerCase();
  if (status === 'terminated') return 'terminated';
  if (status === 'pending') return 'upcoming';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = assignment.startDate ? new Date(assignment.startDate) : null;
  const end = assignment.endDate ? new Date(assignment.endDate) : null;

  if (start && !Number.isNaN(start.getTime()) && start > today) return 'upcoming';
  if (status === 'active' && (!end || end >= today)) return 'active';
  if (end && end < today) return 'completed';
  if (status === 'active') return 'active';
  return status || 'completed';
}

export function formatUnitDisplay(roomNumber?: string | null): string {
  const raw = String(roomNumber || '').trim();
  if (!raw) return '—';
  if (/^(unit|room)\b/i.test(raw)) return raw;
  return `Unit ${raw}`;
}

export function fullName(first?: string | null, last?: string | null): string {
  return `${first || ''} ${last || ''}`.trim() || 'Unnamed';
}
