import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

async function getProfileExtras(userId: string) {
  const result = await pool.query(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    [`user_profile:${userId}`]
  );
  if (result.rows.length === 0) {
    return { phone: '', address: '', city: '', state: '', zipCode: '', bio: '', avatarUrl: '' };
  }
  try {
    return JSON.parse(result.rows[0].value);
  } catch {
    return { phone: '', address: '', city: '', state: '', zipCode: '', bio: '', avatarUrl: '' };
  }
}

async function saveProfileExtras(userId: string, extras: Record<string, string>) {
  await pool.query(
    `INSERT INTO app_settings (key, value, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [
      `user_profile:${userId}`,
      JSON.stringify(extras),
      'Optional profile fields for user',
    ]
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await pool.query(
      `SELECT id, email, first_name, last_name, role FROM users WHERE id = $1 AND is_active = true`,
      [session.user.id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const extras = await getProfileExtras(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        ...extras,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    const updated = await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, email = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND is_active = true
       RETURNING id, email, first_name, last_name, role`,
      [firstName, lastName, email, session.user.id]
    );

    if (updated.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const extras = {
      phone: String(body.phone || '').trim(),
      address: String(body.address || '').trim(),
      city: String(body.city || '').trim(),
      state: String(body.state || '').trim(),
      zipCode: String(body.zipCode || '').trim(),
      bio: String(body.bio || '').trim(),
    };
    const existing = await getProfileExtras(session.user.id);
    if (existing.avatarUrl && !extras.avatarUrl) {
      (extras as Record<string, string>).avatarUrl = existing.avatarUrl;
    }
    await saveProfileExtras(session.user.id, extras);

    const user = updated.rows[0];
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        ...extras,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'Email is already in use' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}
