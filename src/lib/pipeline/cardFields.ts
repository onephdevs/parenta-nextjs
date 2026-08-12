import type { PipelineBoardSlug, PipelineCard } from '@/types/database';
import { formatPaymentNotesForPeople } from '@/lib/format-payment-notes';
import { formatMaintenanceTag } from '@/lib/constants/maintenance';
import { formatPipelineLeadSource } from '@/lib/pipeline/lead-sources';

export type CardFieldKey =
  | 'source'
  | 'amount'
  | 'dueAt'
  | 'nextActionAt'
  | 'viewingAt'
  | 'unit'
  | 'email'
  | 'phone'
  | 'tags'
  | 'notes'
  | 'balance';

export interface CardFieldDef {
  key: CardFieldKey;
  label: string;
}

export const CARD_FIELD_DEFS: CardFieldDef[] = [
  { key: 'source', label: 'Source' },
  { key: 'amount', label: 'Value' },
  { key: 'balance', label: 'Balance' },
  { key: 'dueAt', label: 'Due date' },
  { key: 'nextActionAt', label: 'Next action' },
  { key: 'viewingAt', label: 'Viewing' },
  { key: 'unit', label: 'Unit' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'tags', label: 'Tags' },
  { key: 'notes', label: 'Notes' },
];

export type CardFieldPair = [CardFieldKey, CardFieldKey];

const STORAGE_PREFIX = 'parenta.pipeline.cardFields.v3.';

const BOARD_DEFAULTS: Record<string, CardFieldPair> = {
  onboarding: ['unit', 'amount'],
  payments: ['balance', 'dueAt'],
  expenses: ['amount', 'dueAt'],
  maintenance: ['tags', 'notes'],
};

export function defaultFieldsForBoard(slug: PipelineBoardSlug): CardFieldPair {
  return BOARD_DEFAULTS[slug] || ['source', 'amount'];
}

export function loadCardFields(slug: PipelineBoardSlug): CardFieldPair {
  if (typeof window === 'undefined') return defaultFieldsForBoard(slug);
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
    if (!raw) return defaultFieldsForBoard(slug);
    const parsed = JSON.parse(raw) as CardFieldKey[];
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      CARD_FIELD_DEFS.some((d) => d.key === parsed[0]) &&
      CARD_FIELD_DEFS.some((d) => d.key === parsed[1])
    ) {
      return [parsed[0], parsed[1]];
    }
  } catch {
    /* ignore */
  }
  return defaultFieldsForBoard(slug);
}

export function saveCardFields(slug: PipelineBoardSlug, fields: CardFieldPair): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_PREFIX}${slug}`, JSON.stringify(fields));
}

function formatPeso(amount: number | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '₱0';
  return `₱${Math.round(amount).toLocaleString('en-PH')}`;
}

/**
 * Infer lease length in months from start/end dates.
 * End dates are stored as start + N months − 1 day, so add 1 day before diffing.
 * Defaults to 12 when dates are missing (matches onboarding form default).
 */
export function inferLeaseMonths(card: PipelineCard): number {
  const startRaw = card.leaseStartDate?.slice(0, 10);
  const endRaw = card.leaseEndDate?.slice(0, 10);
  if (!startRaw || !endRaw) return 12;

  const start = new Date(`${startRaw}T12:00:00`);
  const end = new Date(`${endRaw}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 12;

  const endPlusOne = new Date(end);
  endPlusOne.setDate(endPlusOne.getDate() + 1);
  const months =
    (endPlusOne.getFullYear() - start.getFullYear()) * 12 +
    (endPlusOne.getMonth() - start.getMonth());

  return months > 0 ? months : 12;
}

/** Opportunity value for board totals / card display. */
export function getCardBoardValue(
  card: PipelineCard,
  boardSlug?: string | null
): number {
  if (boardSlug === 'onboarding') {
    // Cash collected on Payment tab (deposit + advance), only once marked received
    if (card.moveInPaymentStatus !== 'paid') return 0;
    const deposit = Number(card.depositAmount) || 0;
    const advance = Number(card.advanceAmount) || 0;
    const total = deposit + advance;
    return Number.isFinite(total) && total > 0 ? total : 0;
  }
  const monthly = Number(card.amount);
  if (!Number.isFinite(monthly) || monthly <= 0) return 0;
  return monthly;
}

function formatShortDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function fieldLabel(key: CardFieldKey): string {
  return CARD_FIELD_DEFS.find((d) => d.key === key)?.label || key;
}

export function formatCardFieldValue(
  key: CardFieldKey,
  card: PipelineCard,
  options?: { monthlySuffix?: boolean; boardSlug?: string | null }
): string {
  switch (key) {
    case 'source':
      return card.source?.trim() ? formatPipelineLeadSource(card.source) : '—';
    case 'amount': {
      const value = getCardBoardValue(card, options?.boardSlug);
      if (options?.boardSlug === 'onboarding') {
        return formatPeso(value);
      }
      return (
        formatPeso(card.amount) +
        (options?.monthlySuffix ? '/mo' : '')
      );
    }
    case 'balance':
      return formatPeso(card.amount);
    case 'dueAt':
      return formatShortDate(card.dueAt);
    case 'nextActionAt':
      return formatDateTime(card.nextActionAt);
    case 'viewingAt':
      return formatDateTime(card.viewingAt);
    case 'unit':
      if (card.buildingName && card.roomNumber) {
        return `${card.buildingName} · ${card.roomNumber}`;
      }
      return card.buildingName || card.roomNumber || '—';
    case 'email':
      return card.contactEmail?.trim() || '—';
    case 'phone':
      return card.contactPhone?.trim() || '—';
    case 'tags':
      return card.tags?.length
        ? card.tags.map(formatMaintenanceTag).join(' · ')
        : '—';
    case 'notes': {
      const notes = formatPaymentNotesForPeople(card.notes) || '';
      if (!notes) return '—';
      return notes.length > 80 ? `${notes.slice(0, 77)}…` : notes;
    }
    default:
      return '—';
  }
}
