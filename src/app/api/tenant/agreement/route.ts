import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createDocument, getDocumentById, deleteDocument } from '@/lib/api/documents';
import { saveUploadedFile } from '@/lib/api/documents';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/types/document';
import pool from '@/lib/db';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';

/**
 * GET /api/tenant/agreement
 * Get current tenant's agreement document
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'tenant') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const userId = session.user.id;
    const tenant = await getTenantByUserId(userId);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantId = tenant.id;

    // Get tenant's agreement document ID
    const tenantResult = await pool.query(
      'SELECT tenant_agreement_document_id FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const agreementDocumentId = tenantResult.rows[0].tenant_agreement_document_id;

    if (!agreementDocumentId) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No agreement document found'
      });
    }

    // Get the document
    const document = await getDocumentById(agreementDocumentId);

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Agreement document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error fetching tenant agreement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant agreement' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/agreement
 * Upload agreement document for current tenant
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'tenant') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const userId = session.user.id;
    const tenant = await getTenantByUserId(userId);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantId = tenant.id;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - check both MIME type and file extension
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const isValidType = SUPPORTED_FILE_TYPES.includes(file.type) || 
                        (file.type === '' && allowedExtensions.includes(fileExtension)) ||
                        allowedExtensions.includes(fileExtension);
    
    if (!isValidType) {
      return NextResponse.json(
        { success: false, error: `File type ${file.type || fileExtension} is not supported. Supported types: PDF, DOC, DOCX` },
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
    const tenantCheck = await pool.query('SELECT id, tenant_agreement_document_id FROM tenants WHERE id = $1', [tenantId]);
    if (tenantCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Delete old agreement document if exists
    const oldAgreementId = tenantCheck.rows[0].tenant_agreement_document_id;
    if (oldAgreementId) {
      try {
        await deleteDocument(oldAgreementId);
      } catch (error) {
        console.error('Error deleting old agreement document:', error);
        // Continue even if deletion fails
      }
    }

    // Save the uploaded file
    let savedFile;
    try {
      savedFile = await saveUploadedFile(file);
    } catch (fileError) {
      console.error('Error saving uploaded file:', fileError);
      const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: `Failed to save file: ${errorMessage}. Please try again.` },
        { status: 500 }
      );
    }

    const { fileName, filePath, fileSize } = savedFile;

    // Create document record
    const documentName = formData.get('documentName') as string || `Tenant Agreement - ${file.name}`;
    const description = formData.get('description') as string || undefined;

    let document;
    try {
      document = await createDocument({
        tenantId,
        documentName,
        fileName,
        filePath,
        fileSize,
        mimeType: file.type || 'application/pdf', // Default to PDF if MIME type is missing
        documentType: 'tenant_agreement',
        description,
        isPublic: false,
        accessLevel: 'tenant',
        uploadedBy: userId,
      });
    } catch (docError) {
      console.error('Error creating document record:', docError);
      // Try to clean up saved file/blob if document creation fails
      try {
        // Check if it's a Vercel Blob URL
        if (filePath && filePath.startsWith('https://') && filePath.includes('blob.vercel-storage.com')) {
          const { del } = await import('@vercel/blob');
          await del(filePath, { token: process.env.BLOB_READ_WRITE_TOKEN });
        } else if (filePath) {
          // Local filesystem path
          const fs = await import('fs/promises');
          const path = await import('path');
          const fullPath = path.join(process.cwd(), 'public', filePath);
          await fs.unlink(fullPath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
      return NextResponse.json(
        { success: false, error: 'Failed to create document record. Please try again.' },
        { status: 500 }
      );
    }

    // Update tenant record with document ID
    try {
      await pool.query(
        'UPDATE tenants SET tenant_agreement_document_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [document.id, tenantId]
      );
    } catch (updateError) {
      console.error('Error updating tenant record:', updateError);
      // Document was created but tenant update failed - this is less critical
      return NextResponse.json({ 
        success: true,
        data: document,
        message: 'Document uploaded but failed to link to tenant profile. Please contact admin.',
        warning: 'Tenant record update failed'
      }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true,
      data: document,
      message: 'Tenant agreement uploaded successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error uploading tenant agreement:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: `Failed to upload tenant agreement: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenant/agreement
 * Delete agreement document for current tenant
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'tenant') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const userId = session.user.id;
    const tenant = await getTenantByUserId(userId);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantId = tenant.id;

    // Get tenant's agreement document ID
    const tenantResult = await pool.query(
      'SELECT tenant_agreement_document_id FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const agreementDocumentId = tenantResult.rows[0].tenant_agreement_document_id;

    if (agreementDocumentId) {
      try {
        await deleteDocument(agreementDocumentId);
      } catch (error) {
        console.error('Error deleting agreement document:', error);
        // Continue even if deletion fails
      }
    }

    // Update tenant record
    await pool.query(
      'UPDATE tenants SET tenant_agreement_document_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tenantId]
    );

    return NextResponse.json({ 
      success: true,
      message: 'Tenant agreement deleted successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting tenant agreement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tenant agreement' },
      { status: 500 }
    );
  }
}
