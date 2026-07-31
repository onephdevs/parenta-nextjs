/**
 * POST /api/auth/forgot-password
 * Creates a reset token and emails a link when the account exists.
 * Always returns a generic success message to avoid account enumeration.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { sendEmail } from '@/lib/services/email-service';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const roleRaw = String(body.role || '').trim().toLowerCase();
    const role = roleRaw === 'admin' || roleRaw === 'tenant' ? roleRaw : null;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    const genericMessage =
      'If an account exists for that email, we sent password reset instructions. Check your inbox and spam folder.';

    const userResult = role
      ? await pool.query(
          `SELECT id, email, first_name, role
           FROM users
           WHERE LOWER(email) = $1 AND role = $2 AND is_active = true
           LIMIT 1`,
          [email, role]
        )
      : await pool.query(
          `SELECT id, email, first_name, role
           FROM users
           WHERE LOWER(email) = $1 AND is_active = true
           LIMIT 1`,
          [email]
        );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: true, message: genericMessage });
    }

    const user = userResult.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE password_reset_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt.toISOString()]
      );
      await client.query('COMMIT');
    } catch (tokenError) {
      await client.query('ROLLBACK');
      throw tokenError;
    } finally {
      client.release();
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3030';
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/auth/reset-password?token=${rawToken}&role=${user.role}`;

    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Reset your Alfonso Property Management System password',
      text: `Hi ${user.first_name || 'there'},\n\nUse this link to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <p>Hi ${user.first_name || 'there'},</p>
        <p>We received a request to reset your Alfonso Property Management System password.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
      `,
    });

    if (!emailResult.success) {
      console.error('[forgot-password] Email send failed:', emailResult.error);
      // Still return generic success; log for ops. In dev without Gmail, surface hint.
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          message: genericMessage,
          warning:
            emailResult.error ||
            'Email could not be sent. Configure GMAIL_USER and GMAIL_APP_PASSWORD.',
          // Dev-only convenience so local testing works without SMTP
          resetUrl,
        });
      }
    }

    return NextResponse.json({ success: true, message: genericMessage });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to process password reset request' },
      { status: 500 }
    );
  }
}
