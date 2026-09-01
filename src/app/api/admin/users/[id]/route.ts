import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/api-auth';
import pool from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface AdminUserRow {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapAdminUser(row: AdminUserRow) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role === 'caretaker' ? 'admin' : row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    isActive: row.is_active,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update an admin account (profile, active status, optional password reset).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { session, error } = await requireAdmin();
    if (error || !session) return error;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'User id is required' }, { status: 400 });
    }

    const existing = await pool.query<AdminUserRow>(
      `SELECT id, email, username, role, first_name, last_name,
              is_active, email_verified, created_at, updated_at
       FROM users
       WHERE id = $1 AND role IN ('admin', 'caretaker')`,
      [id]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Admin user not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.firstName !== undefined) {
      const firstName = String(body.firstName).trim();
      if (!firstName) {
        return NextResponse.json(
          { success: false, error: 'First name cannot be empty' },
          { status: 400 }
        );
      }
      updates.push(`first_name = $${paramIndex++}`);
      values.push(firstName);
    }

    if (body.lastName !== undefined) {
      const lastName = String(body.lastName).trim();
      if (!lastName) {
        return NextResponse.json(
          { success: false, error: 'Last name cannot be empty' },
          { status: 400 }
        );
      }
      updates.push(`last_name = $${paramIndex++}`);
      values.push(lastName);
    }

    if (body.email !== undefined) {
      const email = String(body.email).toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (body.username !== undefined) {
      const username = body.username === null || body.username === ''
        ? null
        : String(body.username).trim();
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }

    if (body.isActive !== undefined) {
      const isActive = Boolean(body.isActive);

      // Prevent self-deactivation
      if (!isActive && session.user.id === id) {
        return NextResponse.json(
          { success: false, error: 'You cannot deactivate your own account' },
          { status: 400 }
        );
      }

      // Keep at least one active admin
      if (!isActive && (existing.rows[0].role === 'admin' || existing.rows[0].role === 'caretaker')) {
        const activeCount = await pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM users
           WHERE role IN ('admin', 'caretaker') AND is_active = true AND id <> $1`,
          [id]
        );
        if (Number(activeCount.rows[0]?.count || 0) < 1) {
          return NextResponse.json(
            { success: false, error: 'At least one active admin account is required' },
            { status: 400 }
          );
        }
      }

      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (body.password !== undefined && body.password !== '') {
      const password = String(body.password);
      if (password.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }
      const passwordHash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query<AdminUserRow>(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND role IN ('admin', 'caretaker')
       RETURNING id, email, username, role, first_name, last_name,
                 is_active, email_verified, created_at, updated_at`,
      values
    );

    return NextResponse.json({
      success: true,
      message: 'Admin user updated successfully',
      data: { user: mapAdminUser(result.rows[0]) },
    });
  } catch (err) {
    console.error('Admin users PATCH error:', err);

    if (err instanceof Error && err.message.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'An account with this email or username already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update admin user',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
