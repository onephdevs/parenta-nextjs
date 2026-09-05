import { beforeEach, describe, expect, it, vi } from 'vitest';

const queueNotification = vi.fn().mockResolvedValue('n1');
const getServerSession = vi.fn(async () => ({ user: { id: 'a1', role: 'admin' } }));

vi.mock('@/lib/services/notification-service', () => ({
  queueNotification,
  processNotificationQueue: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { POST } = await import('@/app/api/notifications/queue/route');

describe('POST /api/notifications/queue', () => {
  beforeEach(() => {
    queueNotification.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { id: 'a1', role: 'admin' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await POST(
      new Request('http://localhost/api/notifications/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it('requires recipient, type, and context', async () => {
    const res = await POST(
      new Request('http://localhost/api/notifications/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: 'ada@example.com' }),
      }) as never
    );
    expect(res.status).toBe(400);
    expect(queueNotification).not.toHaveBeenCalled();
  });

  it('queues a notification', async () => {
    const res = await POST(
      new Request('http://localhost/api/notifications/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: 'ada@example.com',
          notification_type: 'payment_received',
          context: { amount: 100 },
          tenant_id: 't1',
        }),
      }) as never
    );
    expect(res.status).toBe(200);
    expect(queueNotification).toHaveBeenCalledWith(
      'ada@example.com',
      'payment_received',
      { amount: 100 },
      undefined,
      't1'
    );
  });
});
