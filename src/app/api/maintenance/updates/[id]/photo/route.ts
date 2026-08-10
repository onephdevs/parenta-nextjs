/**
 * GET /api/maintenance/updates/[id]/photo — serve progress photo
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import { getMaintenanceUpdateById } from '@/lib/api/maintenance-updates';
import pool from '@/lib/db';
import {
  contentDispositionHeader,
  sanitizeDownloadFileName,
} from '@/lib/format/upload-filename';
import fs from 'fs/promises';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const row = await getMaintenanceUpdateById(id);
    if (!row || !row.photo_file_path) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const requestMeta = await pool.query(
      `SELECT tenant_id FROM maintenance_requests WHERE id = $1 LIMIT 1`,
      [row.maintenance_request_id]
    );
    const tenantId = requestMeta.rows[0]?.tenant_id
      ? String(requestMeta.rows[0].tenant_id)
      : null;

    const session = await getServerSession(authOptions);
    const isStaff =
      session?.user?.role === 'admin' || session?.user?.role === 'staff';

    if (!isStaff) {
      const access = await requireTenantAccess();
      if (access.error) return access.error;
      if (!tenantId || access.tenant.id !== tenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const storedPath = String(row.photo_file_path);
    const fileName = sanitizeDownloadFileName(
      String(row.photo_file_name || `update-${id}`)
    );
    const mimeType = String(row.photo_mime_type || 'image/jpeg');

    if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
      return NextResponse.redirect(storedPath);
    }

    const absolute = path.isAbsolute(storedPath)
      ? storedPath
      : path.join(process.cwd(), 'public', storedPath.replace(/^\/+/, ''));
    const buffer = await fs.readFile(absolute);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': contentDispositionHeader(fileName, 'inline'),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('GET /api/maintenance/updates/[id]/photo error:', error);
    return NextResponse.json({ error: 'Failed to load photo' }, { status: 500 });
  }
}
