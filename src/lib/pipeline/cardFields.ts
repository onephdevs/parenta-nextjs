import type { PipelineBoardSlug, PipelineCard } from '@/types/database';

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
  { key: 'amount', label: 'Value / Rent' },
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

const STORAGE_PREFIX = 'parenta.pipeline.cardFields.';

const BOARD_DEFAULTS: Record<string, CardFieldPair> = {
  onboarding: ['source', 'unit'],
  payments: ['balance', 'dueAt'],
  expenses: ['amount', 'dueAt'],
  maintenance: ['unit', 'nextActionAt'],
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

function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
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
  options?: { monthlySuffix?: boolean }
): string {
  switch (key) {
    case 'source':
      return card.source?.trim() || '—';
    case 'amount':
    case 'balance':
      return (
        formatPeso(card.amount) +
        (options?.monthlySuffix && key === 'amount' ? '/mo' : '')
      );
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
      return card.tags?.length ? card.tags.join(', ') : '—';
    case 'notes':
      return card.notes?.trim() || '—';
    default:
      return '—';
  }
}
