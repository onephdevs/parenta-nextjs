import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDocumentById } from '@/lib/api/documents';
import {
  contentDispositionHeader,
  sanitizeDownloadFileName,
} from '@/lib/format/upload-filename';
import fs from 'fs/promises';
import path from 'path';

function isRemoteUrl(filePath: string): boolean {
  return filePath.startsWith('http://') || filePath.startsWith('https://');
}

function downloadFileName(document: {
  documentName?: string;
  fileName?: string;
}): string {
  return sanitizeDownloadFileName(
    document.documentName || document.fileName || 'document',
    'document'
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const document = await getDocumentById(id);

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    const storedPath = document.filePath || '';
    const filename = downloadFileName(document);

    // Vercel Blob (and other remote) URLs — stream with original filename
    if (isRemoteUrl(storedPath)) {
      try {
        const remote = await fetch(storedPath);
        if (!remote.ok) {
          return NextResponse.json(
            { success: false, error: 'Remote file not found' },
            { status: 404 }
          );
        }
        const buffer = Buffer.from(await remote.arrayBuffer());
        const response = new NextResponse(buffer);
        response.headers.set(
          'Content-Type',
          document.mimeType || remote.headers.get('content-type') || 'application/octet-stream'
        );
        response.headers.set('Content-Disposition', contentDispositionHeader(filename));
        response.headers.set('Content-Length', buffer.length.toString());
        response.headers.set('Cache-Control', 'private, max-age=3600');
        return response;
      } catch (remoteError) {
        console.error('Error fetching remote document:', remoteError);
        return NextResponse.redirect(storedPath);
      }
    }

    // Local filesystem under public/
    const relative = storedPath.replace(/^\//, '');
    const fullFilePath = path.join(process.cwd(), 'public', relative);

    try {
      await fs.access(fullFilePath);
      const fileBuffer = await fs.readFile(fullFilePath);

      const response = new NextResponse(fileBuffer);
      if (document.mimeType) {
        response.headers.set('Content-Type', document.mimeType);
      }
      response.headers.set('Content-Disposition', contentDispositionHeader(filename));
      response.headers.set('Content-Length', fileBuffer.length.toString());
      response.headers.set('Cache-Control', 'private, max-age=3600');
      return response;
    } catch (fileError) {
      console.error('Error reading local document file:', fileError, fullFilePath);
      return NextResponse.json(
        {
          success: false,
          error: 'File not found on disk',
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
      },
      { status: 500 }
    );
  }
}
