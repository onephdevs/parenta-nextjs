import { describe, expect, it } from 'vitest';

import { getPaymentStatusTag } from '@/lib/services/tenant-list-tags';

describe('tenant list payment tags', () => {
  it('uses escalated then overdue then due today', () => {
    expect(
      getPaymentStatusTag({ insights: { balance: 1, daysPastDue: 30, daysUntilDue: null } as never })
        .key
    ).toBe('escalated');
    expect(
      getPaymentStatusTag({ insights: { balance: 1, daysPastDue: 3, daysUntilDue: null } as never })
        .key
    ).toBe('overdue');
    expect(
      getPaymentStatusTag({ insights: { balance: 1, daysPastDue: 0, daysUntilDue: 0 } as never })
        .key
    ).toBe('due_today');
  });
});
