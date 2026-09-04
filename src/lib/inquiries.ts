import type { PipelineCard } from '@/types/database';
import {
  formatPipelineLeadSource,
  normalizePipelineLeadSource,
} from '@/lib/pipeline/lead-sources';

export const INQUIRY_OFFICE_NOTES_MARKER = '--- Office notes ---';
const HERO_SUBMITTED_LINE = 'Submitted from homepage hero';

export function isLandingInquiry(card: PipelineCard): boolean {
  const source = normalizePipelineLeadSource(card.source);
  if (source === 'Website' || source === 'Website hero') return true;
  return (card.tags || []).some((tag) => {
    const value = tag.trim().toLowerCase();
    return value === 'website inquiry' || value === 'hero';
  });
}

export function inquiryContactName(card: PipelineCard): string {
  const name = [card.contactFirstName, card.contactLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (name) return name;
  return card.title?.replace(/^Inquiry\s*·\s*/i, '').trim() || 'Inquiry';
}

export function inquiryPropertyLabel(card: PipelineCard): string {
  if (card.buildingName && card.roomNumber) {
    return `${card.buildingName} · ${card.roomNumber}`;
  }
  return card.buildingName || 'No property selected';
}

/** Short ticket id, e.g. #INQ-A1B2C3 */
export function formatInquiryTicketNumber(id: string | null | undefined): string {
  if (!id?.trim()) return '#INQ-------';
  const compact = id.replace(/-/g, '').slice(-6).toUpperCase();
  return `#INQ-${compact}`;
}

export interface InquirySubmission {
  fromHero: boolean;
  interestedIn: string;
  formMessage: string;
  officeNotes: string;
}

function isHeroCard(card: PipelineCard): boolean {
  return (
    normalizePipelineLeadSource(card.source) === 'Website hero' ||
    (card.tags || []).some((tag) => tag.trim().toLowerCase() === 'hero')
  );
}

function parseStoredFormBlock(
  stored: string,
  card: PipelineCard
): Pick<InquirySubmission, 'fromHero' | 'interestedIn' | 'formMessage'> {
  const blocks = stored
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  let fromHero = isHeroCard(card);
  let interestedIn = '';
  const messageBlocks: string[] = [];

  for (const block of blocks) {
    if (/^Submitted from homepage hero$/i.test(block)) {
      fromHero = true;
      continue;
    }
    const interest = block.match(/^Interested in:\s*(.+)$/i);
    if (interest) {
      interestedIn = interest[1].trim();
      continue;
    }
    messageBlocks.push(block);
  }

  return {
    fromHero,
    interestedIn: interestedIn || card.buildingName || '',
    formMessage: messageBlocks.join('\n\n'),
  };
}

/** Split landing-form payload from later office notes on a pipeline card. */
export function parseInquirySubmission(card: PipelineCard): InquirySubmission {
  const raw = (card.notes || '').replace(/\r\n/g, '\n').trim();
  const markerAt = raw.indexOf(INQUIRY_OFFICE_NOTES_MARKER);

  if (markerAt >= 0) {
    const stored = raw.slice(0, markerAt).trim();
    const officeNotes = raw.slice(markerAt + INQUIRY_OFFICE_NOTES_MARKER.length).trim();
    return {
      ...parseStoredFormBlock(stored, card),
      officeNotes,
    };
  }

  if (isLandingInquiry(card)) {
    return {
      ...parseStoredFormBlock(raw, card),
      officeNotes: '',
    };
  }

  return {
    fromHero: isHeroCard(card),
    interestedIn: card.buildingName || '',
    formMessage: '',
    officeNotes: raw,
  };
}

export function composeInquiryNotes(input: InquirySubmission): string {
  const head: string[] = [];
  if (input.fromHero) head.push(HERO_SUBMITTED_LINE);
  if (input.interestedIn.trim()) {
    head.push(`Interested in: ${input.interestedIn.trim()}`);
  }
  if (input.formMessage.trim()) head.push(input.formMessage.trim());
  const office = input.officeNotes.trim();
  if (!head.length) return office;
  if (!office) return head.join('\n\n');
  return `${head.join('\n\n')}\n\n${INQUIRY_OFFICE_NOTES_MARKER}\n\n${office}`;
}

export function inquirySourceLabel(card: PipelineCard): string {
  return formatPipelineLeadSource(card.source);
}
