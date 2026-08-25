import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrStaff } from '@/lib/api-auth';
import pool from '@/lib/db';

export type SearchCategory =
  | 'property'
  | 'tenant'
  | 'room'
  | 'asset'
  | 'invoice'
  | 'document'
  | 'lease'
  | 'payment'
  | 'expense';

interface SearchResult {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle: string;
  url: string;
}

const ALL_CATEGORIES: SearchCategory[] = [
  'property',
  'tenant',
  'room',
  'asset',
  'invoice',
  'document',
  'lease',
  'payment',
  'expense',
];

function parseCategories(raw: string | null): SearchCategory[] | null {
  if (!raw || raw === 'all') return null;
  const requested = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => (s === 'building' ? 'property' : s)) as SearchCategory[];
  const valid = requested.filter((c) => ALL_CATEGORIES.includes(c));
  return valid.length > 0 ? [...new Set(valid)] : null;
}

function wants(categories: SearchCategory[] | null, type: SearchCategory): boolean {
  return !categories || categories.includes(type);
}

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdminOrStaff();
    if (error) return error;

    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const categories = parseCategories(request.nextUrl.searchParams.get('type'));
    const pattern = `%${q}%`;

    type QueryFn = () => Promise<SearchResult[]>;
    const queryFns: QueryFn[] = [];

    if (wants(categories, 'property')) {
      queryFns.push(async () => {
        const res = await pool.query(
          `SELECT id, name, address_line1, city
           FROM buildings
           WHERE is_active = true
             AND (name ILIKE $1 OR address_line1 ILIKE $1 OR city ILIKE $1)
           ORDER BY name
           LIMIT 8`,
          [pattern]
        );
        return res.rows.map((row) => ({
          id: row.id,
          type: 'property' as const,
          title: row.name,
          subtitle: [row.address_line1, row.city].filter(Boolean).join(', '),
          url: `/admin/buildings/${row.id}`,
        }));
      });
    }

    if (wants(categories, 'tenant')) {
      queryFns.push(async () => {
        const res = await pool.query(
          `SELECT id, first_name, last_name, email, phone
           FROM tenants
           WHERE is_active = true
             AND (
               first_name ILIKE $1 OR last_name ILIKE $1
               OR email ILIKE $1 OR phone ILIKE $1
               OR (first_name || ' ' || last_name) ILIKE $1
             )
           ORDER BY last_name, first_name
           LIMIT 8`,
          [pattern]
        );
        return res.rows.map((row) => ({
          id: row.id,
          type: 'tenant' as const,
          title: `${row.first_name} ${row.last_name}`,
          subtitle: row.email || row.phone || 'Tenant',
          url: `/admin/tenants/${row.id}`,
        }));
      });
    }

    if (wants(categories, 'room')) {
      queryFns.push(async () => {
        const res = await pool.query(
          `SELECT r.id, r.room_number, r.room_status, b.name as building_name
           FROM rooms r
           JOIN buildings b ON r.building_id = b.id
           WHERE r.is_active = true
             AND (r.room_number ILIKE $1 OR b.name ILIKE $1)
           ORDER BY b.name, r.room_number
           LIMIT 8`,
          [pattern]
        );
        return res.rows.map((row) => ({
          id: row.id,
          type: 'room' as const,
          title: String(row.room_number || '').startsWith('Unit')
            ? row.room_number
            : `Room ${row.room_number}`,
          subtitle: `${row.building_name} — ${row.room_status || 'unknown'}`,
          url: `/admin/rooms/${row.id}`,
        }));
      });
    }

    if (wants(categories, 'asset')) {
      queryFns.push(async () => {
        const res = await pool.query(
          `SELECT a.id, a.asset_name, a.asset_type, a.asset_status, b.name as building_name
           FROM assets a
           LEFT JOIN buildings b ON a.building_id = b.id
           WHERE a.is_active = true
             AND (
               a.asset_name ILIKE $1 OR a.asset_type ILIKE $1
               OR a.brand ILIKE $1 OR a.model ILIKE $1
               OR a.serial_number ILIKE $1 OR b.name ILIKE $1
             )
           ORDER BY a.asset_name
           LIMIT 8`,
          [pattern]
        );
        return res.rows.map((row) => ({
          id: row.id,
          type: 'asset' as const,
          title: row.asset_name,
          subtitle: [row.asset_type, row.building_name, row.asset_status]
            .filter(Boolean)
            .join(' · '),
          url: `/admin/assets?q=${encodeURIComponent(row.asset_name || '')}`,
        }));
      });
    }

    if (wants(categories, 'invoice')) {
      queryFns.push(async () => {
        const res = await pool.query(
          `SELECT i.id, i.invoice_number, i.total_amount, i.invoice_status,
                  t.first_name || ' ' || t.last_name as tenant_name
           FROM invoices i
           LEFT JOIN tenants t ON i.tenant_id = t.id
           WHERE i.invoice_number ILIKE $1
              OR CAST(i.total_amount AS TEXT) ILIKE $1
              OR (t.first_name || ' ' || t.last_name) ILIKE $1
           ORDER BY i.created_at DESC NULLS LAST
           LIMIT 6`,
          [pattern]
        );
        return res.rows.map((row) => ({
          id: row.id,
          type: 'invoice' as const,
          title: row.invoice_number || `Invoice ${String(row.id).slice(0, 8)}`,
          subtitle: `${row.tenant_name || 'Tenant'} — ₱${Number(row.total_amount || 0).toLocaleString()} (${row.invoice_status || 'n/a'})`,
          url: `/admin/financial/invoices/${row.id}`,
        }));
      });
    }

    if (wants(categories, 'document')) {
      queryFns.push(async () => {
        const res = await pool.query(
          `SELECT d.id, d.document_name, d.document_type, d.file_name,
                  t.first_name || ' ' || t.last_name as tenant_name,
                  b.name as building_name
           FROM documents d
           LEFT JOIN tenants t ON d.tenant_id = t.id
           LEFT JOIN buildings b ON d.building_id = b.id
           WHERE d.document_name ILIKE $1
              OR d.file_name ILIKE $1
              OR d.document_type ILIKE $1
              OR d.description ILIKE $1
              OR (t.first_name || ' ' || t.last_name) ILIKE $1
              OR b.name ILIKE $1
           ORDER BY d.created_at DESC NULLS LAST
           LIMIT 8`,
          [pattern]
        );
        return res.rows.map((row) => ({
          id: row.id,
          type: 'document' as const,
          title: row.document_name || row.file_name,
          subtitle:
            [row.document_type, row.tenant_name, row.building_name]
              .filter(Boolean)
              .join(' · ') || 'Document',
          url: `/admin/documents?q=${encodeURIComponent(row.document_name || '')}`,
        }));
      });
    }

    if (wants(categories, 'lease')) {
      queryFns.push(async () => {
        const res = await pool.query(
          `SELECT tra.id, tra.assignment_status, tra.start_date, tra.end_date,
                  r.room_number, b.name as building_name,
                  COALESCE(
                    NULLIF(TRIM(COALESCE(t.first_name, '') || ' ' || COALESCE(t.last_name, '')), ''),
                    tra.tenant_name_snapshot,
                    'Tenant'
                  ) as tenant_name
           FROM tenant_room_assignments tra
           JOIN rooms r ON r.id = tra.room_id
           JOIN buildings b ON b.id = r.building_id
           LEFT JOIN tenants t ON t.id = tra.tenant_id
           WHERE r.room_number ILIKE $1
              OR b.name ILIKE $1
              OR tra.tenant_name_snapshot ILIKE $1
              OR (t.first_name || ' ' || t.last_name) ILIKE $1
              OR t.email ILIKE $1
           ORDER BY tra.created_at DESC NULLS LAST
           LIMIT 8`,
          [pattern]
        );
        return res.rows.map((row) => {
          const end = row.end_date
            ? new Date(row.end_date).toLocaleDateString()
            : 'open-ended';
          return {
            id: row.id,
            type: 'lease' as const,
            title: `${row.tenant_name} · ${row.room_number}`,
            subtitle: `${row.building_name} — ${row.assignment_status || 'n/a'} · ends ${end}`,
            url: `/admin/leasing/${row.id}`,
          };
        });
      });
    }

    if (wants(categories, 'payment')) {
      queryFns.push(async () => {
        const res = await pool.query(
          `SELECT p.id, p.amount, p.payment_status, p.payment_method,
                  t.first_name || ' ' || t.last_name as tenant_name
           FROM payments p
           LEFT JOIN tenants t ON p.tenant_id = t.id
           WHERE CAST(p.amount AS TEXT) ILIKE $1
              OR p.payment_method ILIKE $1
              OR p.payment_status ILIKE $1
              OR (t.first_name || ' ' || t.last_name) ILIKE $1
           ORDER BY p.created_at DESC NULLS LAST
           LIMIT 6`,
          [pattern]
        );
        return res.rows.map((row) => ({
          id: row.id,
          type: 'payment' as const,
          title: `Payment ₱${Number(row.amount || 0).toLocaleString()}`,
          subtitle: `${row.tenant_name || 'Tenant'} — ${row.payment_method || 'n/a'} (${row.payment_status || 'n/a'})`,
          url: `/admin/financial/payments/${row.id}`,
        }));
      });
    }

    if (wants(categories, 'expense')) {
      queryFns.push(async () => {
        const res = await pool.query(
          `SELECT e.id, e.description, e.category, e.amount, e.expense_status, e.vendor_name,
                  b.name as building_name
           FROM expenses e
           LEFT JOIN buildings b ON e.building_id = b.id
           WHERE e.description ILIKE $1
              OR e.category ILIKE $1
              OR e.vendor_name ILIKE $1
              OR CAST(e.amount AS TEXT) ILIKE $1
              OR b.name ILIKE $1
           ORDER BY e.expense_date DESC NULLS LAST, e.created_at DESC NULLS LAST
           LIMIT 6`,
          [pattern]
        );
        return res.rows.map((row) => ({
          id: row.id,
          type: 'expense' as const,
          title: row.description || 'Expense',
          subtitle: [
            row.category,
            row.vendor_name,
            `₱${Number(row.amount || 0).toLocaleString()}`,
            row.expense_status,
          ]
            .filter(Boolean)
            .join(' · '),
          url: `/admin/financial/expenses/${row.id}`,
        }));
      });
    }

    const settled = await Promise.allSettled(queryFns.map((fn) => fn()));
    const results: SearchResult[] = [];
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(...outcome.value);
      } else {
        console.error('Search category query failed:', outcome.reason);
      }
    }

    results.sort((a, b) => ALL_CATEGORIES.indexOf(a.type) - ALL_CATEGORIES.indexOf(b.type));

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
