import { Document, DocumentCategory, DocumentFilters, DocumentsResponse, DocumentStats } from '@/types/document';
import path from 'path';
import fs from 'fs/promises';
import pool from '@/lib/db';

// Get all documents with filtering and pagination
export async function getDocuments(
  filters: DocumentFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<DocumentsResponse> {
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT 
      d.*,
      dc.name as category_name,
      b.name as building_name,
      r.room_number,
      CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
      CONCAT(u.first_name, ' ', u.last_name) as uploader_name
    FROM documents d
    LEFT JOIN document_categories dc ON d.category_id = dc.id
    LEFT JOIN buildings b ON d.building_id = b.id
    LEFT JOIN rooms r ON d.room_id = r.id
    LEFT JOIN tenants t ON d.tenant_id = t.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE 1=1
  `;

  const params: unknown[] = [];
  let paramIndex = 1;

  // Apply filters
  if (filters.search) {
    query += ` AND (
      d.document_name ILIKE $${paramIndex} OR
      d.description ILIKE $${paramIndex} OR
      d.file_name ILIKE $${paramIndex} OR
      $${paramIndex} = ANY(d.tags)
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.categoryId) {
    query += ` AND d.category_id = $${paramIndex}`;
    params.push(filters.categoryId);
    paramIndex++;
  }

  if (filters.documentType) {
    query += ` AND d.document_type = $${paramIndex}`;
    params.push(filters.documentType);
    paramIndex++;
  }

  if (filters.buildingId) {
    query += ` AND d.building_id = $${paramIndex}`;
    params.push(filters.buildingId);
    paramIndex++;
  }

  if (filters.roomId) {
    query += ` AND d.room_id = $${paramIndex}`;
    params.push(filters.roomId);
    paramIndex++;
  }

  if (filters.tenantId) {
    query += ` AND d.tenant_id = $${paramIndex}`;
    params.push(filters.tenantId);
    paramIndex++;
  }

  if (filters.accessLevel) {
    query += ` AND d.access_level = $${paramIndex}`;
    params.push(filters.accessLevel);
    paramIndex++;
  }

  if (filters.hasExpiry !== undefined) {
    if (filters.hasExpiry) {
      query += ` AND d.expiry_date IS NOT NULL`;
    } else {
      query += ` AND d.expiry_date IS NULL`;
    }
  }

  if (filters.isExpired !== undefined) {
    if (filters.isExpired) {
      query += ` AND d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE`;
    } else {
      query += ` AND (d.expiry_date IS NULL OR d.expiry_date >= CURRENT_DATE)`;
    }
  }

  if (filters.dateFrom) {
    query += ` AND d.created_at >= $${paramIndex}`;
    params.push(filters.dateFrom);
    paramIndex++;
  }

  if (filters.dateTo) {
    query += ` AND d.created_at <= $${paramIndex}`;
    params.push(filters.dateTo);
    paramIndex++;
  }

  // Get total count
  const countQuery = query.replace(
    /SELECT[\s\S]*?FROM/,
    'SELECT COUNT(*) as total FROM'
  );
  
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  // Add ordering and pagination
  query += ` ORDER BY d.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  const documents: Document[] = result.rows.map(row => ({
    id: row.id,
    categoryId: row.category_id,
    buildingId: row.building_id,
    roomId: row.room_id,
    tenantId: row.tenant_id,
    assetId: row.asset_id,
    documentName: row.document_name,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    documentType: row.document_type,
    description: row.description,
    tags: row.tags || [],
    isPublic: row.is_public,
    expiryDate: row.expiry_date,
    versionNumber: row.version_number,
    previousVersionId: row.previous_version_id,
    uploadedBy: row.uploaded_by,
    accessLevel: row.access_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryName: row.category_name,
    buildingName: row.building_name,
    roomNumber: row.room_number,
    tenantName: row.tenant_name,
    uploaderName: row.uploader_name,
  }));

  return {
    documents,
    total,
    page,
    limit,
  };
}

// Get single document by ID
export async function getDocumentById(id: string): Promise<Document | null> {
  const query = `
    SELECT 
      d.*,
      dc.name as category_name,
      b.name as building_name,
      r.room_number,
      CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
      CONCAT(u.first_name, ' ', u.last_name) as uploader_name
    FROM documents d
    LEFT JOIN document_categories dc ON d.category_id = dc.id
    LEFT JOIN buildings b ON d.building_id = b.id
    LEFT JOIN rooms r ON d.room_id = r.id
    LEFT JOIN tenants t ON d.tenant_id = t.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.id = $1
  `;

  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  
  return {
    id: row.id,
    categoryId: row.category_id,
    buildingId: row.building_id,
    roomId: row.room_id,
    tenantId: row.tenant_id,
    assetId: row.asset_id,
    documentName: row.document_name,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    documentType: row.document_type,
    description: row.description,
    tags: row.tags || [],
    isPublic: row.is_public,
    expiryDate: row.expiry_date,
    versionNumber: row.version_number,
    previousVersionId: row.previous_version_id,
    uploadedBy: row.uploaded_by,
    accessLevel: row.access_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryName: row.category_name,
    buildingName: row.building_name,
    roomNumber: row.room_number,
    tenantName: row.tenant_name,
    uploaderName: row.uploader_name,
  };
}

// Create new document
export async function createDocument(documentData: {
  categoryId?: string;
  buildingId?: string;
  roomId?: string;
  tenantId?: string;
  assetId?: string;
  documentName: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  documentType?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  expiryDate?: string;
  uploadedBy?: string;
  accessLevel?: 'admin' | 'tenant' | 'public';
}): Promise<Document> {
  const query = `
    INSERT INTO documents (
      category_id, building_id, room_id, tenant_id, asset_id,
      document_name, file_name, file_path, file_size, mime_type,
      document_type, description, tags, is_public, expiry_date,
      uploaded_by, access_level
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;

  const values = [
    documentData.categoryId,
    documentData.buildingId,
    documentData.roomId,
    documentData.tenantId,
    documentData.assetId,
    documentData.documentName,
    documentData.fileName,
    documentData.filePath,
    documentData.fileSize,
    documentData.mimeType,
    documentData.documentType,
    documentData.description,
    documentData.tags || [],
    documentData.isPublic || false,
    documentData.expiryDate,
    documentData.uploadedBy,
    documentData.accessLevel || 'admin',
  ];

  const result = await pool.query(query, values);
  
  // Return the complete document
  return await getDocumentById(result.rows[0].id) as Document;
}

// Update document
export async function updateDocument(
  id: string,
  updates: {
    categoryId?: string;
    buildingId?: string;
    roomId?: string;
    tenantId?: string;
    assetId?: string;
    documentName?: string;
    documentType?: string;
    description?: string;
    tags?: string[];
    isPublic?: boolean;
    expiryDate?: string;
    accessLevel?: 'admin' | 'tenant' | 'public';
  }
): Promise<Document | null> {
  const setClause: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.categoryId !== undefined) {
    setClause.push(`category_id = $${paramIndex}`);
    values.push(updates.categoryId);
    paramIndex++;
  }

  if (updates.buildingId !== undefined) {
    setClause.push(`building_id = $${paramIndex}`);
    values.push(updates.buildingId);
    paramIndex++;
  }

  if (updates.roomId !== undefined) {
    setClause.push(`room_id = $${paramIndex}`);
    values.push(updates.roomId);
    paramIndex++;
  }

  if (updates.tenantId !== undefined) {
    setClause.push(`tenant_id = $${paramIndex}`);
    values.push(updates.tenantId);
    paramIndex++;
  }

  if (updates.assetId !== undefined) {
    setClause.push(`asset_id = $${paramIndex}`);
    values.push(updates.assetId);
    paramIndex++;
  }

  if (updates.documentName !== undefined) {
    setClause.push(`document_name = $${paramIndex}`);
    values.push(updates.documentName);
    paramIndex++;
  }

  if (updates.documentType !== undefined) {
    setClause.push(`document_type = $${paramIndex}`);
    values.push(updates.documentType);
    paramIndex++;
  }

  if (updates.description !== undefined) {
    setClause.push(`description = $${paramIndex}`);
    values.push(updates.description);
    paramIndex++;
  }

  if (updates.tags !== undefined) {
    setClause.push(`tags = $${paramIndex}`);
    values.push(updates.tags);
    paramIndex++;
  }

  if (updates.isPublic !== undefined) {
    setClause.push(`is_public = $${paramIndex}`);
    values.push(updates.isPublic);
    paramIndex++;
  }

  if (updates.expiryDate !== undefined) {
    setClause.push(`expiry_date = $${paramIndex}`);
    values.push(updates.expiryDate);
    paramIndex++;
  }

  if (updates.accessLevel !== undefined) {
    setClause.push(`access_level = $${paramIndex}`);
    values.push(updates.accessLevel);
    paramIndex++;
  }

  if (setClause.length === 0) {
    return await getDocumentById(id);
  }

  setClause.push(`updated_at = $${paramIndex}`);
  values.push(new Date());
  paramIndex++;

  const query = `
    UPDATE documents 
    SET ${setClause.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  values.push(id);

  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }

  return await getDocumentById(id);
}

// Delete document
export async function deleteDocument(id: string): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get the document to get file path for cleanup
    const documentResult = await client.query('SELECT file_path FROM documents WHERE id = $1', [id]);
    
    if (documentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const filePath = documentResult.rows[0].file_path;

    // Delete the document record
    const result = await client.query('DELETE FROM documents WHERE id = $1', [id]);
    
    await client.query('COMMIT');

    // Try to delete the physical file (don't fail if it doesn't exist)
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Could not delete file at ${filePath}:`, error);
    }
    
    return result.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get document categories
export async function getDocumentCategories(): Promise<DocumentCategory[]> {
  const query = `
    SELECT * FROM document_categories 
    WHERE is_active = true 
    ORDER BY name ASC
  `;

  const result = await pool.query(query);

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    parentCategoryId: row.parent_category_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

// Create document category
export async function createDocumentCategory(categoryData: {
  name: string;
  description?: string;
  parentCategoryId?: string;
}): Promise<DocumentCategory> {
  const query = `
    INSERT INTO document_categories (name, description, parent_category_id)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  const values = [
    categoryData.name,
    categoryData.description,
    categoryData.parentCategoryId,
  ];

  const result = await pool.query(query, values);
  const row = result.rows[0];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    parentCategoryId: row.parent_category_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

// Get document statistics
export async function getDocumentStats(): Promise<DocumentStats> {
  const query = `
    SELECT 
      COUNT(*) as total_documents,
      COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as documents_this_month,
      COALESCE(SUM(file_size), 0) as storage_used,
      COUNT(CASE WHEN expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_documents
    FROM documents
  `;

  const typeQuery = `
    SELECT document_type, COUNT(*) as count
    FROM documents
    WHERE document_type IS NOT NULL
    GROUP BY document_type
    ORDER BY count DESC
  `;

  const categoryQuery = `
    SELECT dc.name, COUNT(d.id) as count
    FROM document_categories dc
    LEFT JOIN documents d ON dc.id = d.category_id
    GROUP BY dc.id, dc.name
    ORDER BY count DESC
  `;

  const [statsResult, typeResult, categoryResult] = await Promise.all([
    pool.query(query),
    pool.query(typeQuery),
    pool.query(categoryQuery),
  ]);

  const stats = statsResult.rows[0];

  const documentsByType: Record<string, number> = {};
  typeResult.rows.forEach(row => {
    documentsByType[row.document_type] = parseInt(row.count);
  });

  const documentsByCategory: Record<string, number> = {};
  categoryResult.rows.forEach(row => {
    documentsByCategory[row.name] = parseInt(row.count);
  });

  return {
    totalDocuments: parseInt(stats.total_documents),
    documentsThisMonth: parseInt(stats.documents_this_month),
    documentsByType,
    documentsByCategory,
    expiringDocuments: parseInt(stats.expiring_documents),
    storageUsed: parseInt(stats.storage_used),
  };
}

// Save uploaded file to disk
export async function saveUploadedFile(file: File, uploadDir: string = 'uploads/documents'): Promise<{
  fileName: string;
  filePath: string;
  fileSize: number;
}> {
  // Ensure upload directory exists
  const fullUploadDir = path.join(process.cwd(), 'public', uploadDir);
  await fs.mkdir(fullUploadDir, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const fileExtension = path.extname(file.name);
  const fileName = `${timestamp}-${randomSuffix}${fileExtension}`;
  const filePath = path.join(fullUploadDir, fileName);

  // Save file
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(filePath, buffer);

  return {
    fileName,
    filePath: path.join(uploadDir, fileName), // Relative path for storing in DB
    fileSize: file.size,
  };
} 