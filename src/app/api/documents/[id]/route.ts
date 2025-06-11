import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDocumentById, updateDocument, deleteDocument } from '@/lib/api/documents';
import fs from 'fs/promises';
import path from 'path';

// Get single document
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

    return NextResponse.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch document' 
      },
      { status: 500 }
    );
  }
}

// Update document
export async function PUT(
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
    const body = await request.json();

    // Check if document exists
    const existingDocument = await getDocumentById(id);
    if (!existingDocument) {
      return NextResponse.json({ 
        success: false,
        error: 'Document not found' 
      }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    
    // Only include fields that are provided
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
    if (body.buildingId !== undefined) updates.buildingId = body.buildingId;
    if (body.roomId !== undefined) updates.roomId = body.roomId;
    if (body.tenantId !== undefined) updates.tenantId = body.tenantId;
    if (body.assetId !== undefined) updates.assetId = body.assetId;
    if (body.documentName !== undefined) updates.documentName = body.documentName;
    if (body.documentType !== undefined) updates.documentType = body.documentType;
    if (body.description !== undefined) updates.description = body.description;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.isPublic !== undefined) updates.isPublic = body.isPublic;
    if (body.expiryDate !== undefined) updates.expiryDate = body.expiryDate;
    if (body.accessLevel !== undefined) updates.accessLevel = body.accessLevel;

    const document = await updateDocument(id, updates);

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document updated successfully'
    });
  } catch (error) {
    console.error('Error updating document:', error);
    
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
        error: 'Failed to update document' 
      },
      { status: 500 }
    );
  }
}

// Delete document
export async function DELETE(
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

    // Check if document exists
    const existingDocument = await getDocumentById(id);
    if (!existingDocument) {
      return NextResponse.json({ 
        success: false,
        error: 'Document not found' 
      }, { status: 404 });
    }

    const success = await deleteDocument(id);

    if (!success) {
      return NextResponse.json({ 
        success: false,
        error: 'Failed to delete document' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete document' 
      },
      { status: 500 }
    );
  }
} 