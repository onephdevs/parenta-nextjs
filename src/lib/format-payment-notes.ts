/**
 * Seed/import scripts tag notes with `[ledger:…]` or `[ledger-exp:…]`
 * for idempotency. Admins and tenants should not see that raw marker.
 */

const LEDGER_TAG_RE = /\[ledger(?:-exp)?:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})\]/i;
const LEDGER_TAG_STRIP_RE = /\s*\[ledger(?:-exp)?:\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}\]\s*/gi;

export interface ParsedPaymentNotes {
  /** Human-facing description without the ledger tag */
  label: string;
  /** Billing period start (ISO date) when a ledger tag was present */
  periodStart?: string;
  /** Billing period end (ISO date) when a ledger tag was present */
  periodEnd?: string;
}

function formatPeriodDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function parsePaymentNotes(raw?: string | null): ParsedPaymentNotes {
  const notes = raw?.trim() || '';
  if (!notes) return { label: '' };

  const match = notes.match(LEDGER_TAG_RE);
  const label = notes.replace(LEDGER_TAG_STRIP_RE, ' ').replace(/\s{2,}/g, ' ').trim();

  if (!match) {
    return { label: notes };
  }

  return {
    label,
    periodStart: match[1],
    periodEnd: match[2],
  };
}

/** Short label for tables (strips ledger / ledger-exp tags only). */
export function formatPaymentNotesLabel(raw?: string | null, fallback = '-'): string {
  const { label } = parsePaymentNotes(raw);
  return label || fallback;
}

/** Label plus optional "Billing period: …" for detail views. */
export function formatPaymentNotesDisplay(raw?: string | null): {
  label: string;
  billingPeriodLabel: string | null;
} {
  const parsed = parsePaymentNotes(raw);
  if (!parsed.periodStart || !parsed.periodEnd) {
    return { label: parsed.label, billingPeriodLabel: null };
  }
  return {
    label: parsed.label,
    billingPeriodLabel: `${formatPeriodDate(parsed.periodStart)} – ${formatPeriodDate(parsed.periodEnd)}`,
  };
}
