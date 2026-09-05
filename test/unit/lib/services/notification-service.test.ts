import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();
const mockConnect = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: mockConnect },
  pool: { query: mockQuery, connect: mockConnect },
}));

const { processNotificationQueue } = await import('@/lib/services/notification-service');

describe('processNotificationQueue', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    const client = {
      query: mockQuery,
      release: vi.fn(),
    };
    mockConnect.mockResolvedValue(client);
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('claims a bounded batch of pending notifications', async () => {
    await processNotificationQueue(50);
    const sql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/FROM notification_queue/);
    expect(sql).toMatch(/LIMIT \$1/);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([50]);
  });
});
