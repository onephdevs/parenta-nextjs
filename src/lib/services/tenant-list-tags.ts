/**
 * Tenant list tag vocabulary — payment status (one) + stacking tags.
 * Used by admin /admin/tenants work-item list.
 */

import {
  PAST_DUE_ESCALATED_DAYS,
  PAST_DUE_SOON_DAYS,
  getPastDueStatus,
} from '@/lib/past-due-status';
import type { TenantListInsights } from '@/lib/services/tenant-list-insights';

export type PaymentStatusKey =
  | 'paid_up'
  | 'due_today'
  | 'due_soon'
  | 'overdue'
  | 'escalated';

export type TenantTagKey =
  | PaymentStatusKey
  | 'payment_confirmation'
  | 'awaiting_payment'
  | 'partial_payment'
  | 'rent'
  | 'bills'
  | 'water'
  | 'electricity'
  | 'maintenance'
  | 'new'
  | 'pending'
  | 'unsigned_lease'
  | 'unassigned';

export type TenantTagKind = 'payment_status' | 'action' | 'topic' | 'lifecycle';

export interface TenantTag {
  key: TenantTagKey;
  label: string;
  kind: TenantTagKind;
  /** Colored dot for work-item style pills */
  dotClass: string;
  textClass: string;
  /** Sort priority within visible badges (lower = earlier) */
  priority: number;
}

export interface TenantTagInput {
  tenantStatus?: string | null;
  currentBuildingId?: string | null;
  insights?: TenantListInsights | null;
}

/** Mutually exclusive payment health — one per tenant. */
export function getPaymentStatusTag(input: TenantTagInput): TenantTag {
  const i = input.insights;
  const balance = i?.balance || 0;
  const daysPastDue = i?.daysPastDue || 0;
  const daysUntilDue = i?.daysUntilDue ?? null;

  if (daysPastDue >= PAST_DUE_ESCALATED_DAYS) {
    return {
      key: 'escalated',
      label: 'Escalated',
      kind: 'payment_status',
      dotClass: 'bg-red-700',
      textClass: 'text-red-800',
      priority: 0,
    };
  }
  if (daysPastDue > 0) {
    return {
      key: 'overdue',
      label: daysPastDue === 1 ? '1 day late' : `${daysPastDue} days late`,
      kind: 'payment_status',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-800',
      priority: 0,
    };
  }
  if (balance > 0 && daysUntilDue === 0) {
    return {
      key: 'due_today',
      label: 'Due today',
      kind: 'payment_status',
      dotClass: 'bg-orange-500',
      textClass: 'text-orange-800',
      priority: 0,
    };
  }
  if (balance > 0 && daysUntilDue != null && daysUntilDue <= PAST_DUE_SOON_DAYS) {
    return {
      key: 'due_soon',
      label: daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue}d`,
      kind: 'payment_status',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-900',
      priority: 0,
    };
  }
  if (balance > 0) {
    // Balance due but outside soon window — still treat as due_soon for grouping
    const past = getPastDueStatus({
      balance,
      daysPastDue,
      daysUntilDue,
    });
    return {
      key: 'due_soon',
      label: past.label,
      kind: 'payment_status',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-900',
      priority: 0,
    };
  }
  return {
    key: 'paid_up',
    label: 'Paid up',
    kind: 'payment_status',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-800',
    priority: 0,
  };
}

/** Stacking action / topic / lifecycle tags (excludes payment status). */
export function getTenantStackTags(input: TenantTagInput): TenantTag[] {
  const i = input.insights;
  const tags: TenantTag[] = [];
  const balance = i?.balance || 0;

  // Action tags (highest priority)
  if (i?.hasPaymentConfirmation) {
    tags.push({
      key: 'payment_confirmation',
      label: 'Payment confirmation',
      kind: 'action',
      dotClass: 'bg-indigo-500',
      textClass: 'text-indigo-800',
      priority: 10,
    });
  } else if (balance > 0) {
    tags.push({
      key: 'awaiting_payment',
      label: 'Awaiting payment',
      kind: 'action',
      dotClass: 'bg-slate-400',
      textClass: 'text-slate-700',
      priority: 20,
    });
  }

  if (i?.hasPartialPayment) {
    tags.push({
      key: 'partial_payment',
      label: 'Partial payment',
      kind: 'action',
      dotClass: 'bg-fuchsia-500',
      textClass: 'text-fuchsia-800',
      priority: 25,
    });
  }

  // Topic tags
  if (i?.openMaintenanceCount && i.openMaintenanceCount > 0) {
    tags.push({
      key: 'maintenance',
      label:
        i.openMaintenanceCount === 1
          ? i.hasUrgentMaintenance
            ? 'Maintenance urgent'
            : 'Maintenance'
          : `Maintenance · ${i.openMaintenanceCount}`,
      kind: 'topic',
      dotClass: i.hasUrgentMaintenance ? 'bg-rose-600' : 'bg-rose-500',
      textClass: 'text-rose-800',
      priority: 30,
    });
  }

  if (i?.hasOpenRent) {
    tags.push({
      key: 'rent',
      label: 'Rent',
      kind: 'topic',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-900',
      priority: 40,
    });
  }

  if (i?.hasOpenBills) {
    tags.push({
      key: 'bills',
      label: 'Bills',
      kind: 'topic',
      dotClass: 'bg-violet-500',
      textClass: 'text-violet-800',
      priority: 50,
    });
  }

  if (i?.hasUnpaidWater) {
    tags.push({
      key: 'water',
      label: 'Water',
      kind: 'topic',
      dotClass: 'bg-sky-500',
      textClass: 'text-sky-800',
      priority: 60,
    });
  }

  if (i?.hasUnpaidElectricity) {
    tags.push({
      key: 'electricity',
      label: 'Electricity',
      kind: 'topic',
      dotClass: 'bg-yellow-400',
      textClass: 'text-yellow-900',
      priority: 70,
    });
  }

  // Lifecycle tags
  if (i?.isNew) {
    tags.push({
      key: 'new',
      label: 'New',
      kind: 'lifecycle',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-800',
      priority: 80,
    });
  }

  if (input.tenantStatus === 'pending') {
    tags.push({
      key: 'pending',
      label: 'Pending',
      kind: 'lifecycle',
      dotClass: 'bg-slate-400',
      textClass: 'text-slate-700',
      priority: 90,
    });
  }

  if (i?.hasUnsignedLease) {
    tags.push({
      key: 'unsigned_lease',
      label: 'Unsigned lease',
      kind: 'lifecycle',
      dotClass: 'bg-purple-500',
      textClass: 'text-purple-800',
      priority: 100,
    });
  }

  if (!input.currentBuildingId) {
    tags.push({
      key: 'unassigned',
      label: 'Unassigned',
      kind: 'lifecycle',
      dotClass: 'bg-gray-400',
      textClass: 'text-gray-700',
      priority: 110,
    });
  }

  return tags.sort((a, b) => a.priority - b.priority);
}

/** Payment status + stack tags for display (status first, then stacks). */
export function getAllTenantTags(input: TenantTagInput): TenantTag[] {
  const status = getPaymentStatusTag(input);
  // Don't show "Paid up" as a badge — keep the row quiet when current
  const statusBadges = status.key === 'paid_up' ? [] : [status];
  return [...statusBadges, ...getTenantStackTags(input)];
}

export function tenantMatchesSignalFilter(
  input: TenantTagInput,
  filter: string
): boolean {
  if (!filter) return true;
  const status = getPaymentStatusTag(input);
  const stacks = getTenantStackTags(input);
  const keys = new Set<string>([status.key, ...stacks.map((t) => t.key)]);
  return keys.has(filter);
}

/** Group key for payment-status sections (includes lifecycle buckets). */
export function getPaymentGroupKey(input: TenantTagInput): string {
  if (input.tenantStatus === 'pending') return 'pending';
  if (
    input.tenantStatus === 'inactive' ||
    input.tenantStatus === 'terminated'
  ) {
    return 'inactive';
  }
  // Needs confirmation rises above payment health grouping
  if (input.insights?.hasPaymentConfirmation) return 'confirmation';
  return getPaymentStatusTag(input).key;
}

export const PAYMENT_GROUP_META: {
  key: string;
  title: string;
  tone: string;
  dotClass: string;
}[] = [
  {
    key: 'confirmation',
    title: 'Payment confirmation',
    tone: 'text-indigo-700',
    dotClass: 'fill-indigo-500 text-indigo-500',
  },
  {
    key: 'escalated',
    title: 'Escalated',
    tone: 'text-red-800',
    dotClass: 'fill-red-700 text-red-700',
  },
  {
    key: 'overdue',
    title: 'Overdue',
    tone: 'text-rose-700',
    dotClass: 'fill-rose-500 text-rose-500',
  },
  {
    key: 'due_today',
    title: 'Due today',
    tone: 'text-orange-700',
    dotClass: 'fill-orange-500 text-orange-500',
  },
  {
    key: 'due_soon',
    title: 'Due soon',
    tone: 'text-amber-700',
    dotClass: 'fill-amber-400 text-amber-400',
  },
  {
    key: 'paid_up',
    title: 'Paid up',
    tone: 'text-emerald-700',
    dotClass: 'fill-emerald-500 text-emerald-500',
  },
  {
    key: 'pending',
    title: 'Pending',
    tone: 'text-slate-600',
    dotClass: 'fill-slate-300 text-slate-300',
  },
  {
    key: 'inactive',
    title: 'Inactive',
    tone: 'text-slate-500',
    dotClass: 'fill-slate-300 text-slate-300',
  },
];

export const SIGNAL_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All signals' },
  { value: 'payment_confirmation', label: 'Payment confirmation' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_today', label: 'Due today' },
  { value: 'due_soon', label: 'Due soon' },
  { value: 'awaiting_payment', label: 'Awaiting payment' },
  { value: 'partial_payment', label: 'Partial payment' },
  { value: 'rent', label: 'Rent' },
  { value: 'bills', label: 'Bills' },
  { value: 'water', label: 'Water' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'new', label: 'New tenant' },
  { value: 'pending', label: 'Pending' },
  { value: 'unsigned_lease', label: 'Unsigned lease' },
  { value: 'unassigned', label: 'Unassigned' },
];
