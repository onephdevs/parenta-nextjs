import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCardsForBoard = vi.fn().mockResolvedValue([]);
const getBoardBySlug = vi.fn().mockResolvedValue({ id: 'b1', slug: 'payments' });
const createPipelineCard = vi.fn();
const requireAdmin = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'admin-1' } },
}));

vi.mock('@/lib/api/pipeline', () => ({
  getCardsForBoard,
  getBoardBySlug,
  createPipelineCard,
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin,
}));

vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET, POST } = await import('@/app/api/pipeline/cards/route');

describe('GET /api/pipeline/cards', () => {
  beforeEach(() => {
    getCardsForBoard.mockClear();
    getBoardBySlug.mockReset();
    getBoardBySlug.mockResolvedValue({ id: 'b1', slug: 'payments' });
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
    const res = await GET(new Request('http://localhost/api/pipeline/cards?board=payments'));
    expect(res.status).toBe(401);
  });

  it('loads cards for a board slug', async () => {
    const res = await GET(new Request('http://localhost/api/pipeline/cards?board=payments'));
    expect(res.status).toBe(200);
    expect(getCardsForBoard).toHaveBeenCalledWith('payments');
  });

  it('requires a board query param', async () => {
    const res = await GET(new Request('http://localhost/api/pipeline/cards'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the board does not exist', async () => {
    getBoardBySlug.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/pipeline/cards?board=missing'));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/pipeline/cards', () => {
  beforeEach(() => {
    createPipelineCard.mockReset();
    getBoardBySlug.mockReset();
    getBoardBySlug.mockResolvedValue({ id: 'b1', slug: 'onboarding' });
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1' } },
    });
  });

  it('requires boardSlug', async () => {
    const res = await POST(
      new Request('http://localhost/api/pipeline/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New lead' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('rejects an onboarding card with a room but no building', async () => {
    const res = await POST(
      new Request('http://localhost/api/pipeline/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardSlug: 'onboarding', roomId: 'r1' }),
      })
    );
    expect(res.status).toBe(400);
    expect(createPipelineCard).not.toHaveBeenCalled();
  });
});
