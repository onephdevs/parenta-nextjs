import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getImageById, updateImage, deleteImage } from '@/lib/api/images';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { id } = await params;
    const image = await getImageById(id);
    
    if (!image) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Image not found' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      data: image
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch image' 
      },
      { status: 500 }
    );
  }
}

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
    const { caption, imageType } = body;

    const updates: { caption?: string; imageType?: string } = {};
    
    if (caption !== undefined) {
      updates.caption = caption;
    }
    
    if (imageType) {
      updates.imageType = imageType;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No valid updates provided' 
        },
        { status: 400 }
      );
    }

    const image = await updateImage(id, updates);
    
    return NextResponse.json({ 
      success: true,
      data: image,
      message: 'Image updated successfully'
    });
  } catch (error) {
    console.error('Error updating image:', error);
    
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
        error: 'Failed to update image' 
      },
      { status: 500 }
    );
  }
}

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
    const success = await deleteImage(id);
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Image not found' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    
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
        error: 'Failed to delete image' 
      },
      { status: 500 }
    );
  }
} 