export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Document {
  id: string;
  categoryId?: string;
  buildingId?: string;
  roomId?: string;
  tenantId?: string;
  assetId?: string;
  pipelineCardId?: string;
  documentName: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  documentType?: string;
  description?: string;
  tags: string[];
  isPublic: boolean;
  expiryDate?: Date;
  versionNumber: number;
  previousVersionId?: string;
  uploadedBy?: string;
  accessLevel: 'admin' | 'tenant' | 'public';
  createdAt: Date;
  updatedAt: Date;
  
  // Populated fields
  categoryName?: string;
  buildingName?: string;
  roomNumber?: string;
  tenantName?: string;
  uploaderName?: string;
}

export interface DocumentFilters {
  search?: string;
  categoryId?: string;
  documentType?: string;
  buildingId?: string;
  roomId?: string;
  tenantId?: string;
  assetId?: string;
  pipelineCardId?: string;
  accessLevel?: string;
  hasExpiry?: boolean;
  isExpired?: boolean;
  isUnlinked?: boolean;
  status?: 'signed' | 'on_file' | 'expiring_soon' | 'needs_review';
  dateFrom?: string;
  dateTo?: string;
}

export interface DocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateDocumentData {
  categoryId?: string;
  buildingId?: string;
  roomId?: string;
  tenantId?: string;
  assetId?: string;
  pipelineCardId?: string;
  documentName: string;
  documentType?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  expiryDate?: string;
  accessLevel?: 'admin' | 'tenant' | 'public';
  file: File;
}

export interface UpdateDocumentData {
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

export interface DocumentUploadResponse {
  success: boolean;
  data?: Document;
  error?: string;
  message?: string;
}

export interface DocumentStats {
  totalDocuments: number;
  documentsThisMonth: number;
  documentsByType: Record<string, number>;
  documentsByCategory: Record<string, number>;
  expiringDocuments: number;
  unlinkedDocuments: number;
  pendingSignature: number;
  storageUsed: number; // in bytes
}

export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];

export const DOCUMENT_TYPES = [
  'lease',
  'id_proof',
  'income_proof',
  'background_check',
  'invoice',
  'receipt',
  'photo',
  'maintenance',
  'legal',
  'insurance',
  'inspection',
  'utility_bill',
  'contract',
  'other'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB 