import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPipelineBoards = vi.fn().mockResolvedValue([
  { slug: 'payments', isActive: true },
]);
const getCardsForBoard = vi.fn().mockResolvedValue([]);
const requireAdmin = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'admin-1' } },
}));

vi.mock('@/lib/api/pipeline', () => ({
  createPipelineBoard: vi.fn(),
  ensureExpensesBoardExists: vi.fn(),
  ensureMaintenanceBoardExists: vi.fn(),
  ensurePipelineBoardLabels: vi.fn(),
  getCardsForBoard,
  getPipelineBoards,
  reorderPipelineBoards: vi.fn(),
  syncActiveLeasesToPipelineCards: vi.fn(),
  syncOpenMaintenanceToPipelineCards: vi.fn(),
  syncPendingPaymentClaimsToBoard: vi.fn(),
  syncPendingUtilityBillsToPipelineCards: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin,
}));

const { GET } = await import('@/app/api/pipeline/boards/route');

describe('GET /api/pipeline/boards', () => {
  beforeEach(() => {
    getPipelineBoards.mockClear();
    getCardsForBoard.mockClear();
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1' } },
    });
    getPipelineBoards.mockResolvedValue([{ slug: 'payments', isActive: true }]);
  });

  it('rejects unauthenticated callers', async () => {
    requireAdmin.mockResolvedValueOnce({
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
      session: null,
    });
    const res = await GET(new Request('http://localhost/api/pipeline/boards'));
    expect(res.status).toBe(401);
  });

  it('lists boards', async () => {
    const res = await GET(new Request('http://localhost/api/pipeline/boards'));
    expect(res.status).toBe(200);
    expect(getPipelineBoards).toHaveBeenCalled();
  });

  it('returns 404 for an unknown board slug', async () => {
    const res = await GET(new Request('http://localhost/api/pipeline/boards?slug=missing'));
    expect(res.status).toBe(404);
  });

  it('loads cards for a matching slug', async () => {
    await GET(new Request('http://localhost/api/pipeline/boards?slug=payments'));
    expect(getCardsForBoard).toHaveBeenCalledWith('payments');
  });
});
