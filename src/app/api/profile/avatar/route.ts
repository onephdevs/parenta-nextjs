import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/api/documents';
import { toPublicAssetUrl } from '@/lib/format/image-url';
import {
  getUserProfileExtras,
  saveUserProfileExtras,
  syncTenantPictureForUser,
} from '@/lib/api/user-profile-extras';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

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
    const extras = await getUserProfileExtras(session.user.id);
    extras.avatarUrl = toPublicAssetUrl(filePath);
    await saveUserProfileExtras(session.user.id, extras);
    await syncTenantPictureForUser(session.user.id, extras.avatarUrl);

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
