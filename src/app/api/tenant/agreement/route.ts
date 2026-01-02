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

    // Validate file type
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `File type ${file.type} is not supported. Supported types: PDF, DOC, DOCX` },
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
    const { fileName, filePath, fileSize } = await saveUploadedFile(file);

    // Create document record
    const documentName = formData.get('documentName') as string || `Tenant Agreement - ${file.name}`;
    const description = formData.get('description') as string || undefined;

    const document = await createDocument({
      tenantId,
      documentName,
      fileName,
      filePath,
      fileSize,
      mimeType: file.type,
      documentType: 'tenant_agreement',
      description,
      isPublic: false,
      accessLevel: 'tenant',
      uploadedBy: userId,
    });

    // Update tenant record with document ID
    await pool.query(
      'UPDATE tenants SET tenant_agreement_document_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [document.id, tenantId]
    );

    return NextResponse.json({ 
      success: true,
      data: document,
      message: 'Tenant agreement uploaded successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error uploading tenant agreement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload tenant agreement' },
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
