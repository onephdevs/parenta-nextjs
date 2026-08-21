import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import path from 'path';
import fs from 'fs/promises';
import { del } from '@vercel/blob';
import pool from '@/lib/db';
import { saveUploadedFile } from '@/lib/api/documents';
import { syncUserAvatarForTenant } from '@/lib/api/user-profile-extras';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const UPLOAD_DIR = 'uploads/tenant-profiles';

function toPublicUrl(filePath: string): string {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('/')
  ) {
    return filePath;
  }
  return `/${filePath}`;
}

async function deleteStoredFile(filePathOrUrl: string | null | undefined): Promise<void> {
  if (!filePathOrUrl) return;

  try {
    if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
      // Vercel Blob absolute URL — delete by pathname when token is available
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        await del(filePathOrUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
      }
      return;
    }

    const relative = filePathOrUrl.replace(/^\//, '');
    const fullPath = path.join(process.cwd(), 'public', relative);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Error deleting stored profile picture:', error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { id: tenantId } = await params;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are supported.',
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        },
        { status: 400 }
      );
    }

    const tenantCheck = await pool.query(
      'SELECT id, profile_picture_url FROM tenants WHERE id = $1',
      [tenantId]
    );
    if (tenantCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const oldPictureUrl = tenantCheck.rows[0].profile_picture_url as string | null;

    const { filePath } = await saveUploadedFile(file, UPLOAD_DIR);
    const publicUrl = toPublicUrl(filePath);

    await pool.query(
      'UPDATE tenants SET profile_picture_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [publicUrl, tenantId]
    );
    await syncUserAvatarForTenant(tenantId, publicUrl);

    // Best-effort cleanup of previous file after successful save
    await deleteStoredFile(oldPictureUrl);

    return NextResponse.json(
      {
        success: true,
        data: { url: publicUrl },
        message: 'Profile picture uploaded successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload profile picture',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { id: tenantId } = await params;

    const result = await pool.query(
      'SELECT profile_picture_url FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const profilePictureUrl = result.rows[0].profile_picture_url as string | null;
    await deleteStoredFile(profilePictureUrl);

    await pool.query(
      'UPDATE tenants SET profile_picture_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tenantId]
    );
    await syncUserAvatarForTenant(tenantId, null);

    return NextResponse.json(
      {
        success: true,
        message: 'Profile picture deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete profile picture',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
