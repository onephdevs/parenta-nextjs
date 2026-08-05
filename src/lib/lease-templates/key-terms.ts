/**
 * Key terms section — sentence-style clause text with {{tokens}}.
 */

export interface KeyTermField {
  id: string;
  label: string;
  /** One or more {{tokens}} composing the value */
  token: string;
  visible: boolean;
}

export const DEFAULT_KEY_TERM_FIELDS: KeyTermField[] = [
  {
    id: 'rentAmount',
    label: 'Monthly rent',
    token: '{{lease.rentAmount}}',
    visible: true,
  },
  {
    id: 'securityDeposit',
    label: 'Security deposit',
    token: '{{lease.securityDeposit}}',
    visible: true,
  },
  {
    id: 'advanceRent',
    label: 'Advance rent',
    token: '{{lease.advanceRent}}',
    visible: true,
  },
  {
    id: 'leaseStart',
    label: 'Lease start',
    token: '{{lease.startDate}}',
    visible: true,
  },
  {
    id: 'leaseEnd',
    label: 'Lease end',
    token: '{{lease.endDate}}',
    visible: true,
  },
  {
    id: 'moveIn',
    label: 'Move-in',
    token: '{{lease.moveInDate}}',
    visible: true,
  },
  {
    id: 'unit',
    label: 'Unit',
    token: '{{unit.number}} at {{building.name}}',
    visible: true,
  },
];

const CONFIG_MARKER = '__key_terms_v1__';

const LABEL_ALIASES: Record<string, string> = {
  'monthly rent': 'rentAmount',
  rent: 'rentAmount',
  'security deposit': 'securityDeposit',
  deposit: 'securityDeposit',
  'advance rent': 'advanceRent',
  'lease start': 'leaseStart',
  'lease end': 'leaseEnd',
  'lease dates': 'leaseDates',
  'move-in': 'moveIn',
  'move in': 'moveIn',
  unit: 'unit',
};

/** Canonical sentence admins edit — preview resolves the same {{tokens}}. */
export const KEY_TERMS_SENTENCE_TEMPLATE = `For this tenancy, the monthly rent is {{lease.rentAmount}}, the security deposit is {{lease.securityDeposit}}, and advance rent is {{lease.advanceRent}}. The lease starts on {{lease.startDate}} and ends on {{lease.endDate}}, with move-in on {{lease.moveInDate}}, for Unit {{unit.number}} at {{building.name}}.`;

export function isKeyTermsSentenceBody(body: string): boolean {
  const trimmed = (body || '').trim();
  if (!trimmed || trimmed.startsWith('{')) return false;
  if (/^Monthly rent\s*:/m.test(trimmed) || /^Security deposit\s*:/m.test(trimmed)) {
    return false;
  }
  return /for this tenancy|monthly rent is|security deposit is/i.test(trimmed);
}

export function parseKeyTermFields(body: string): KeyTermField[] {
  const trimmed = (body || '').trim();
  if (!trimmed) return DEFAULT_KEY_TERM_FIELDS.map((f) => ({ ...f }));

  try {
    const parsed = JSON.parse(trimmed) as {
      __type?: string;
      fields?: KeyTermField[];
    };
    if (parsed?.__type === CONFIG_MARKER && Array.isArray(parsed.fields) && parsed.fields.length) {
      return parsed.fields.map((f) => ({
        id: String(f.id),
        label: String(f.label || f.id),
        token: String(f.token || ''),
        visible: f.visible !== false,
      }));
    }
  } catch {
    /* legacy plain-text body */
  }

  const fields = DEFAULT_KEY_TERM_FIELDS.map((f) => ({ ...f, visible: false }));
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (!match) continue;
    const label = match[1].trim();
    const token = match[2].trim();
    const aliasId = LABEL_ALIASES[label.toLowerCase()];
    const existing =
      (aliasId ? fields.find((f) => f.id === aliasId) : undefined) ||
      fields.find(
        (f) => f.token === token || f.label.toLowerCase() === label.toLowerCase()
      );
    if (existing) {
      existing.visible = true;
      existing.label = label;
      existing.token = token;
    } else {
      fields.push({
        id: `custom_${fields.length}`,
        label,
        token,
        visible: true,
      });
    }
  }

  if (!fields.some((f) => f.visible)) {
    return DEFAULT_KEY_TERM_FIELDS.map((f) => ({ ...f }));
  }
  return fields;
}

export function serializeKeyTermFields(fields: KeyTermField[]): string {
  return JSON.stringify({
    __type: CONFIG_MARKER,
    fields,
  });
}

/** Sentence-style clause body from visible fields (tokens kept for editing/preview). */
export function keyTermsDisplayBody(fields: KeyTermField[]): string {
  const byId = new Map(fields.filter((f) => f.visible).map((f) => [f.id, f]));

  const rent = byId.get('rentAmount');
  const deposit = byId.get('securityDeposit');
  const advance = byId.get('advanceRent');
  const leaseStart = byId.get('leaseStart');
  const leaseEnd = byId.get('leaseEnd');
  const dates = byId.get('leaseDates');
  const moveIn = byId.get('moveIn');
  const unit = byId.get('unit');

  const parts: string[] = [];

  if (rent || deposit || advance) {
    const chunks: string[] = [];
    if (rent) chunks.push(`the monthly rent is ${rent.token}`);
    if (deposit) chunks.push(`the security deposit is ${deposit.token}`);
    if (advance) chunks.push(`advance rent is ${advance.token}`);
    if (chunks.length === 1) {
      parts.push(`For this tenancy, ${chunks[0]}.`);
    } else if (chunks.length === 2) {
      parts.push(`For this tenancy, ${chunks[0]}, and ${chunks[1]}.`);
    } else {
      parts.push(
        `For this tenancy, ${chunks.slice(0, -1).join(', ')}, and ${chunks[chunks.length - 1]}.`
      );
    }
  }

  const startTok = leaseStart?.token;
  const endTok = leaseEnd?.token;
  if (leaseStart || leaseEnd || dates || moveIn) {
    if (leaseStart && leaseEnd && moveIn) {
      parts.push(
        `The lease starts on ${startTok} and ends on ${endTok}, with move-in on ${moveIn.token}.`
      );
    } else if (dates && moveIn) {
      parts.push(`The lease term runs ${dates.token}, with move-in on ${moveIn.token}.`);
    } else if (leaseStart && leaseEnd) {
      parts.push(`The lease starts on ${startTok} and ends on ${endTok}.`);
    } else if (dates) {
      parts.push(`The lease term runs ${dates.token}.`);
    } else if (moveIn) {
      parts.push(`Move-in is scheduled for ${moveIn.token}.`);
    } else if (leaseStart) {
      parts.push(`The lease starts on ${startTok}.`);
    } else if (leaseEnd) {
      parts.push(`The lease ends on ${endTok}.`);
    }
  }

  if (unit) {
    parts.push(`The premises are Unit ${unit.token}.`);
  }

  const known = new Set([
    'rentAmount',
    'securityDeposit',
    'advanceRent',
    'leaseStart',
    'leaseEnd',
    'leaseDates',
    'moveIn',
    'unit',
  ]);
  for (const f of fields.filter((f) => f.visible)) {
    if (known.has(f.id)) continue;
    parts.push(`${f.label} is ${f.token}.`);
  }

  if (!parts.length) return KEY_TERMS_SENTENCE_TEMPLATE;
  return parts.join(' ');
}

/**
 * Normalize stored key-terms body to the editable sentence form.
 * Converts JSON configs and "Label: {{token}}" lists.
 */
export function normalizeKeyTermsEditorBody(body: string): {
  text: string;
  converted: boolean;
} {
  const trimmed = (body || '').trim();
  if (!trimmed) {
    return { text: KEY_TERMS_SENTENCE_TEMPLATE, converted: true };
  }
  if (isKeyTermsSentenceBody(trimmed)) {
    return { text: trimmed, converted: false };
  }
  return {
    text: keyTermsDisplayBody(parseKeyTermFields(trimmed)) || KEY_TERMS_SENTENCE_TEMPLATE,
    converted: true,
  };
}
