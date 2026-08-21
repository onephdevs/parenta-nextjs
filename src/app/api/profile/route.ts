import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { getImageUrl } from '@/lib/format/image-url';
import {
  getUserProfileExtras,
  saveUserProfileExtras,
} from '@/lib/api/user-profile-extras';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await pool.query(
      `SELECT id, email, username, first_name, last_name, role, profile_completed FROM users WHERE id = $1 AND is_active = true`,
      [session.user.id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const extras = await getUserProfileExtras(session.user.id);
    if (!extras.avatarUrl) {
      const tenantPic = await pool.query<{ profile_picture_url: string | null }>(
        `SELECT profile_picture_url FROM tenants WHERE user_id = $1 LIMIT 1`,
        [session.user.id]
      );
      const fallback = tenantPic.rows[0]?.profile_picture_url;
      if (fallback) extras.avatarUrl = fallback;
    }
    if (extras.avatarUrl) {
      extras.avatarUrl = getImageUrl(String(extras.avatarUrl));
    }

    return NextResponse.json({
      success: true,
      data: {
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        username: user.username,
        role: user.role,
        profileCompleted: user.profile_completed !== false,
        phone: extras.phone || '',
        address: extras.address || '',
        city: extras.city || '',
        state: extras.state || '',
        zipCode: extras.zipCode || '',
        bio: extras.bio || '',
        avatarUrl: extras.avatarUrl || '',
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

    const extras: Record<string, string> = {
      phone: String(body.phone || '').trim(),
      address: String(body.address || '').trim(),
      city: String(body.city || '').trim(),
      state: String(body.state || '').trim(),
      zipCode: String(body.zipCode || '').trim(),
      bio: String(body.bio || '').trim(),
    };
    const existing = await getUserProfileExtras(session.user.id);
    if (existing.avatarUrl) extras.avatarUrl = existing.avatarUrl;
    await saveUserProfileExtras(session.user.id, extras);

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
