import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

interface SearchResult {
  id: string;
  type: 'building' | 'tenant' | 'room' | 'payment' | 'invoice' | 'maintenance';
  title: string;
  subtitle: string;
  url: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const pattern = `%${q}%`;
    const results: SearchResult[] = [];

    const [buildings, tenants, rooms, invoices, payments, maintenance] = await Promise.all([
      pool.query(
        `SELECT id, name, address_line1, city
         FROM buildings
         WHERE is_active = true
           AND (name ILIKE $1 OR address_line1 ILIKE $1 OR city ILIKE $1)
         ORDER BY name
         LIMIT 8`,
        [pattern]
      ),
      pool.query(
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
      ),
      pool.query(
        `SELECT r.id, r.room_number, r.room_status, b.name as building_name
         FROM rooms r
         JOIN buildings b ON r.building_id = b.id
         WHERE r.is_active = true
           AND (r.room_number ILIKE $1 OR b.name ILIKE $1)
         ORDER BY b.name, r.room_number
         LIMIT 8`,
        [pattern]
      ),
      pool.query(
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
      ),
      pool.query(
        `SELECT p.id, p.amount, p.payment_status, p.payment_method,
                t.first_name || ' ' || t.last_name as tenant_name
         FROM payments p
         LEFT JOIN tenants t ON p.tenant_id = t.id
         WHERE CAST(p.amount AS TEXT) ILIKE $1
            OR p.payment_method ILIKE $1
            OR (t.first_name || ' ' || t.last_name) ILIKE $1
         ORDER BY p.created_at DESC NULLS LAST
         LIMIT 6`,
        [pattern]
      ),
      pool.query(
        `SELECT id, title, status, priority
         FROM maintenance_requests
         WHERE title ILIKE $1 OR description ILIKE $1
         ORDER BY request_date DESC NULLS LAST
         LIMIT 6`,
        [pattern]
      ),
    ]);

    for (const row of buildings.rows) {
      results.push({
        id: row.id,
        type: 'building',
        title: row.name,
        subtitle: [row.address_line1, row.city].filter(Boolean).join(', '),
        url: `/admin/buildings/${row.id}`,
      });
    }

    for (const row of tenants.rows) {
      results.push({
        id: row.id,
        type: 'tenant',
        title: `${row.first_name} ${row.last_name}`,
        subtitle: row.email || row.phone || 'Tenant',
        url: `/admin/tenants/${row.id}`,
      });
    }

    for (const row of rooms.rows) {
      results.push({
        id: row.id,
        type: 'room',
        title: `Room ${row.room_number}`,
        subtitle: `${row.building_name} — ${row.room_status || 'unknown'}`,
        url: `/admin/rooms/${row.id}`,
      });
    }

    for (const row of invoices.rows) {
      results.push({
        id: row.id,
        type: 'invoice',
        title: row.invoice_number || `Invoice ${row.id.slice(0, 8)}`,
        subtitle: `${row.tenant_name || 'Tenant'} — ₱${Number(row.total_amount || 0).toLocaleString()} (${row.invoice_status || 'n/a'})`,
        url: `/admin/financial/invoices/${row.id}`,
      });
    }

    for (const row of payments.rows) {
      results.push({
        id: row.id,
        type: 'payment',
        title: `Payment ₱${Number(row.amount || 0).toLocaleString()}`,
        subtitle: `${row.tenant_name || 'Tenant'} — ${row.payment_method || 'n/a'} (${row.payment_status || 'n/a'})`,
        url: `/admin/financial/payments`,
      });
    }

    for (const row of maintenance.rows) {
      results.push({
        id: row.id,
        type: 'maintenance',
        title: row.title,
        subtitle: `${row.status || 'open'} · ${row.priority || 'medium'}`,
        url: `/admin/maintenance`,
      });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
