import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import { getTenantCompleteDataByTenantId } from '@/lib/api/tenant-user-link';
import { contentDispositionHeader, sanitizeDownloadFileName } from '@/lib/format/upload-filename';
import pool from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tenant/documents/[id]/download
 * Download a document (verify tenant has access)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const { tenant } = access;
    const tenantData = await getTenantCompleteDataByTenantId(String(tenant.id));
    const roomId = tenantData?.room_id || null;

    const { id } = await params;

    const documentQuery = `
      SELECT 
        d.id,
        d.document_name,
        d.file_name,
        d.file_path,
        d.file_size,
        d.mime_type,
        d.tenant_id,
        d.room_id,
        d.access_level,
        d.is_public
      FROM documents d
      WHERE d.id = $1
        AND (
          d.tenant_id = $2
          OR (d.access_level = 'tenant' AND d.is_public = true)
          OR (d.room_id = $3 AND d.access_level IN ('tenant', 'public'))
        )
        AND (d.expiry_date IS NULL OR d.expiry_date >= CURRENT_DATE)
    `;

    const documentResult = await pool.query(documentQuery, [id, tenant.id, roomId]);

    if (documentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found or access denied',
        },
        { status: 404 }
      );
    }

    const document = documentResult.rows[0];
    const storedPath = String(document.file_path || '');
    const filename = sanitizeDownloadFileName(
      document.document_name || document.file_name || 'document',
      'document'
    );

    if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
      try {
        const remote = await fetch(storedPath);
        if (!remote.ok) {
          return NextResponse.json(
            { success: false, error: 'Document file not found' },
            { status: 404 }
          );
        }
        const fileBuffer = Buffer.from(await remote.arrayBuffer());
        const contentType =
          document.mime_type || remote.headers.get('content-type') || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': contentDispositionHeader(filename, 'attachment'),
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      } catch (remoteError) {
        console.error('Error fetching remote document file:', remoteError);
        return NextResponse.redirect(storedPath);
      }
    }

    const filePath = path.join(process.cwd(), 'public', storedPath.replace(/^\//, ''));

    try {
      const fileBuffer = await fs.readFile(filePath);
      const contentType = document.mime_type || 'application/octet-stream';

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': contentDispositionHeader(filename, 'attachment'),
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch (fileError) {
      console.error('Error reading document file:', fileError);
      return NextResponse.json(
        {
          success: false,
          error: 'Document file not found',
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
