import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery, connect: vi.fn() },
  pool: { query: mockQuery, connect: vi.fn() },
}));

const { listContacts } = await import('@/lib/api/contacts');

describe('listContacts', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('caps the contact directory with LIMIT', async () => {
    await listContacts();
    const sql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    const params = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(sql).toMatch(/LIMIT \$/);
    expect(params.at(-1)).toBe(200);
  });
});
