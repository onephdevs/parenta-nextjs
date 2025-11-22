import pool from '@/lib/db';
import path from 'path';
import { put, del } from '@vercel/blob';

export interface Image {
  id: string;
  entityType: 'building' | 'room' | 'asset';
  entityId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  imageType: string;
  caption?: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseImage {
  id: string;
  entity_type: 'building' | 'room' | 'asset';
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  image_type: string;
  caption?: string;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

// Convert database result to Image interface
function mapDatabaseImage(dbImage: DatabaseImage): Image {
  return {
    id: dbImage.id,
    entityType: dbImage.entity_type,
    entityId: dbImage.entity_id,
    fileName: dbImage.file_name,
    filePath: dbImage.file_path,
    fileSize: dbImage.file_size,
    mimeType: dbImage.mime_type,
    imageType: dbImage.image_type,
    caption: dbImage.caption,
    isPrimary: dbImage.is_primary,
    createdAt: dbImage.created_at,
    updatedAt: dbImage.updated_at,
  };
}

// Create new image record
export async function createImage(imageData: {
  entityType: 'building' | 'room' | 'asset';
  entityId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  imageType: string;
  caption?: string;
}): Promise<Image> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if this is the first image for this entity - if so, make it primary
    const existingCountQuery = `
      SELECT COUNT(*) as count
      FROM images 
      WHERE entity_type = $1 AND entity_id = $2
    `;
    const existingResult = await client.query(existingCountQuery, [imageData.entityType, imageData.entityId]);
    const isFirstImage = parseInt(existingResult.rows[0].count) === 0;
    
    const query = `
      INSERT INTO images (
        entity_type, entity_id, file_name, file_path, file_size, 
        mime_type, image_type, caption, is_primary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      imageData.entityType,
      imageData.entityId,
      imageData.fileName,
      imageData.filePath,
      imageData.fileSize,
      imageData.mimeType,
      imageData.imageType,
      imageData.caption,
      isFirstImage, // Make first image primary
    ];

    const result = await client.query(query, values);
    await client.query('COMMIT');
    
    return mapDatabaseImage(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get images by entity
export async function getImagesByEntity(
  entityType: 'building' | 'room' | 'asset',
  entityId: string
): Promise<Image[]> {
  const query = `
    SELECT * FROM images 
    WHERE entity_type = $1 AND entity_id = $2
    ORDER BY is_primary DESC, created_at DESC
  `;
  
  const result = await pool.query(query, [entityType, entityId]);
  return result.rows.map(mapDatabaseImage);
}

// Get single image by ID
export async function getImageById(imageId: string): Promise<Image | null> {
  const query = 'SELECT * FROM images WHERE id = $1';
  const result = await pool.query(query, [imageId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapDatabaseImage(result.rows[0]);
}

// Set image as primary
export async function setImageAsPrimary(
  imageId: string,
  entityType: 'building' | 'room' | 'asset',
  entityId: string
): Promise<Image> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Remove primary status from all images for this entity
    await client.query(
      'UPDATE images SET is_primary = false WHERE entity_type = $1 AND entity_id = $2',
      [entityType, entityId]
    );
    
    // Set the specified image as primary
    const updateResult = await client.query(
      'UPDATE images SET is_primary = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [imageId]
    );
    
    if (updateResult.rows.length === 0) {
      throw new Error('Image not found');
    }
    
    await client.query('COMMIT');
    return mapDatabaseImage(updateResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Update image metadata
export async function updateImage(
  imageId: string,
  updates: {
    caption?: string;
    imageType?: string;
  }
): Promise<Image> {
  const setClause = [];
  const values = [];
  let paramIndex = 1;
  
  if (updates.caption !== undefined) {
    setClause.push(`caption = $${paramIndex++}`);
    values.push(updates.caption);
  }
  
  if (updates.imageType) {
    setClause.push(`image_type = $${paramIndex++}`);
    values.push(updates.imageType);
  }
  
  if (setClause.length === 0) {
    throw new Error('No updates provided');
  }
  
  setClause.push(`updated_at = NOW()`);
  values.push(imageId);
  
  const query = `
    UPDATE images SET ${setClause.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error('Image not found');
  }
  
  return mapDatabaseImage(result.rows[0]);
}

// Delete image
export async function deleteImage(imageId: string): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get image info before deletion
    const imageResult = await client.query('SELECT * FROM images WHERE id = $1', [imageId]);
    
    if (imageResult.rows.length === 0) {
      throw new Error('Image not found');
    }
    
    const image = mapDatabaseImage(imageResult.rows[0]);
    
    // Delete image record
    await client.query('DELETE FROM images WHERE id = $1', [imageId]);
    
    // If this was the primary image, set another image as primary
    if (image.isPrimary) {
      const remainingImagesResult = await client.query(
        'SELECT id FROM images WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at ASC LIMIT 1',
        [image.entityType, image.entityId]
      );
      
      if (remainingImagesResult.rows.length > 0) {
        await client.query(
          'UPDATE images SET is_primary = true WHERE id = $1',
          [remainingImagesResult.rows[0].id]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Delete from Vercel Blob
    try {
      // If filePath is a Blob URL, delete it from Vercel Blob
      if (image.filePath.startsWith('https://')) {
        console.log('🗑️  Deleting from Vercel Blob:', image.filePath);
        await del(image.filePath);
        console.log('✅ Blob deleted successfully');
      }
    } catch (fileError) {
      console.warn('Failed to delete blob file:', fileError);
      // Don't throw error for file deletion failure
    }
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Save uploaded image file to Vercel Blob
export async function saveUploadedImage(
  file: File,
  entityType: 'building' | 'room' | 'asset',
  entityId: string
): Promise<{
  fileName: string;
  filePath: string;
  fileSize: number;
}> {
  // Generate unique filename
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const fileExtension = path.extname(file.name);
  const fileName = `${entityId}-${timestamp}-${randomSuffix}${fileExtension}`;
  
  // Create blob path: images/{entityType}/{fileName}
  const blobPath = `images/${entityType}/${fileName}`;

  console.log('📤 Uploading to Vercel Blob:', blobPath);

  // Upload to Vercel Blob
  const blob = await put(blobPath, file, {
    access: 'public',
    addRandomSuffix: false, // We already have a unique name
  });

  console.log('✅ Blob uploaded successfully:', blob.url);

  return {
    fileName,
    filePath: blob.url, // Store the full blob URL
    fileSize: file.size,
  };
}

// Get primary image for entity
export async function getPrimaryImage(
  entityType: 'building' | 'room' | 'asset',
  entityId: string
): Promise<Image | null> {
  const query = `
    SELECT * FROM images 
    WHERE entity_type = $1 AND entity_id = $2 AND is_primary = true
    LIMIT 1
  `;
  
  const result = await pool.query(query, [entityType, entityId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapDatabaseImage(result.rows[0]);
}

// Get image statistics for entity
export async function getImageStats(
  entityType: 'building' | 'room' | 'asset',
  entityId: string
): Promise<{
  totalImages: number;
  totalSize: number;
  primaryImage: Image | null;
}> {
  const query = `
    SELECT 
      COUNT(*) as total_images,
      COALESCE(SUM(file_size), 0) as total_size
    FROM images 
    WHERE entity_type = $1 AND entity_id = $2
  `;
  
  const result = await pool.query(query, [entityType, entityId]);
  const stats = result.rows[0];
  
  const primaryImage = await getPrimaryImage(entityType, entityId);
  
  return {
    totalImages: parseInt(stats.total_images),
    totalSize: parseInt(stats.total_size),
    primaryImage,
  };
} 