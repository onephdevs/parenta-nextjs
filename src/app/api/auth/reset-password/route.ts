/**
 * POST /api/auth/reset-password
 * Consumes a one-time reset token and sets a new password.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body.token || '').trim();
    const newPassword = String(body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const tokenResult = await pool.query(
      `SELECT t.id, t.user_id, t.expires_at, t.used_at, u.is_active, u.role
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    const row = tokenResult.rows[0];

    if (row.used_at) {
      return NextResponse.json(
        { success: false, error: 'This reset link has already been used' },
        { status: 400 }
      );
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, error: 'This reset link has expired. Request a new one.' },
        { status: 400 }
      );
    }

    if (!row.is_active) {
      return NextResponse.json(
        { success: false, error: 'This account is inactive' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE users
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [passwordHash, row.user_id]
      );
      await client.query(
        `UPDATE password_reset_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [row.id]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. You can sign in with your new password.',
      role: row.role,
    });
  } catch (error) {
    console.error('Error in reset-password:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to reset password' },
      { status: 500 }
    );
  }
}
