import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listEntityNotes = vi.fn().mockResolvedValue([]);
const requireRole = vi.fn(async () => ({
  error: null,
  session: { user: { id: 'admin-1', role: 'admin' } },
}));

vi.mock('@/lib/api/entity-notes', () => ({
  isEntityNoteType: (value: string) =>
    ['tenant', 'room', 'building', 'lease', 'payment', 'document'].includes(value),
  listEntityNotes,
  createEntityNote: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireRole,
}));

const { GET, POST } = await import('@/app/api/entity-notes/route');

describe('GET /api/entity-notes', () => {
  beforeEach(() => {
    listEntityNotes.mockClear();
    requireRole.mockReset();
    requireRole.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1', role: 'admin' } },
    });
  });

  it('rejects unauthenticated callers', async () => {
    requireRole.mockResolvedValueOnce({
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
      session: null,
    });
    const res = await GET(
      new Request('http://localhost/api/entity-notes?entityType=tenant&entityId=t1') as never
    );
    expect(res.status).toBe(401);
  });

  it('requires entityType and entityId', async () => {
    const res = await GET(new Request('http://localhost/api/entity-notes') as never);
    expect(res.status).toBe(400);
  });

  it('forwards the list limit', async () => {
    await GET(
      new Request('http://localhost/api/entity-notes?entityType=tenant&entityId=t1&limit=25') as never
    );
    expect(listEntityNotes).toHaveBeenCalledWith('tenant', 't1', 25);
  });
});

describe('POST /api/entity-notes', () => {
  beforeEach(() => {
    requireRole.mockReset();
    requireRole.mockResolvedValue({
      error: null,
      session: { user: { id: 'admin-1', firstName: 'Ada', lastName: 'L', email: 'a@x.com' } },
    });
  });

  it('requires a note body', async () => {
    const res = await POST(
      new Request('http://localhost/api/entity-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'tenant', entityId: 't1', body: '   ' }),
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
