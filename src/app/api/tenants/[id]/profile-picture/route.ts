import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { put, del } from '@vercel/blob';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { id: tenantId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are supported.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenantCheck = await pool.query('SELECT id, profile_picture_url FROM tenants WHERE id = $1', [tenantId]);
    if (tenantCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Delete old profile picture if exists
    const oldPictureUrl = tenantCheck.rows[0].profile_picture_url;
    if (oldPictureUrl) {
      try {
        // Extract blob path from URL
        const urlParts = oldPictureUrl.split('/');
        const blobPath = urlParts.slice(-2).join('/'); // Get last 2 parts (tenant/filename)
        await del(`images/tenant/${blobPath}`);
      } catch (error) {
        console.error('Error deleting old profile picture:', error);
        // Continue even if deletion fails
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${tenantId}-${timestamp}-${randomSuffix}.${fileExtension}`;
    const blobPath = `images/tenant/${fileName}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Update tenant record
    await pool.query(
      'UPDATE tenants SET profile_picture_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [blob.url, tenantId]
    );

    return NextResponse.json({ 
      success: true,
      data: { url: blob.url },
      message: 'Profile picture uploaded successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { id: tenantId } = await params;

    // Get current profile picture URL
    const result = await pool.query('SELECT profile_picture_url FROM tenants WHERE id = $1', [tenantId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const profilePictureUrl = result.rows[0].profile_picture_url;

    if (profilePictureUrl) {
      try {
        // Extract blob path from URL
        const urlParts = profilePictureUrl.split('/');
        const blobPath = urlParts.slice(-2).join('/');
        await del(`images/tenant/${blobPath}`);
      } catch (error) {
        console.error('Error deleting profile picture from blob storage:', error);
        // Continue even if deletion fails
      }
    }

    // Update tenant record
    await pool.query(
      'UPDATE tenants SET profile_picture_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tenantId]
    );

    return NextResponse.json({ 
      success: true,
      message: 'Profile picture deleted successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete profile picture' },
      { status: 500 }
    );
  }
}

