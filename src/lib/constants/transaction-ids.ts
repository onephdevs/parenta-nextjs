/**
 * Parenta internal transaction IDs
 *
 * Format: txn-{type}-{######}-{YY}
 * Example: txn-r-000042-26
 *
 * Parts:
 *   txn     — fixed prefix (Parenta transaction)
 *   type    — single-letter code (see TXN_TYPE_CODES)
 *   ######  — per-type, per-year sequence (1…999999), zero-padded to 6
 *   YY      — calendar year (Asia/Manila), e.g. 26 for 2026
 *
 * Why year (not day/month)?
 *   - Short and stable for the whole year
 *   - Sequence resets yearly so numbers stay human-readable
 *   - Day/month would make IDs longer without helping uniqueness
 *
 * Two different “references” in payment flows:
 *   1. parentaTxnId     — this format (our ledger / board tracking)
 *   2. referenceNumber  — GCash / bank receipt number the tenant typed
 *      Admin verifies (2) against the uploaded receipt photo, then confirms.
 */

export const TXN_PREFIX = 'txn' as const;

/** Single-letter type codes — keep this list as the app reference. */
export const TXN_TYPE_CODES = {
  /** Tenant rent (GCash / bank claim → admin verify → Paid) */
  r: {
    code: 'r',
    label: 'Rent',
    description: 'Monthly rent and rent-related tenant payments',
  },
  /** Tenant utility bill payment (electric / water via portal) */
  b: {
    code: 'b',
    label: 'Bill',
    description: 'Electricity or water bill paid by tenant',
  },
  /** Building / vendor expense (admin-logged outflow) */
  e: {
    code: 'e',
    label: 'Expense',
    description: 'Building expense or vendor payment logged by admin',
  },
  /** Security / utility deposit */
  d: {
    code: 'd',
    label: 'Deposit',
    description: 'Security or utility deposit',
  },
  /** Advance / prepaid rent credit */
  a: {
    code: 'a',
    label: 'Advance',
    description: 'Advance rent or prepaid credit',
  },
} as const;

export type TxnTypeCode = keyof typeof TXN_TYPE_CODES;

export const TXN_TYPE_CODE_LIST = Object.keys(TXN_TYPE_CODES) as TxnTypeCode[];

const TXN_ID_RE = /^txn-([a-z])-(\d{6})-(\d{2})$/i;

export function isTxnTypeCode(value: string): value is TxnTypeCode {
  return value in TXN_TYPE_CODES;
}

/** Map payment_type / utility context → txn type code */
export function txnTypeFromPaymentType(
  paymentType: string | null | undefined
): TxnTypeCode {
  switch ((paymentType || '').toLowerCase()) {
    case 'deposit':
      return 'd';
    case 'advance':
      return 'a';
    case 'utility':
    case 'electricity':
    case 'water':
      return 'b';
    case 'expense':
    case 'other':
      return 'e';
    case 'rent':
    case 'late_fee':
    default:
      return 'r';
  }
}

export function formatParentaTxnId(
  type: TxnTypeCode,
  sequence: number,
  yearYy: number
): string {
  const seq = Math.max(1, Math.floor(sequence));
  const yy = String(yearYy).padStart(2, '0').slice(-2);
  return `${TXN_PREFIX}-${type}-${String(seq).padStart(6, '0')}-${yy}`;
}

export function parseParentaTxnId(value: string | null | undefined): {
  type: TxnTypeCode;
  sequence: number;
  yearYy: number;
} | null {
  if (!value) return null;
  const match = TXN_ID_RE.exec(value.trim());
  if (!match) return null;
  const type = match[1].toLowerCase();
  if (!isTxnTypeCode(type)) return null;
  return {
    type,
    sequence: parseInt(match[2], 10),
    yearYy: parseInt(match[3], 10),
  };
}

/** Calendar year as YY in Asia/Manila (property ops timezone). */
export function currentTxnYearYy(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: '2-digit',
  }).formatToParts(now);
  const yy = parts.find((p) => p.type === 'year')?.value;
  return yy ? parseInt(yy, 10) : now.getFullYear() % 100;
}
