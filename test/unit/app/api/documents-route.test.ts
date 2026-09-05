import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDocuments = vi.fn().mockResolvedValue({
  documents: [],
  total: 0,
  page: 1,
  limit: 20,
});
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/documents', () => ({
  getDocuments,
  createDocument: vi.fn(),
  saveUploadedFile: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/services/activity-logger', () => ({ logActivitySafe: vi.fn() }));

const { GET } = await import('@/app/api/documents/route');

describe('GET /api/documents', () => {
  beforeEach(() => {
    getDocuments.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/documents') as never);
    expect(res.status).toBe(401);
  });

  it('defaults to page 1 and limit 20', async () => {
    await GET(new Request('http://localhost/api/documents') as never);
    expect(getDocuments).toHaveBeenCalledWith({}, 1, 20);
  });

  it('forwards tenant and type filters', async () => {
    await GET(
      new Request('http://localhost/api/documents?tenantId=t1&documentType=lease&limit=40') as never
    );
    expect(getDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', documentType: 'lease' }),
      1,
      40
    );
  });
});
