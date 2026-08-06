import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import pool from '@/lib/db';

interface AssigneeRow {
  id: string;
  first_name: string;
  last_name: string;
}

/**
 * List admin/staff users available as opportunity assignees.
 */
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const result = await pool.query<AssigneeRow>(
      `SELECT id, first_name, last_name
       FROM users
       WHERE is_active = true
         AND role IN ('admin', 'staff')
       ORDER BY first_name ASC, last_name ASC`
    );

    const assignees = result.rows.map((row) => {
      const first = row.first_name || '';
      const last = row.last_name || '';
      return {
        id: row.id,
        firstName: first,
        lastName: last,
        initials: `${first[0] || ''}${last[0] || ''}`.toUpperCase() || '?',
      };
    });

    return NextResponse.json({ success: true, data: { assignees } });
  } catch (err) {
    console.error('Pipeline assignees GET error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load assignees',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
