import { describe, expect, it } from 'vitest';

import { capitalize, formatDate, formatDateForDatabase, formatShortDate } from '@/lib/utils';

describe('date / string utils', () => {
  it('formats a date-only ISO string without shifting the calendar day', () => {
    expect(formatDate('2026-09-05')).toBe('September 5, 2026');
    expect(formatShortDate('2026-09-05')).toBe('Sep 5');
  });

  it('formats a Date as YYYY-MM-DD for storage', () => {
    expect(formatDateForDatabase(new Date(Date.UTC(2026, 8, 5)))).toBe('2026-09-05');
  });

  it('capitalizes the first letter', () => {
    expect(capitalize('overdue')).toBe('Overdue');
  });
});
