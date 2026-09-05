import { describe, expect, it } from 'vitest';

import { formatDocumentLinkedTo, getDocumentUiStatus } from '@/lib/documents-shared';

describe('document UI status', () => {
  it('flags unlinked or uncategorized files as needs review', () => {
    expect(getDocumentUiStatus({ documentType: 'lease' })).toBe('needs_review');
  });

  it('marks lease-like linked docs as signed', () => {
    expect(
      getDocumentUiStatus({
        categoryId: 'cat-1',
        tenantId: 't1',
        documentType: 'lease',
      })
    ).toBe('signed');
  });

  it('formats building · room as the linked-to label', () => {
    expect(
      formatDocumentLinkedTo({
        buildingName: 'Balibago',
        roomNumber: '1',
        tenantName: 'Ada',
      })
    ).toBe('Balibago · 1');
  });
});
