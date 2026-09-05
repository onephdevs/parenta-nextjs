import { beforeEach, describe, expect, it, vi } from 'vitest';

const listContacts = vi.fn().mockResolvedValue([]);
const ensureDefaultVendors = vi.fn().mockResolvedValue(undefined);
const getServerSession = vi.fn(async () => ({ user: { role: 'admin', id: 'a1' } }));

vi.mock('@/lib/api/contacts', () => ({
  listContacts,
  ensureDefaultVendors,
  createContact: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const { GET, POST } = await import('@/app/api/contacts/route');

describe('GET /api/contacts', () => {
  beforeEach(() => {
    listContacts.mockClear();
    ensureDefaultVendors.mockClear();
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('rejects unauthenticated callers', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/contacts') as never);
    expect(res.status).toBe(401);
  });

  it('lists contacts and seeds default vendors for the vendor role', async () => {
    await GET(new Request('http://localhost/api/contacts?role=VENDOR') as never);
    expect(ensureDefaultVendors).toHaveBeenCalled();
    expect(listContacts).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'VENDOR', activeOnly: true })
    );
  });
});

describe('POST /api/contacts', () => {
  beforeEach(() => {
    getServerSession.mockReset();
    getServerSession.mockResolvedValue({ user: { role: 'admin', id: 'a1' } });
  });

  it('requires a vendor / provider name', async () => {
    const res = await POST(
      new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'VENDOR' }),
      }) as never
    );
    expect(res.status).toBe(400);
  });
});
