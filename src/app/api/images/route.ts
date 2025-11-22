import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createImage, saveUploadedImage, getImagesByEntity } from '@/lib/api/images';

// Route segment config - increase body size limit for image uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds timeout

// Supported image types
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/pjpeg', // Progressive JPEG
  'image/png',
  'image/gif',
  'image/webp'
];

const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    console.log('Image upload request received');

    const formData = await request.formData();
    
    // Debug FormData contents
    console.log('FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
      if (value instanceof File) {
        console.log(`  File details - name: ${value.name}, type: ${value.type}, size: ${value.size}`);
      }
    }
    
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as 'building' | 'room' | 'asset';
    const entityId = formData.get('entityId') as string;
    const imageType = formData.get('imageType') as string || 'photo';
    const caption = formData.get('caption') as string || undefined;
    
    console.log('Form data received:', {
      fileExists: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      entityType,
      entityId,
      imageType,
      caption
    });
    
    // Validate required fields
    if (!file) {
      console.log('Error: No file provided');
      return NextResponse.json(
        { 
          success: false,
          error: 'No file provided' 
        },
        { status: 400 }
      );
    }

    if (!file.name || !file.type || file.size === 0) {
      console.log('Error: Invalid file object', { name: file.name, type: file.type, size: file.size });
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid file. Please try selecting the file again.' 
        },
        { status: 400 }
      );
    }

    if (!entityType || !entityId) {
      console.log('Error: Missing entity info', { entityType, entityId });
      return NextResponse.json(
        { 
          success: false,
          error: 'Entity type and ID are required' 
        },
        { status: 400 }
      );
    }

    if (!['building', 'room', 'asset'].includes(entityType)) {
      console.log('Error: Invalid entity type', { entityType });
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid entity type' 
        },
        { status: 400 }
      );
    }

    // Validate file type (check both MIME type and extension)
    const extension = file.name.split('.').pop()?.toLowerCase();
    const hasValidExtension = SUPPORTED_EXTENSIONS.includes(extension || '');
    const hasValidMimeType = SUPPORTED_IMAGE_TYPES.includes(file.type);

    if (!hasValidMimeType && !hasValidExtension) {
      console.log('Error: Unsupported file type', { 
        fileName: file.name,
        fileType: file.type, 
        extension: extension,
        supportedTypes: SUPPORTED_IMAGE_TYPES,
        supportedExtensions: SUPPORTED_EXTENSIONS
      });
      return NextResponse.json(
        { 
          success: false,
          error: `File type not supported. File: ${file.name}, Type: ${file.type}. Please use: ${SUPPORTED_EXTENSIONS.join(', ')}` 
        },
        { status: 400 }
      );
    }

    if (!hasValidMimeType && hasValidExtension) {
      console.warn('⚠️ MIME type mismatch but extension is valid, proceeding:', {
        fileName: file.name,
        mimeType: file.type,
        extension: extension
      });
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      console.log('Error: File too large', { fileSize: file.size, maxSize: MAX_IMAGE_SIZE });
      return NextResponse.json(
        { 
          success: false,
          error: `File size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit` 
        },
        { status: 400 }
      );
    }

    console.log('Validation passed, saving file...');

    // Save the uploaded file
    const { fileName, filePath, fileSize } = await saveUploadedImage(file, entityType, entityId);
    
    console.log('File saved:', { fileName, filePath, fileSize });

    // Create image record in database
    const imageData = {
      entityType,
      entityId,
      fileName,
      filePath,
      fileSize,
      mimeType: file.type,
      imageType,
      caption,
    };

    console.log('Creating database record...');
    const image = await createImage(imageData);
    console.log('Database record created:', image.id);
    
    return NextResponse.json({ 
      success: true,
      data: image,
      message: 'Image uploaded successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading image:', error);
    
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
        error: 'Failed to upload image' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as 'building' | 'room' | 'asset';
    const entityId = searchParams.get('entityId');

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

    const images = await getImagesByEntity(entityType, entityId);
    
    return NextResponse.json({ 
      success: true,
      data: images || [] // Ensure data is always an array
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch images',
        data: [] // Provide empty array for consistent response structure
      },
      { status: 500 }
    );
  }
} 