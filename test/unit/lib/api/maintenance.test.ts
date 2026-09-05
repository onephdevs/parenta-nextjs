import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

vi.mock('@/lib/api/user-profile-extras', () => ({
  fillTenantAvatarUrls: vi.fn(async (rows: unknown[]) => rows),
}));

vi.mock('@/lib/api/maintenance-attachments', () => ({
  listAttachmentsForRequests: vi.fn(async () => new Map()),
}));

const { listMaintenanceRequests, calculateMaintenanceStats } = await import(
  '@/lib/api/maintenance'
);

describe('listMaintenanceRequests', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            total: '12',
            open: '4',
            in_progress: '2',
            completed: '5',
            cancelled: '1',
            urgent: '3',
            high: '1',
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
  });

  it('caps the request list and computes stats on the full match set', async () => {
    const result = await listMaintenanceRequests({ limit: 999 });

    expect(result.stats).toEqual({
      total: 12,
      open: 4,
      inProgress: 2,
      completed: 5,
      cancelled: 1,
      urgent: 3,
      high: 1,
    });

    const listSql = String(mockQuery.mock.calls[1]?.[0] ?? '');
    const listParams = mockQuery.mock.calls[1]?.[1] as unknown[];
    expect(listSql).toMatch(/LIMIT \$/);
    expect(listParams.at(-1)).toBe(200);
    expect(String(mockQuery.mock.calls[0]?.[0])).toMatch(/COUNT\(\*\) FILTER/);
  });

  it('counts stats from the full array in the pure helper', () => {
    expect(
      calculateMaintenanceStats([
        { status: 'open', priority: 'urgent' },
        { status: 'completed', priority: 'low' },
      ])
    ).toMatchObject({ total: 2, open: 1, completed: 1, urgent: 1 });
  });
});
