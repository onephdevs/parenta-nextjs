import { beforeEach, describe, expect, it, vi } from 'vitest';

const getExpenses = vi.fn().mockResolvedValue({ expenses: [], total: 0, page: 1, limit: 20 });
const createExpense = vi.fn();
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/expenses', () => ({
  getExpenses,
  createExpense,
}));

vi.mock('next-auth/next', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET, POST } = await import('@/app/api/expenses/route');

describe('GET /api/expenses', () => {
  beforeEach(() => {
    getExpenses.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/expenses') as never);
    expect(res.status).toBe(401);
  });

  it('defaults to page 1 and limit 20', async () => {
    await GET(new Request('http://localhost/api/expenses') as never);
    expect(getExpenses).toHaveBeenCalledWith({}, 1, 20);
  });

  it('forwards category and building filters', async () => {
    await GET(
      new Request('http://localhost/api/expenses?category=cleaning&buildingId=b1&limit=40') as never
    );
    expect(getExpenses).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'cleaning', buildingId: 'b1' }),
      1,
      40
    );
  });
});

describe('POST /api/expenses', () => {
  beforeEach(() => {
    createExpense.mockReset();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('requires amount, category, description, and date', async () => {
    const res = await POST(
      new Request('http://localhost/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 50 }),
      }) as never
    );
    expect(res.status).toBe(400);
  });

  it('rejects a non-positive amount', async () => {
    const res = await POST(
      new Request('http://localhost/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 0,
          category: 'cleaning',
          description: 'Snack',
          expenseDate: '2026-09-01',
        }),
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
