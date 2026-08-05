/**
 * Lease clause component types — structured section bodies for the designer.
 */

export type LeaseComponentType =
  | 'rich_text'
  | 'choice'
  | 'utility_table'
  | 'free_text'
  | 'signatures'
  | 'key_terms';

export interface UtilityAllocationRow {
  id: string;
  label: string;
  checked: boolean;
  /** null = blank underline in print; number = filled percent */
  tenantPaysPercent: number | null;
}

export interface ChoiceNestedOption {
  id: string;
  label: string;
  selected: boolean;
}

export interface ChoiceOption {
  id: string;
  letter: string;
  label: string;
  selected: boolean;
  /** Nested checkboxes shown under this option (e.g. One-Time vs Daily late fee) */
  nested?: ChoiceNestedOption[];
}

export interface ChoiceConfig {
  intro: string;
  /** Shown after title, e.g. "(select one)" */
  selectHint?: string;
  /** true = radio (early termination); false = multi-check */
  exclusive: boolean;
  options: ChoiceOption[];
}

export interface UtilityTableConfig {
  intro: string;
  rows: UtilityAllocationRow[];
}

export interface FreeTextConfig {
  text: string;
  blankLineCount: number;
}

const UTILITY_MARKER = '__utility_table_v1__';
const CHOICE_MARKER = '__choice_v1__';
const FREE_TEXT_MARKER = '__free_text_v1__';
const KEY_TERMS_MARKER = '__key_terms_v1__';

/** Matches the printable blank-form reference (7 utility rows). */
export const DEFAULT_UTILITY_ROWS: UtilityAllocationRow[] = [
  { id: 'gas_electric', label: 'Gas/Electricity', checked: false, tenantPaysPercent: null },
  { id: 'water', label: 'Water', checked: false, tenantPaysPercent: null },
  { id: 'garbage', label: 'Garbage', checked: false, tenantPaysPercent: null },
  { id: 'phone', label: 'Phone', checked: false, tenantPaysPercent: null },
  { id: 'internet', label: 'Internet', checked: false, tenantPaysPercent: null },
  { id: 'cable', label: 'Cable/Satellite TV', checked: false, tenantPaysPercent: null },
  { id: 'other', label: 'Other', checked: false, tenantPaysPercent: null },
];

/** Sample filled utilities for designer preview defaults when resetting compact template. */
export const SAMPLE_UTILITY_ROWS: UtilityAllocationRow[] = [
  { id: 'gas_electric', label: 'Gas/Electricity', checked: true, tenantPaysPercent: 50 },
  { id: 'water', label: 'Water', checked: true, tenantPaysPercent: 50 },
  { id: 'garbage', label: 'Garbage', checked: true, tenantPaysPercent: 100 },
  { id: 'internet', label: 'Internet', checked: false, tenantPaysPercent: null },
  { id: 'other', label: 'Other', checked: false, tenantPaysPercent: null },
];

export const COMPONENT_TYPE_META: Record<
  LeaseComponentType,
  { label: string; shortLabel: string }
> = {
  rich_text: { label: 'List / clause text', shortLabel: 'Text' },
  choice: { label: 'Checkbox options', shortLabel: 'Checkbox' },
  utility_table: { label: 'Table component', shortLabel: 'Table' },
  free_text: { label: 'Free-text addendum', shortLabel: 'Addendum' },
  signatures: { label: 'Signature block', shortLabel: 'Signatures' },
  key_terms: { label: 'Editable clause text', shortLabel: 'Text' },
};

/** Infer component type from section_key + body JSON marker. */
export function resolveComponentType(
  sectionKey: string,
  body: string
): LeaseComponentType {
  if (sectionKey === 'signatures') return 'signatures';
  if (sectionKey === 'key_terms') return 'key_terms';
  if (sectionKey === 'utilities' || sectionKey === 'utility_allocation') {
    return 'utility_table';
  }
  if (
    sectionKey === 'additional_terms' ||
    sectionKey === 'addendum' ||
    sectionKey === 'custom_clauses'
  ) {
    return 'free_text';
  }
  if (sectionKey === 'late_fee' || sectionKey === 'early_termination') {
    return 'choice';
  }

  const trimmed = (body || '').trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { __type?: string };
      if (parsed.__type === UTILITY_MARKER) return 'utility_table';
      if (parsed.__type === CHOICE_MARKER) return 'choice';
      if (parsed.__type === FREE_TEXT_MARKER) return 'free_text';
      if (parsed.__type === KEY_TERMS_MARKER) return 'key_terms';
    } catch {
      /* plain text */
    }
  }
  return 'rich_text';
}

function mapChoiceOption(o: ChoiceOption, i: number): ChoiceOption {
  return {
    id: String(o.id || `opt_${i}`),
    letter: String(o.letter || String.fromCharCode(97 + i)),
    label: String(o.label || ''),
    selected: Boolean(o.selected),
    nested: Array.isArray(o.nested)
      ? o.nested.map((n, ni) => ({
          id: String(n.id || `nested_${i}_${ni}`),
          label: String(n.label || ''),
          selected: Boolean(n.selected),
        }))
      : undefined,
  };
}

export function parseUtilityTable(body: string): UtilityTableConfig {
  const trimmed = (body || '').trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        __type?: string;
        intro?: string;
        rows?: UtilityAllocationRow[];
      };
      if (parsed.__type === UTILITY_MARKER && Array.isArray(parsed.rows)) {
        return {
          intro:
            parsed.intro ||
            'Rent includes utilities, except as specified below:',
          rows: parsed.rows.map((r, i) => ({
            id: String(r.id || `row_${i}`),
            label: String(r.label || 'Utility'),
            checked: Boolean(r.checked),
            tenantPaysPercent:
              r.tenantPaysPercent == null || Number.isNaN(Number(r.tenantPaysPercent))
                ? null
                : Number(r.tenantPaysPercent),
          })),
        };
      }
    } catch {
      /* fall through */
    }
  }
  return {
    intro: 'Rent includes utilities, except as specified below:',
    rows: DEFAULT_UTILITY_ROWS.map((r) => ({ ...r })),
  };
}

export function serializeUtilityTable(config: UtilityTableConfig): string {
  return JSON.stringify({
    __type: UTILITY_MARKER,
    intro: config.intro,
    rows: config.rows,
  });
}

export function defaultLateFeeChoice(): ChoiceConfig {
  return {
    intro: '',
    selectHint: '(select one)',
    exclusive: true,
    options: [
      {
        id: 'penalty',
        letter: 'a',
        label:
          'If Rent is not paid within {{lease.lateFeeGraceDays}} of the Due Date, a penalty of {{lease.lateFeeLabel}} shall be due and payable',
        selected: true,
        nested: [
          { id: 'one_time', label: 'One-Time Payment', selected: true },
          { id: 'daily', label: 'for Every Day Rent is Late', selected: false },
        ],
      },
      {
        id: 'none',
        letter: 'b',
        label: 'There shall be No Late Fee if Rent is late.',
        selected: false,
      },
    ],
  };
}

export function defaultEarlyTerminationChoice(): ChoiceConfig {
  return {
    intro: '',
    selectHint: '(select one)',
    exclusive: true,
    options: [
      {
        id: 'allowed',
        letter: 'a',
        label:
          'The Tenant(s) can terminate this Agreement by providing the Landlord at least 30 days\' notice and paying a termination fee of {{lease.securityDeposit}}.',
        selected: true,
      },
      {
        id: 'none',
        letter: 'b',
        label:
          'The Tenant(s) shall not have the right to terminate this Agreement early.',
        selected: false,
      },
    ],
  };
}

export function parseChoice(body: string, sectionKey?: string): ChoiceConfig {
  const trimmed = (body || '').trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        __type?: string;
        intro?: string;
        selectHint?: string;
        exclusive?: boolean;
        options?: ChoiceOption[];
      };
      if (parsed.__type === CHOICE_MARKER && Array.isArray(parsed.options)) {
        return {
          intro: parsed.intro || '',
          selectHint: parsed.selectHint,
          exclusive: parsed.exclusive !== false,
          options: parsed.options.map(mapChoiceOption),
        };
      }
    } catch {
      /* fall through */
    }
  }

  if (sectionKey === 'early_termination') return defaultEarlyTerminationChoice();
  if (sectionKey === 'late_fee') return defaultLateFeeChoice();

  return {
    intro: '',
    selectHint: '(select one)',
    exclusive: true,
    options: [],
  };
}

export function serializeChoice(config: ChoiceConfig): string {
  return JSON.stringify({
    __type: CHOICE_MARKER,
    intro: config.intro,
    selectHint: config.selectHint,
    exclusive: config.exclusive,
    options: config.options,
  });
}

export function parseFreeText(body: string): FreeTextConfig {
  const trimmed = (body || '').trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        __type?: string;
        text?: string;
        blankLineCount?: number;
      };
      if (parsed.__type === FREE_TEXT_MARKER) {
        return {
          text: String(parsed.text || ''),
          blankLineCount: Math.max(1, Number(parsed.blankLineCount) || 2),
        };
      }
    } catch {
      /* fall through */
    }
  }
  if (trimmed && !trimmed.startsWith('{')) {
    return { text: trimmed, blankLineCount: 2 };
  }
  return { text: '', blankLineCount: 2 };
}

export function serializeFreeText(config: FreeTextConfig): string {
  return JSON.stringify({
    __type: FREE_TEXT_MARKER,
    text: config.text,
    blankLineCount: config.blankLineCount,
  });
}

export function newUtilityRow(label = 'New utility'): UtilityAllocationRow {
  return {
    id: `util_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    label,
    checked: false,
    tenantPaysPercent: null,
  };
}

/** Section title as shown on the printable page */
export function printableSectionTitle(sectionKey: string, title: string): string {
  const overrides: Record<string, string> = {
    parties: 'THE PARTIES',
    term: 'TERM OF RENTAL',
    rent: 'RENT',
    late_fee: 'LATE FEE',
    early_termination: 'EARLY TERMINATION',
    utilities: 'UTILITIES',
    additional_terms: 'ADDITIONAL TERMS AND CONDITIONS',
    signatures: '',
  };
  if (sectionKey in overrides) return overrides[sectionKey];
  return title.toUpperCase();
}
