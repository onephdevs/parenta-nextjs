/**
 * Resolve {{token}} placeholders and render lease template sections.
 */

import {
  LEASE_TEMPLATE_VARIABLES,
  type LeaseTemplateContext,
  type LeaseTemplateSection,
  type LeaseSectionConditionKey,
} from './types';
import {
  isKeyTermsSentenceBody,
  keyTermsDisplayBody,
  normalizeKeyTermsEditorBody,
  parseKeyTermFields,
} from './key-terms';
import {
  parseChoice,
  parseFreeText,
  parseUtilityTable,
  printableSectionTitle,
  resolveComponentType,
} from './components';

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ordinalDay(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate || isoDate === 'Open-ended') return isoDate || '—';
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDays(n: number): string {
  return `${n} day${n === 1 ? '' : 's'}`;
}

function getByPath(ctx: LeaseTemplateContext, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = ctx;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function formatTokenValue(
  key: string,
  raw: unknown,
  forHtml: boolean
): string {
  const def = LEASE_TEMPLATE_VARIABLES.find((v) => v.key === key);
  const format = def?.format || 'text';

  if (raw == null || raw === '') {
    if (key === 'lease.endDate') return 'Open-ended';
    return '—';
  }

  let text: string;
  switch (format) {
    case 'currency':
      text = formatPhp(Number(raw));
      break;
    case 'date':
      text = formatDisplayDate(String(raw));
      break;
    case 'ordinal_day':
      text = ordinalDay(Number(raw));
      break;
    case 'days':
      text = formatDays(Number(raw));
      break;
    default:
      text = String(raw);
  }

  return forHtml ? escapeHtml(text) : text;
}

export function resolveTokens(
  body: string,
  ctx: LeaseTemplateContext,
  options?: { highlight?: boolean; forHtml?: boolean }
): string {
  const forHtml = options?.forHtml !== false;
  const highlight = options?.highlight === true;

  return body.replace(TOKEN_RE, (_match, key: string) => {
    const raw = getByPath(ctx, key);
    const formatted = formatTokenValue(key, raw, forHtml);
    if (highlight && forHtml) {
      return `<u class="fill">${formatted}</u>`;
    }
    return formatted;
  });
}

export function evaluateCondition(
  conditionKey: LeaseSectionConditionKey | string | null | undefined,
  ctx: LeaseTemplateContext
): boolean {
  if (!conditionKey) return true;
  const flags = ctx.conditions || {};
  if (conditionKey in flags) {
    return Boolean(flags[conditionKey as keyof typeof flags]);
  }

  switch (conditionKey) {
    case 'has_co_tenants':
      return (ctx.occupants || []).some((o) => o.role !== 'Primary');
    case 'has_pet_policy':
      return Boolean(ctx.building.petPolicy?.trim());
    case 'has_house_rules':
      return Boolean(ctx.building.houseRules?.trim());
    case 'has_custom_clauses':
      return (ctx.customClauses || []).some((c) => c.trim());
    default:
      return true;
  }
}

export function deriveConditions(
  ctx: LeaseTemplateContext
): NonNullable<LeaseTemplateContext['conditions']> {
  return {
    has_co_tenants: (ctx.occupants || []).some((o) => o.role !== 'Primary'),
    has_pet_policy: Boolean(ctx.building.petPolicy?.trim()),
    has_house_rules: Boolean(ctx.building.houseRules?.trim()),
    has_custom_clauses: (ctx.customClauses || []).some((c) => c.trim()),
    ...ctx.conditions,
  };
}

function paragraphsToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  // Preserve author line breaks so clauses read as sentences, line after line
  return trimmed
    .split('\n')
    .map((line) => line.trimEnd())
    .join('<br />');
}

export function renderSectionBodyHtml(
  body: string,
  ctx: LeaseTemplateContext,
  highlight = false
): string {
  const resolved = resolveTokens(body, ctx, { highlight, forHtml: true });
  return paragraphsToHtml(resolved);
}

export function renderOccupantsTableHtml(ctx: LeaseTemplateContext): string {
  const co = (ctx.occupants || []).filter((o) => o.role !== 'Primary');
  if (co.length === 0) return '';
  const rows = co
    .map(
      (o) => `<tr>
      <td>${escapeHtml(o.name)}</td>
      <td><span class="badge">${escapeHtml(o.role)}</span></td>
      <td>${escapeHtml(o.relationship || '—')}</td>
    </tr>`
    )
    .join('');
  return `<table class="occupants">
    <thead><tr><th>Name</th><th>Role</th><th>Relationship</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function renderCustomClausesHtml(ctx: LeaseTemplateContext): string {
  const clauses = (ctx.customClauses || []).filter((c) => c.trim());
  if (!clauses.length) return '';
  return `<ol class="clauses">${clauses
    .map((c) => `<li>${escapeHtml(c.trim())}</li>`)
    .join('')}</ol>`;
}

function renderUtilityTableHtml(
  body: string,
  ctx: LeaseTemplateContext,
  highlight: boolean
): string {
  const config = parseUtilityTable(body);
  const intro = resolveTokens(config.intro, ctx, { highlight, forHtml: true });
  const rows = config.rows
    .map((row, idx) => {
      const mark = row.checked ? '☑' : '☐';
      const pct =
        row.checked && row.tenantPaysPercent != null
          ? `<u class="fill">${row.tenantPaysPercent}</u>`
          : '<span class="blank-pct">____</span>';
      const muted = row.checked ? '' : ' util-row--muted';
      return `<div class="util-row${muted}"><span class="util-num">${idx + 1})</span> <span class="cb">${mark}</span> <span class="util-label">${escapeHtml(row.label)}:</span> <span class="util-mid">Tenant pays</span> <span class="util-pct">${pct} % of monthly bill</span></div>`;
    })
    .join('');
  return `<span class="clause-body">${intro}</span><div class="util-table">${rows}</div>`;
}

function renderChoiceHtml(
  body: string,
  sectionKey: string,
  ctx: LeaseTemplateContext,
  highlight: boolean
): string {
  const config = parseChoice(body, sectionKey);
  const hint = config.selectHint
    ? ` <span class="select-hint">${escapeHtml(config.selectHint)}</span>`
    : '';
  const intro = config.intro
    ? resolveTokens(config.intro, ctx, { highlight, forHtml: true })
    : '';
  const options = config.options
    .map((opt) => {
      const mark = opt.selected ? '☑' : '☐';
      const label = resolveTokens(opt.label, ctx, { highlight, forHtml: true });
      const nested =
        opt.nested && opt.nested.length
          ? `<div class="choice-nested">${opt.nested
              .map((n) => {
                const nm = n.selected ? '☑' : '☐';
                return `<span class="nested-opt"><span class="cb">${nm}</span> ${escapeHtml(n.label)}</span>`;
              })
              .join(' ')}</div>`
          : '';
      return `<div class="choice-row"><span class="cb">${mark}</span> <strong>${escapeHtml(opt.letter)})</strong> ${label}${nested}</div>`;
    })
    .join('');
  return `${hint}${intro ? ` ${intro}` : ''}<div class="choice-list">${options}</div>`;
}

function renderFreeTextHtml(body: string): string {
  const config = parseFreeText(body);
  if (config.text.trim()) {
    return paragraphsToHtml(escapeHtml(config.text.trim()));
  }
  const lines = Array.from({ length: config.blankLineCount }, () =>
    '<div class="blank-line"></div>'
  ).join('');
  return `<div class="addendum-blanks">${lines}</div>`;
}

function renderSignaturesHtml(
  _body: string,
  _ctx: LeaseTemplateContext,
  requireWitness: boolean
): string {
  const party = (sigLabel: string) =>
    `<div class="sig-row">
      <div class="sig-col"><span class="sig-label">${escapeHtml(sigLabel)}</span><span class="sig-line"></span></div>
      <div class="sig-col"><span class="sig-label">Print Name:</span><span class="sig-line"></span></div>
      <div class="sig-col"><span class="sig-label">Date:</span><span class="sig-line"></span></div>
    </div>`;
  const parties = [party("Landlord's Signature:"), party("Tenant's Signature:")];
  if (requireWitness) parties.push(party("Witness's Signature:"));
  return `<div class="sig-block">${parties.join('')}</div>`;
}

export interface RenderedSection {
  sectionKey: string;
  title: string;
  printableTitle: string;
  html: string;
  componentType?: string;
}

export function renderTemplateSections(
  sections: LeaseTemplateSection[],
  ctx: LeaseTemplateContext,
  options?: { highlight?: boolean; requireWitness?: boolean }
): RenderedSection[] {
  const enriched: LeaseTemplateContext = {
    ...ctx,
    conditions: deriveConditions(ctx),
    lease: {
      ...ctx.lease,
      endDate: ctx.lease.endDate || 'Open-ended',
    },
  };

  const sorted = [...sections]
    .filter((s) => s.isEnabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const out: RenderedSection[] = [];

  for (const section of sorted) {
    if (!evaluateCondition(section.conditionKey, enriched)) continue;

    const componentType = resolveComponentType(section.sectionKey, section.body);
    let html = '';

    switch (componentType) {
      case 'key_terms': {
        const trimmed = (section.body || '').trim();
        const bodyForRender = isKeyTermsSentenceBody(trimmed)
          ? section.body
          : keyTermsDisplayBody(parseKeyTermFields(section.body));
        html = renderSectionBodyHtml(bodyForRender, enriched, options?.highlight);
        break;
      }
      case 'utility_table':
        html = renderUtilityTableHtml(
          section.body,
          enriched,
          options?.highlight === true
        );
        break;
      case 'choice':
        html = renderChoiceHtml(
          section.body,
          section.sectionKey,
          enriched,
          options?.highlight === true
        );
        break;
      case 'free_text':
        html = renderFreeTextHtml(section.body);
        break;
      case 'signatures':
        html = renderSignaturesHtml(
          section.body,
          enriched,
          options?.requireWitness !== false
        );
        break;
      default:
        html = renderSectionBodyHtml(
          section.body,
          enriched,
          options?.highlight
        );
        if (section.sectionKey === 'occupants') {
          html += renderOccupantsTableHtml(enriched);
        }
        if (section.sectionKey === 'custom_clauses') {
          html += renderCustomClausesHtml(enriched);
        }
        break;
    }

    out.push({
      sectionKey: section.sectionKey,
      title: section.title,
      printableTitle: printableSectionTitle(section.sectionKey, section.title),
      html,
      componentType,
    });
  }

  return out;
}

/** Plain-text preview of a single section (for designer live preview). */
export function previewSectionPlain(
  body: string,
  ctx: LeaseTemplateContext
): string {
  return resolveTokens(body, { ...ctx, conditions: deriveConditions(ctx) }, {
    forHtml: false,
    highlight: false,
  });
}

/** HTML snippet for designer live preview with bold token values. */
export function previewSectionHtml(
  body: string,
  ctx: LeaseTemplateContext
): string {
  return renderSectionBodyHtml(body, { ...ctx, conditions: deriveConditions(ctx) }, true);
}

export function extractTokensFromBody(body: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_RE);
  while ((m = re.exec(body)) !== null) {
    found.add(m[1]);
  }
  return [...found];
}
