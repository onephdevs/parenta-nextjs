import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServerSession = vi.fn();

vi.mock('next-auth/next', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { requireAdmin, requireAdminOrStaff, requireRole } = await import('@/lib/api-auth');

describe('requireRole', () => {
  beforeEach(() => {
    getServerSession.mockReset();
  });

  it('returns 401 when there is no session', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const result = await requireAdmin();
    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(401);
  });

  it('allows admin and caretaker into requireAdmin', async () => {
    getServerSession.mockResolvedValueOnce({ user: { role: 'caretaker' } });
    const result = await requireAdmin();
    expect(result.error).toBeNull();
    expect(result.session?.user.role).toBe('caretaker');
  });

  it('rejects tenants from admin-or-staff', async () => {
    getServerSession.mockResolvedValueOnce({ user: { role: 'tenant' } });
    const result = await requireAdminOrStaff();
    expect(result.error?.status).toBe(401);
  });

  it('allows staff when staff is in the allow-list', async () => {
    getServerSession.mockResolvedValueOnce({ user: { role: 'staff' } });
    const result = await requireRole(['staff']);
    expect(result.error).toBeNull();
  });
});
