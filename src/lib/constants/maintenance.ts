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
