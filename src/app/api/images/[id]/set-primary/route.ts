import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setImageAsPrimary } from '@/lib/api/images';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Entity type and ID are required' 
        },
        { status: 400 }
      );
    }

    if (!['building', 'room', 'asset'].includes(entityType)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid entity type' 
        },
        { status: 400 }
      );
    }

    const image = await setImageAsPrimary(params.id, entityType, entityId);
    
    return NextResponse.json({ 
      success: true,
      data: image,
      message: 'Primary image updated successfully'
    });
  } catch (error) {
    console.error('Error setting primary image:', error);
    
    if (error instanceof Error && error.message === 'Image not found') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Image not found' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to set primary image' 
      },
      { status: 500 }
    );
  }
} 