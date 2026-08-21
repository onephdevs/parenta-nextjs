/**
 * Maintenance helpers backed by CONSTANTS.MODULE.MAINTENANCE.
 * Prefer CONSTANTS.MODULE.MAINTENANCE.* for raw lists/labels.
 */

import { CONSTANTS } from '@/lib/constants/registry';

const MAINTENANCE = CONSTANTS.MODULE.MAINTENANCE;

export const MAINTENANCE_CATEGORIES = MAINTENANCE.CATEGORIES;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];

export const MAINTENANCE_CATEGORY_LABELS: Record<string, string> = {
  ...MAINTENANCE.CATEGORY_LABELS,
};

export const MAINTENANCE_PRIORITY_LABELS: Record<string, string> = {
  ...MAINTENANCE.PRIORITY_LABELS,
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  ...MAINTENANCE.STATUS_LABELS,
};

function titleCaseWords(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMaintenanceCategory(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  const key = value.trim().toLowerCase();
  return MAINTENANCE_CATEGORY_LABELS[key] || titleCaseWords(value);
}

export function formatMaintenancePriority(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  const key = value.trim().toLowerCase();
  return MAINTENANCE_PRIORITY_LABELS[key] || titleCaseWords(value);
}

export function formatMaintenanceStatus(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  const key = value.trim().toLowerCase();
  return MAINTENANCE_STATUS_LABELS[key] || titleCaseWords(value);
}

/** Short customer-facing ticket id, e.g. #T-A1B2C3 */
export function formatMaintenanceTicketNumber(id: string | null | undefined): string {
  if (!id?.trim()) return '#T-------';
  const compact = id.replace(/-/g, '').slice(-6).toUpperCase();
  return `#T-${compact}`;
}

export type MaintenanceTicketQueue = 'open' | 'in_progress' | 'resolved' | 'cancelled';

export function maintenanceTicketQueue(
  status: string | null | undefined
): MaintenanceTicketQueue {
  const key = String(status || '').toLowerCase();
  if (key === 'in_progress') return 'in_progress';
  if (key === 'completed' || key === 'closed' || key === 'resolved') return 'resolved';
  if (key === 'cancelled') return 'cancelled';
  return 'open';
}

function normalizeMaintenanceStatus(value: string | null | undefined): string {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'closed' || key === 'resolved') return 'completed';
  return key || 'open';
}

/**
 * Office reply on an open ticket moves it to in_progress (and the pipeline
 * In Progress stage). Explicit completed/cancelled from the form is kept.
 */
export function maintenanceStatusAfterOfficeReply(
  currentStatus: string | null | undefined,
  requestedStatus?: string | null
): string {
  const requested = normalizeMaintenanceStatus(requestedStatus);
  const current = normalizeMaintenanceStatus(currentStatus);
  const chosen = requestedStatus != null && String(requestedStatus).trim()
    ? requested
    : current;
  if (chosen === 'completed' || chosen === 'cancelled') return chosen;
  return 'in_progress';
}

/** Format a pipeline tag that may be raw category or "Priority: medium". */
export function formatMaintenanceTag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return trimmed;

  const priorityMatch = trimmed.match(/^priority:\s*(.+)$/i);
  if (priorityMatch) {
    return `Priority: ${formatMaintenancePriority(priorityMatch[1])}`;
  }

  return formatMaintenanceCategory(trimmed);
}

export function buildMaintenancePipelineTags(input: {
  priority?: string | null;
  category?: string | null;
}): string[] {
  const tags: string[] = [];
  if (input.priority?.trim()) {
    tags.push(`Priority: ${formatMaintenancePriority(input.priority)}`);
  }
  if (input.category?.trim()) {
    tags.push(formatMaintenanceCategory(input.category));
  }
  return tags;
}
