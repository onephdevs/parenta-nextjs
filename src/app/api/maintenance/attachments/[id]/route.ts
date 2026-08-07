import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import { getAttachmentWithRequest } from '@/lib/api/maintenance-attachments';
import { contentDispositionHeader, sanitizeDownloadFileName } from '@/lib/format/upload-filename';
import fs from 'fs/promises';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/maintenance/attachments/[id]
 * View/download a maintenance issue photo (admin/staff, or owning tenant).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const row = await getAttachmentWithRequest(id);
    if (!row) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';

    if (!isAdmin) {
      const access = await requireTenantAccess();
      if (access.error) return access.error;
      if (!row.tenantId || access.tenant.id !== row.tenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { attachment } = row;
    const storedPath = attachment.filePath;
    const fileName = sanitizeDownloadFileName(
      attachment.fileName || `maintenance-${id}`,
      `maintenance-${id}`
    );

    const contentTypeFromExt = (filePathOrName: string) => {
      const fileExtension = path.extname(filePathOrName).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.heic': 'image/heic',
        '.heif': 'image/heif',
        '.pdf': 'application/pdf',
      };
      return contentTypeMap[fileExtension] || attachment.mimeType || 'application/octet-stream';
    };

    if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
      try {
        const remote = await fetch(storedPath);
        if (!remote.ok) throw new Error('Remote fetch failed');
        const buffer = Buffer.from(await remote.arrayBuffer());
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentTypeFromExt(storedPath),
            'Content-Disposition': contentDispositionHeader(fileName, 'inline'),
            'Cache-Control': 'private, max-age=3600',
          },
        });
      } catch (err) {
        console.error('Error fetching remote maintenance attachment:', err);
        return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 502 });
      }
    }

    const absolutePath = path.isAbsolute(storedPath)
      ? storedPath
      : path.join(process.cwd(), 'public', storedPath);

    try {
      const buffer = await fs.readFile(absolutePath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentTypeFromExt(storedPath),
          'Content-Disposition': contentDispositionHeader(fileName, 'inline'),
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error serving maintenance attachment:', error);
    return NextResponse.json({ error: 'Failed to download attachment' }, { status: 500 });
  }
}
