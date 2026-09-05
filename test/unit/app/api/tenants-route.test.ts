import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllTenants = vi.fn().mockResolvedValue({
  tenants: [],
  pagination: { page: 1, limit: 200, total: 0 },
});
const requireAdmin = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'admin-1' } },
}));

vi.mock('@/lib/api/tenants', () => ({
  getAllTenants,
  createTenant: vi.fn(),
}));

vi.mock('@/lib/api/tenant-user-link', () => ({
  createTenantWithUser: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin,
}));

vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET, POST } = await import('@/app/api/tenants/route');

describe('GET /api/tenants', () => {
  beforeEach(() => {
    getAllTenants.mockClear();
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1' } },
    });
  });

  it('rejects unauthenticated callers', async () => {
    requireAdmin.mockResolvedValueOnce({
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
      session: null,
    });
    const res = await GET(new Request('http://localhost/api/tenants'));
    expect(res.status).toBe(401);
    expect(getAllTenants).not.toHaveBeenCalled();
  });

  it('defaults to page 1 and forwards limit 1000 (lib caps at 200)', async () => {
    await GET(new Request('http://localhost/api/tenants'));
    expect(getAllTenants).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 1000 })
    );
  });

  it('forwards search and status filters', async () => {
    await GET(new Request('http://localhost/api/tenants?search=ada&status=active&limit=50'));
    expect(getAllTenants).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'ada',
        status: 'active',
        limit: 50,
      })
    );
  });
});

describe('POST /api/tenants', () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1' } },
    });
  });

  it('requires first and last name', async () => {
    const res = await POST(
      new Request('http://localhost/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ada@example.com' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('requires email or username when creating a portal login', async () => {
    const res = await POST(
      new Request('http://localhost/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Ada', lastName: 'Lovelace' }),
      })
    );
    expect(res.status).toBe(400);
  });
});
