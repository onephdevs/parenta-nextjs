import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const enqueueJob = vi.fn();
const getJobById = vi.fn();
const requireAdmin = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'admin-1' } },
}));

vi.mock('@/lib/services/job-queue', () => ({
  enqueueJob,
  getJobById,
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin,
}));

const { GET, POST } = await import('@/app/api/jobs/route');

describe('POST /api/jobs', () => {
  beforeEach(() => {
    enqueueJob.mockReset();
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
    const res = await POST(
      new Request('http://localhost/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType: 'notification_queue_process' }),
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it('rejects an unsupported job type', async () => {
    const res = await POST(
      new Request('http://localhost/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType: 'delete_everything' }),
      }) as never
    );
    expect(res.status).toBe(400);
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it('enqueues an allowed job', async () => {
    enqueueJob.mockResolvedValueOnce({ id: 'j1', status: 'queued' });
    const res = await POST(
      new Request('http://localhost/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType: 'notification_queue_process' }),
      }) as never
    );
    expect(res.status).toBe(202);
    expect(enqueueJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobType: 'notification_queue_process',
        createdBy: 'admin-1',
      })
    );
  });
});

describe('GET /api/jobs', () => {
  beforeEach(() => {
    getJobById.mockReset();
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1' } },
    });
  });

  it('requires an id query parameter', async () => {
    const res = await GET(new Request('http://localhost/api/jobs') as never);
    expect(res.status).toBe(400);
  });

  it('returns 404 when the job is missing', async () => {
    getJobById.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/jobs?id=missing') as never);
    expect(res.status).toBe(404);
  });
});
