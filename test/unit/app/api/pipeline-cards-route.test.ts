import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCardsForBoard = vi.fn().mockResolvedValue([]);
const getBoardBySlug = vi.fn().mockResolvedValue({ id: 'b1', slug: 'payments' });

vi.mock('@/lib/api/pipeline', () => ({
  getCardsForBoard,
  getBoardBySlug,
  createPipelineCard: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin: vi.fn(async () => ({ error: null, session: { user: { id: 'admin-1' } } })),
}));

vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET } = await import('@/app/api/pipeline/cards/route');

describe('GET /api/pipeline/cards', () => {
  beforeEach(() => {
    getCardsForBoard.mockClear();
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
});
