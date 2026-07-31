import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/tenants/check-email?email=
 * Returns whether an email is already used by a user or tenant profile.
 */
export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const email = (searchParams.get('email') || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email is invalid' },
        { status: 400 }
      );
    }

    const [userResult, tenantResult] = await Promise.all([
      pool.query(`SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`, [email]),
      pool.query(`SELECT id FROM tenants WHERE LOWER(email) = $1 LIMIT 1`, [email]),
    ]);

    const available = userResult.rows.length === 0 && tenantResult.rows.length === 0;

    return NextResponse.json({
      success: true,
      data: {
        email,
        available,
        reason: available
          ? null
          : userResult.rows.length > 0
            ? 'user'
            : 'tenant',
      },
    });
  } catch (err) {
    console.error('Check tenant email error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check email',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
