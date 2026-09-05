import { vi } from 'vitest';

export interface QueryCall {
  sql: string;
  params?: unknown;
}

export function sqlOf(call: QueryCall | unknown[]): string {
  const first = Array.isArray(call) ? call[0] : call.sql;
  return String(first ?? '');
}

export function createMockClient() {
  const calls: QueryCall[] = [];
  const query = vi.fn(async (sql: string, params?: unknown) => {
    calls.push({ sql: String(sql), params });
    return routeQuery(String(sql), params);
  });
  return {
    query,
    release: vi.fn(),
    calls,
  };
}

export function createMockPool(client: ReturnType<typeof createMockClient>) {
  const query = vi.fn(async (sql: string, params?: unknown) => {
    client.calls.push({ sql: String(sql), params });
    return routeQuery(String(sql), params);
  });
  return {
    query,
    connect: vi.fn(async () => client),
  };
}

function routeQuery(sql: string, params?: unknown): { rows: unknown[]; rowCount: number } {
  const s = sql.replace(/\s+/g, ' ');

  if (/^BEGIN$/i.test(s.trim()) || /^COMMIT$/i.test(s.trim()) || /^ROLLBACK$/i.test(s.trim())) {
    return { rows: [], rowCount: 0 };
  }

  if (/pg_advisory_xact_lock/.test(s)) {
    return { rows: [], rowCount: 1 };
  }

  if (/get_tenant_deposit_balance/.test(s)) {
    return { rows: [{ balance: 1000 }], rowCount: 1 };
  }

  if (/get_tenant_credit_balance/.test(s)) {
    return { rows: [{ balance: 250 }], rowCount: 1 };
  }

  if (/FROM tenants WHERE id/.test(s) && /first_name/.test(s)) {
    return {
      rows: [{ first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' }],
      rowCount: 1,
    };
  }

  if (/FROM tenants WHERE id = \$1/.test(s) && /SELECT id FROM tenants/.test(s)) {
    return { rows: [{ id: params instanceof Array ? params[0] : 'tenant-1' }], rowCount: 1 };
  }

  if (/FROM rooms r/.test(s) && /room_number/.test(s)) {
    return {
      rows: [{ room_number: '1', building_name: 'Balibago' }],
      rowCount: 1,
    };
  }

  if (/billing_cycle_start_day/.test(s)) {
    return { rows: [{ billing_cycle_start_day: 5, start_date: new Date('2026-09-01') }], rowCount: 1 };
  }

  if (/INSERT INTO deposit_ledger/.test(s) && /RETURNING/.test(s)) {
    return {
      rows: [
        {
          id: 'tx-1',
          tenant_id: 'tenant-1',
          amount: 100,
          transaction_type: 'refund',
          applied_to_invoice_id: null,
          payment_id: null,
          description: 'Refund',
          transaction_date: new Date('2026-09-05'),
          created_by: 'admin-1',
          created_at: new Date('2026-09-05'),
          updated_at: new Date('2026-09-05'),
        },
      ],
      rowCount: 1,
    };
  }

  if (/INSERT INTO/.test(s)) {
    return { rows: [{ id: 'inv-1' }], rowCount: 1 };
  }

  if (/COUNT\(\*\) OVER\(\)/.test(s)) {
    return { rows: [], rowCount: 0 };
  }

  if (/FROM invoices/.test(s)) {
    return { rows: [], rowCount: 0 };
  }

  if (/FROM users WHERE/.test(s) || /FROM app_settings/.test(s)) {
    return { rows: [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}

export function callOrder(calls: QueryCall[]): string[] {
  return calls.map((c) => {
    const sql = c.sql.replace(/\s+/g, ' ').trim();
    if (/^BEGIN$/i.test(sql)) return 'begin';
    if (/^COMMIT$/i.test(sql)) return 'commit';
    if (/^ROLLBACK$/i.test(sql)) return 'rollback';
    if (/pg_advisory_xact_lock/.test(sql)) return 'lock';
    if (/get_tenant_deposit_balance/.test(sql)) return 'deposit_balance';
    if (/get_tenant_credit_balance/.test(sql)) return 'credit_balance';
    if (/INSERT INTO deposit_ledger/.test(sql)) return 'insert_deposit';
    if (/INSERT INTO invoices/.test(sql)) return 'insert_invoice';
    if (/INSERT INTO tenant_credits/.test(sql)) return 'insert_credit';
    if (/FROM invoices/.test(sql) && /item_type = 'rent'/.test(sql)) return 'existing_rent';
    if (/FROM invoices/.test(sql)) return 'invoices';
    if (/FROM tenants WHERE id = \$1/.test(sql) && /SELECT id FROM tenants/.test(sql)) {
      return 'tenant_exists';
    }
    return 'other';
  });
}
