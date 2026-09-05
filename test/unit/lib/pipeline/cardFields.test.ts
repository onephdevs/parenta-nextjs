import { describe, expect, it } from 'vitest';

import {
  defaultFieldsForBoard,
  getCardBoardValue,
  inferLeaseMonths,
} from '@/lib/pipeline/cardFields';
import type { PipelineCard } from '@/types/database';

const card = {
  amount: 8000,
  depositAmount: 16000,
  advanceAmount: 8000,
  moveInPaymentStatus: 'paid',
  leaseStartDate: '2026-08-17',
  leaseEndDate: '2027-02-16',
} as PipelineCard;

describe('pipeline card fields', () => {
  it('defaults payments board to balance + due date', () => {
    expect(defaultFieldsForBoard('payments')).toEqual(['balance', 'dueAt']);
  });

  it('counts onboarding value only after move-in payment is received', () => {
    expect(getCardBoardValue(card, 'onboarding')).toBe(24000);
    expect(
      getCardBoardValue({ ...card, moveInPaymentStatus: 'unpaid' } as PipelineCard, 'onboarding')
    ).toBe(0);
  });

  it('infers lease months from start + (end + 1 day)', () => {
    expect(inferLeaseMonths(card)).toBe(6);
  });
});
