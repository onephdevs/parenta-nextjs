import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { DEFAULT_TENANT_PASSWORD } from '@/lib/api/tenant-user-link';

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Complete first-login profile: name, email, phone, username, and new password.
 * Sets profile_completed = true and syncs tenants row.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'tenant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const username = String(body.username || '').trim();
    const phone = String(body.phone || '').trim();
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!firstName || !lastName || !email || !username || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'First name, last name, email, username, and phone are required',
        },
        { status: 400 }
      );
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Current password and a new password are required',
        },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid email address' },
        { status: 400 }
      );
    }

    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username must be 3–50 characters (letters, numbers, . _ -)',
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New passwords do not match' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword || newPassword === DEFAULT_TENANT_PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: 'Choose a new password different from the temporary one',
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userRow = await client.query<{ password_hash: string }>(
        `SELECT password_hash FROM users WHERE id = $1 AND is_active = true LIMIT 1`,
        [session.user.id]
      );
      if (userRow.rows.length === 0) {
        throw Object.assign(new Error('User not found'), { status: 404 });
      }

      const valid = await bcrypt.compare(
        currentPassword,
        userRow.rows[0].password_hash
      );
      if (!valid) {
        throw Object.assign(new Error('Current password is incorrect'), {
          status: 400,
        });
      }

      const emailTaken = await client.query(
        `SELECT id FROM users
         WHERE lower(email) = lower($1) AND id <> $2
         LIMIT 1`,
        [email, session.user.id]
      );
      if (emailTaken.rows.length > 0) {
        throw Object.assign(new Error('Email is already in use'), { status: 409 });
      }

      const usernameTaken = await client.query(
        `SELECT id FROM users
         WHERE lower(username) = lower($1) AND id <> $2
         LIMIT 1`,
        [username, session.user.id]
      );
      if (usernameTaken.rows.length > 0) {
        throw Object.assign(new Error('Username is already in use'), { status: 409 });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      const updated = await client.query(
        `UPDATE users
         SET first_name = $1,
             last_name = $2,
             email = $3,
             username = $4,
             password_hash = $5,
             profile_completed = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 AND is_active = true
         RETURNING id, email, username, first_name, last_name, profile_completed`,
        [firstName, lastName, email, username, passwordHash, session.user.id]
      );

      if (updated.rows.length === 0) {
        throw Object.assign(new Error('User not found'), { status: 404 });
      }

      await client.query(
        `UPDATE tenants
         SET first_name = $1,
             last_name = $2,
             email = $3,
             phone = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5 AND is_active = true`,
        [firstName, lastName, email, phone, session.user.id]
      );

      await client.query(
        `INSERT INTO app_settings (key, value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [
          `user_profile:${session.user.id}`,
          JSON.stringify({ phone }),
          'Optional profile fields for user',
        ]
      );

      await client.query('COMMIT');

      const user = updated.rows[0];
      return NextResponse.json({
        success: true,
        message: 'Profile completed',
        data: {
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          username: user.username,
          phone,
          profileCompleted: true,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Complete profile error:', error);
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: number }).status)
        : 500;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete profile',
      },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.profile_completed,
              t.phone
       FROM users u
       LEFT JOIN tenants t ON t.user_id = u.id AND t.is_active = true
       WHERE u.id = $1 AND u.is_active = true
       LIMIT 1`,
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        username: row.username,
        phone: row.phone || '',
        profileCompleted: row.profile_completed !== false,
      },
    });
  } catch (error) {
    console.error('Get profile completion status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load profile status' },
      { status: 500 }
    );
  }
}
