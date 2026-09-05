import { describe, expect, it } from 'vitest';

import { buildFieldDiffs } from '@/lib/services/activity-diff';

describe('activity field diffs', () => {
  it('hides ids, passwords, and tokens', () => {
    const diffs = buildFieldDiffs(
      { title: 'Leak', password: 'secret', tenantId: 'abc' },
      { title: 'Leak fixed', password: 'secret2', tenantId: 'abc' }
    );
    expect(diffs.map((d) => d.field)).toEqual(['title']);
    expect(diffs[0].changed).toBe(true);
  });

  it('does not show UUID values as readable text', () => {
    const diffs = buildFieldDiffs(
      { notes: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
      { notes: 'Follow up' }
    );
    expect(diffs[0].before).toBe('—');
    expect(diffs[0].after).toBe('Follow up');
  });
});
