/**
 * Seed/import scripts tag notes with `[ledger:…]` or `[ledger-exp:…]`
 * for idempotency. Admins and tenants should not see that raw marker.
 */

const LEDGER_TAG_RE = /\[ledger(?:-exp)?:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})\]/i;
const LEDGER_TAG_STRIP_RE = /\s*\[ledger(?:-exp)?:\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}\]\s*/gi;
const LEDGER_TAG_CAPTURE_RE = /(\[ledger(?:-exp)?:\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}\])/i;

export interface ParsedPaymentNotes {
  /** Human-facing description without the ledger tag */
  label: string;
  /** Billing period start (ISO date) when a ledger tag was present */
  periodStart?: string;
  /** Billing period end (ISO date) when a ledger tag was present */
  periodEnd?: string;
  /** Raw idempotency tag to preserve on save, e.g. [ledger:2026-06-16:2026-07-15] */
  ledgerTag?: string;
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
  const tagMatch = notes.match(LEDGER_TAG_CAPTURE_RE);
  const label = notes.replace(LEDGER_TAG_STRIP_RE, ' ').replace(/\s{2,}/g, ' ').trim();

  if (!match) {
    return { label: notes };
  }

  return {
    label,
    periodStart: match[1],
    periodEnd: match[2],
    ledgerTag: tagMatch?.[1],
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

/**
 * Single human-readable string for editors / follow-up notes.
 * e.g. "Electric unpaid 835 · Billing period: Jun 16, 2026 – Jul 15, 2026"
 */
export function formatPaymentNotesForPeople(raw?: string | null): string {
  const { label, billingPeriodLabel } = formatPaymentNotesDisplay(raw);
  if (!label && !billingPeriodLabel) return '';
  if (!billingPeriodLabel) return label;
  if (!label) return `Billing period: ${billingPeriodLabel}`;
  return `${label} · Billing period: ${billingPeriodLabel}`;
}

/**
 * When saving user-edited notes that previously had a ledger tag,
 * re-attach the tag so import/sync idempotency is preserved.
 */
export function preserveLedgerTagOnSave(
  editedNotes: string,
  originalRaw?: string | null
): string {
  const edited = editedNotes.trim();
  const original = parsePaymentNotes(originalRaw);
  if (!original.ledgerTag) return edited || '';

  // Don't duplicate if the user somehow kept/pasted the tag
  if (LEDGER_TAG_RE.test(edited)) {
    return edited;
  }

  // Strip any human "Billing period: …" we may have shown, keep the free-text label
  const withoutPeriod = edited
    .replace(/\s*·\s*Billing period:\s*.+$/i, '')
    .replace(/^Billing period:\s*.+$/i, '')
    .trim();

  const label = withoutPeriod || original.label || '';
  return label ? `${label} ${original.ledgerTag}` : original.ledgerTag;
}
