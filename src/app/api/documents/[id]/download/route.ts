import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDocumentById } from '@/lib/api/documents';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { id } = await params;
    const document = await getDocumentById(id);

    if (!document) {
      return NextResponse.json({ 
        success: false,
        error: 'Document not found' 
      }, { status: 404 });
    }

    // Construct the full file path
    const fullFilePath = path.join(process.cwd(), 'public', document.filePath);

    try {
      // Check if file exists
      await fs.access(fullFilePath);
      
      // Read the file
      const fileBuffer = await fs.readFile(fullFilePath);
      
      // Create response with appropriate headers
      const response = new NextResponse(fileBuffer);
      
      // Set content type
      if (document.mimeType) {
        response.headers.set('Content-Type', document.mimeType);
      }
      
      // Set content disposition
      response.headers.set('Content-Disposition', `inline; filename="${document.fileName}"`);
      
      // Set content length
      response.headers.set('Content-Length', fileBuffer.length.toString());
      
      // Add caching headers for better performance
      response.headers.set('Cache-Control', 'public, max-age=3600');
      
      return response;
      
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json({ 
        success: false,
        error: 'File not found on disk' 
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to download document' 
      },
      { status: 500 }
    );
  }
} 