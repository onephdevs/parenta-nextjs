import { describe, expect, it } from 'vitest';

import { decodePreviewCookie, encodePreviewCookie } from '@/lib/tenant-preview';

describe('tenant preview cookie', () => {
  it('round-trips a signed payload', () => {
    const token = encodePreviewCookie({
      tenantId: 'tenant-1',
      tenantUserId: 'user-1',
      adminUserId: 'admin-1',
      tenantLabel: 'Ada Lovelace',
    });
    const payload = decodePreviewCookie(token);
    expect(payload?.tenantId).toBe('tenant-1');
    expect(payload?.adminUserId).toBe('admin-1');
  });

  it('rejects a tampered signature', () => {
    const token = encodePreviewCookie({
      tenantId: 'tenant-1',
      tenantUserId: null,
      adminUserId: 'admin-1',
      tenantLabel: 'Ada',
    });
    const [body] = token.split('.');
    expect(decodePreviewCookie(`${body}.tampered`)).toBeNull();
  });
});
