/**
 * Shared past-due / payment urgency tiers used by:
 * - Admin dashboard Active Tenants table
 * - Needs Attention "Payments due" card
 * - Payments hub / tenant-facing balance displays
 *
 * Keep label + tone logic here so screens don't invent their own wording.
 */

export type PastDueTier = 'current' | 'due_soon' | 'late' | 'escalated';

export type PastDueTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface PastDueStatusInput {
  /** Outstanding balance (any unpaid invoices). */
  balance: number;
  /** Max days past the oldest unpaid due date; 0 if nothing overdue. */
  daysPastDue: number;
  /**
   * Days until the next unpaid due date when not yet overdue.
   * Negative values are treated as overdue and ignored in favor of daysPastDue.
   */
  daysUntilDue?: number | null;
}

export interface PastDueStatus {
  tier: PastDueTier;
  /** Short badge label, e.g. "Current", "Due in 2d", "12 days late", "Escalated". */
  label: string;
  /** Longer urgency phrase for subtext, e.g. "3 days late", "due tomorrow". */
  urgencyLabel: string;
  tone: PastDueTone;
  /** Sort key: higher = more urgent. */
  urgencyRank: number;
}

/** Days past due at/above which status becomes Escalated. */
export const PAST_DUE_ESCALATED_DAYS = 30;

/** Window (days) for "due soon" when not yet overdue. */
export const PAST_DUE_SOON_DAYS = 7;

function formatDueSoonLabel(daysUntilDue: number): string {
  if (daysUntilDue <= 0) return 'due today';
  if (daysUntilDue === 1) return 'due tomorrow';
  return `Due in ${daysUntilDue}d`;
}

function formatLateLabel(daysPastDue: number): string {
  if (daysPastDue === 1) return '1 day late';
  return `${daysPastDue} days late`;
}

/**
 * Derive a consistent past-due tier from balance + due-date distance.
 */
export function getPastDueStatus(input: PastDueStatusInput): PastDueStatus {
  const balance = Number(input.balance) || 0;
  const daysPastDue = Math.max(0, Math.floor(Number(input.daysPastDue) || 0));
  const rawUntil = input.daysUntilDue;
  const daysUntilDue =
    rawUntil == null || Number.isNaN(Number(rawUntil))
      ? null
      : Math.floor(Number(rawUntil));

  if (daysPastDue >= PAST_DUE_ESCALATED_DAYS) {
    return {
      tier: 'escalated',
      label: 'Escalated',
      urgencyLabel: formatLateLabel(daysPastDue),
      tone: 'danger',
      urgencyRank: 3000 + daysPastDue,
    };
  }

  if (daysPastDue > 0) {
    return {
      tier: 'late',
      label: formatLateLabel(daysPastDue),
      urgencyLabel: formatLateLabel(daysPastDue),
      tone: 'danger',
      urgencyRank: 2000 + daysPastDue,
    };
  }

  if (balance > 0) {
    const until = daysUntilDue ?? PAST_DUE_SOON_DAYS;
    const soon = until <= PAST_DUE_SOON_DAYS;
    return {
      tier: 'due_soon',
      label: soon ? formatDueSoonLabel(Math.max(0, until)) : 'Balance due',
      urgencyLabel: soon ? formatDueSoonLabel(Math.max(0, until)) : 'balance due',
      tone: 'warning',
      // Closer due dates rank higher within due_soon
      urgencyRank: 1000 + Math.max(0, PAST_DUE_SOON_DAYS - Math.max(0, until)),
    };
  }

  return {
    tier: 'current',
    label: 'Current',
    urgencyLabel: 'current',
    tone: 'success',
    urgencyRank: 0,
  };
}

/** CSS classes for inline amount coloring (table cells). */
export function pastDueAmountClass(status: PastDueStatus): string {
  switch (status.tier) {
    case 'escalated':
    case 'late':
      return 'text-red-600 font-semibold';
    case 'due_soon':
      return 'text-amber-600 font-semibold';
    default:
      return 'text-gray-900';
  }
}

/** Badge classes matching StatusBadges tones without requiring a client component. */
export function pastDueBadgeClass(status: PastDueStatus): string {
  switch (status.tone) {
    case 'danger':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-amber-100 text-amber-800';
    case 'success':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
