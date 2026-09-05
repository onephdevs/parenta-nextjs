import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServerSession = vi.fn();
const getTenantByUserId = vi.fn();
const readPreviewCookie = vi.fn();
const mockQuery = vi.fn();

vi.mock('next-auth/next', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/api/tenant-user-link', () => ({ getTenantByUserId }));
vi.mock('@/lib/tenant-preview', () => ({ readPreviewCookie }));
vi.mock('@/lib/db', () => ({
  default: { query: mockQuery },
  pool: { query: mockQuery },
}));

const { requireTenantAccess } = await import('@/lib/api/require-tenant-access');

describe('requireTenantAccess', () => {
  beforeEach(() => {
    getServerSession.mockReset();
    getTenantByUserId.mockReset();
    readPreviewCookie.mockReset();
    mockQuery.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const result = await requireTenantAccess();
    expect(result.error?.status).toBe(401);
  });

  it('loads the tenant profile for a tenant user', async () => {
    getServerSession.mockResolvedValueOnce({ user: { id: 'u1', role: 'tenant' } });
    getTenantByUserId.mockResolvedValueOnce({ id: 't1', first_name: 'Ada' });
    const result = await requireTenantAccess();
    expect(result.error).toBeNull();
    expect(result.tenant?.id).toBe('t1');
    expect(result.isPreview).toBe(false);
  });

  it('blocks preview mutations', async () => {
    getServerSession.mockResolvedValueOnce({ user: { id: 'admin-1', role: 'admin' } });
    readPreviewCookie.mockResolvedValueOnce({
      tenantId: 't1',
      adminUserId: 'admin-1',
    });
    const result = await requireTenantAccess({ allowMutation: true });
    expect(result.error?.status).toBe(403);
  });
});
