import { describe, expect, it } from 'vitest';

import {
  formatInquiryTicketNumber,
  inquiryContactName,
  inquiryPropertyLabel,
  isLandingInquiry,
} from '@/lib/inquiries';
import type { PipelineCard } from '@/types/database';

const base = {
  source: 'Website',
  tags: ['website inquiry'],
  contactFirstName: 'Ada',
  contactLastName: 'Lovelace',
  title: 'Inquiry · Ada',
  buildingName: 'Balibago',
  roomNumber: '1',
} as PipelineCard;

describe('inquiries', () => {
  it('detects landing-page inquiries from source or tags', () => {
    expect(isLandingInquiry(base)).toBe(true);
    expect(isLandingInquiry({ ...base, source: 'Walk-in', tags: [] } as PipelineCard)).toBe(false);
  });

  it('prefers contact name over the card title', () => {
    expect(inquiryContactName(base)).toBe('Ada Lovelace');
    expect(inquiryPropertyLabel(base)).toBe('Balibago · 1');
    expect(formatInquiryTicketNumber('id-abcdef')).toMatch(/^#INQ-/);
  });
});
