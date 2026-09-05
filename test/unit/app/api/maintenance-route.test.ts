import { beforeEach, describe, expect, it, vi } from 'vitest';

const listMaintenanceRequests = vi.fn().mockResolvedValue({
  requests: [],
  stats: { total: 0, open: 0, inProgress: 0, completed: 0, cancelled: 0, urgent: 0, high: 0 },
});

vi.mock('@/lib/api/maintenance', () => ({
  listMaintenanceRequests,
  createMaintenanceRequest: vi.fn(),
  updateMaintenanceRequest: vi.fn(),
  deleteMaintenanceRequest: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } })),
}));

vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET } = await import('@/app/api/maintenance/route');

describe('GET /api/maintenance', () => {
  beforeEach(() => {
    listMaintenanceRequests.mockClear();
  });

  it('forwards a list limit to the query', async () => {
    await GET(new Request('http://localhost/api/maintenance?limit=80'));
    expect(listMaintenanceRequests).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 80 })
    );
  });
});
