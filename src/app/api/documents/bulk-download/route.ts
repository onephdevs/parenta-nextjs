import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDocumentsByIds } from '@/lib/api/documents';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { documentIds } = await request.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'No documents specified for download' 
      }, { status: 400 });
    }

    const validDocuments = await getDocumentsByIds(documentIds);

    if (validDocuments.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'No valid documents found' 
      }, { status: 404 });
    }

    // Create a readable stream for the ZIP file
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Set up response headers for ZIP download
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="documents-${new Date().toISOString().split('T')[0]}.zip"`,
    });

    // Create a readable stream from the archiver
    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        archive.on('end', () => {
          controller.close();
        });

        archive.on('error', (err: Error) => {
          console.error('Archive error:', err);
          controller.error(err);
        });

        // Add files to the archive
        let addedFiles = 0;
        const totalFiles = validDocuments.length;

        validDocuments.forEach((document, index) => {
          if (!document) return;

          const filePath = path.join(process.cwd(), 'public', 'uploads', 'documents', document.fileName);
          
          // Check if file exists
          if (fs.existsSync(filePath)) {
            // Create a safe filename for the ZIP
            const safeFileName = `${document.title || `document-${index + 1}`}${path.extname(document.fileName)}`;
            
            // Add file to archive
            archive.file(filePath, { name: safeFileName });
            addedFiles++;
          } else {
            console.warn(`File not found: ${filePath}`);
            
            // Add a placeholder text file for missing documents
            const missingFileContent = `Document "${document.title}" was not found on the server.\n\nOriginal filename: ${document.fileName}\nUploaded: ${document.uploadDate}\nCategory: ${document.category}`;
            archive.append(missingFileContent, { name: `MISSING-${document.title || 'document'}.txt` });
          }
        });

        // Add a summary file
        const summaryContent = `Document Archive Summary
Generated: ${new Date().toISOString()}
Total documents requested: ${totalFiles}
Files included: ${addedFiles}
Missing files: ${totalFiles - addedFiles}

Documents included:
${validDocuments.map((doc, i) => `${i + 1}. ${doc?.title || 'Untitled'} (${doc?.fileName})`).join('\n')}
`;
        
        archive.append(summaryContent, { name: 'ARCHIVE_SUMMARY.txt' });

        // Finalize the archive
        archive.finalize();
      }
    });

    return new Response(stream, { headers });

  } catch (error) {
    console.error('Error creating bulk download:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create download archive' 
      },
      { status: 500 }
    );
  }
} 