import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import pool, { createUser } from '@/lib/db';
import type { CreateUserData } from '@/types/auth.types';

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
 * List admin accounts that can access the admin portal.
 */
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const result = await pool.query<AdminUserRow>(
      `SELECT id, email, username, role, first_name, last_name,
              is_active, email_verified, created_at, updated_at
       FROM users
       WHERE role IN ('admin', 'caretaker')
       ORDER BY role ASC, created_at DESC`
    );

    const users = result.rows.map(mapAdminUser);
    const activeCount = users.filter((u) => u.isActive).length;

    return NextResponse.json({
      success: true,
      data: {
        users,
        stats: {
          total: users.length,
          active: activeCount,
          inactive: users.length - activeCount,
        },
      },
    });
  } catch (err) {
    console.error('Admin users GET error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load admin users',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new admin account.
 */
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const email = String(body.email || '')
      .toLowerCase()
      .trim();
    const password = String(body.password || '');
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const username = body.username ? String(body.username).trim() : null;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: 'Email, password, first name, and last name are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const userData: CreateUserData = {
      email,
      username,
      password,
      role: 'admin',
      firstName,
      lastName,
      isActive: true,
      profileCompleted: true,
    };

    const user = await createUser(userData);

    return NextResponse.json(
      {
        success: true,
        message: 'Admin account created successfully',
        data: { user },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Admin users POST error:', err);

    if (err instanceof Error && err.message.includes('already exists')) {
      return NextResponse.json(
        { success: false, error: 'An account with this email or username already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create admin account',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
