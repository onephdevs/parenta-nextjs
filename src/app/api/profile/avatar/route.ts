import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { saveUploadedFile } from '@/lib/api/documents';
import { toPublicAssetUrl } from '@/lib/format/image-url';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

async function getProfileExtras(userId: string): Promise<Record<string, string>> {
  const result = await pool.query(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    [`user_profile:${userId}`]
  );
  if (result.rows.length === 0) {
    return {};
  }
  try {
    return JSON.parse(result.rows[0].value);
  } catch {
    return {};
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

/**
 * POST /api/profile/avatar
 * Upload and persist a profile photo for the signed-in user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPEG, PNG, or WebP images are allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Image must be 2MB or smaller' },
        { status: 400 }
      );
    }

    const { filePath } = await saveUploadedFile(file, 'uploads/avatars');
    const extras = await getProfileExtras(session.user.id);
    extras.avatarUrl = toPublicAssetUrl(filePath);
    await saveProfileExtras(session.user.id, extras);

    return NextResponse.json({
      success: true,
      message: 'Profile photo updated',
      data: { avatarUrl: extras.avatarUrl },
    });
  } catch (error) {
    console.error('Error uploading profile avatar:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload profile photo' },
      { status: 500 }
    );
  }
}
