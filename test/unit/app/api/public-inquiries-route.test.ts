import { beforeEach, describe, expect, it, vi } from 'vitest';

const createPipelineCard = vi.fn();
const mockQuery = vi.fn();

vi.mock('@/lib/api/pipeline', () => ({
  createPipelineCard,
}));

vi.mock('@/lib/services/activity-logger', () => ({
  logActivitySafe: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery },
  pool: { query: mockQuery },
}));

const { POST } = await import('@/app/api/public/inquiries/route');

describe('POST /api/public/inquiries', () => {
  beforeEach(() => {
    createPipelineCard.mockReset();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('requires a first name on the full form', async () => {
    const res = await POST(
      new Request('http://localhost/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastName: 'Lovelace', email: 'ada@example.com' }),
      })
    );
    expect(res.status).toBe(400);
    expect(createPipelineCard).not.toHaveBeenCalled();
  });

  it('requires a valid email on the full form', async () => {
    const res = await POST(
      new Request('http://localhost/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'not-an-email',
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('silently accepts honeypot spam', async () => {
    const res = await POST(
      new Request('http://localhost/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          hp_confirm: 'bot',
          formElapsedMs: 4000,
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(createPipelineCard).not.toHaveBeenCalled();
  });
});
