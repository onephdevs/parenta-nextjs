import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDocuments, createDocument, saveUploadedFile } from '@/lib/api/documents';
import { logActivitySafe } from '@/lib/services/activity-logger';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/types/document';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const documentType = searchParams.get('documentType') || '';
    const buildingId = searchParams.get('buildingId') || '';
    const roomId = searchParams.get('roomId') || '';
    const tenantId = searchParams.get('tenantId') || '';
    const accessLevel = searchParams.get('accessLevel') || '';
    const hasExpiry = searchParams.get('hasExpiry');
    const isExpired = searchParams.get('isExpired');
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // Build filters
    const filters: Record<string, unknown> = {};
    if (search) filters.search = search;
    if (categoryId) filters.categoryId = categoryId;
    if (documentType) filters.documentType = documentType;
    if (buildingId) filters.buildingId = buildingId;
    if (roomId) filters.roomId = roomId;
    if (tenantId) filters.tenantId = tenantId;
    if (accessLevel) filters.accessLevel = accessLevel;
    if (hasExpiry) filters.hasExpiry = hasExpiry === 'true';
    if (isExpired) filters.isExpired = isExpired === 'true';
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const result = await getDocuments(filters, page, limit);
    
    return NextResponse.json({
      success: true,
      data: result.documents,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch documents' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No file provided' 
        },
        { status: 400 }
      );
    }

    const documentName = formData.get('documentName') as string;
    if (!documentName) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Document name is required' 
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false,
          error: `File type ${file.type} is not supported` 
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false,
          error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` 
        },
        { status: 400 }
      );
    }

    // Save the uploaded file
    const { fileName, filePath, fileSize } = await saveUploadedFile(file);

    // Parse optional fields
    const categoryId = formData.get('categoryId') as string || undefined;
    const buildingId = formData.get('buildingId') as string || undefined;
    const roomId = formData.get('roomId') as string || undefined;
    const tenantId = formData.get('tenantId') as string || undefined;
    const assetId = formData.get('assetId') as string || undefined;
    const documentType = formData.get('documentType') as string || undefined;
    const description = formData.get('description') as string || undefined;
    const isPublic = formData.get('isPublic') === 'true';
    const expiryDate = formData.get('expiryDate') as string || undefined;
    const accessLevel = (formData.get('accessLevel') as 'admin' | 'tenant' | 'public') || 'admin';
    
    // Parse tags
    const tagsString = formData.get('tags') as string;
    const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const documentData = {
      categoryId,
      buildingId,
      roomId,
      tenantId,
      assetId,
      documentName,
      fileName,
      filePath,
      fileSize,
      mimeType: file.type,
      documentType,
      description,
      tags,
      isPublic,
      expiryDate,
      uploadedBy: session.user.id,
      accessLevel,
    };

    const document = await createDocument(documentData);
    const documentId = String(document.id || '');

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'document.uploaded',
      category: 'documents',
      entityType: 'document',
      entityId: documentId || null,
      entityLabel: documentName,
      afterData: document as unknown as Record<string, unknown>,
      link: documentId ? `/admin/documents/${documentId}/edit` : '/admin/documents',
      metadata: { link: documentId ? `/admin/documents/${documentId}/edit` : '/admin/documents' },
    });
    
    return NextResponse.json({ 
      success: true,
      data: document,
      message: 'Document uploaded successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to upload document' 
      },
      { status: 500 }
    );
  }
} 