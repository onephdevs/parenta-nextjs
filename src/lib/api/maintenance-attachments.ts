import pool from '@/lib/db';
import { saveUploadedFile } from '@/lib/api/documents';

export interface MaintenanceAttachment {
  id: string;
  maintenanceRequestId: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedByTenantId?: string;
  createdAt: string;
  /** Authenticated download/view URL */
  url: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PHOTOS = 5;
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

let tableEnsured = false;

export async function ensureMaintenanceAttachmentsTable(): Promise<void> {
  if (tableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_request_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_by_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mra_request
      ON maintenance_request_attachments (maintenance_request_id)
  `);
  tableEnsured = true;
}

function mapAttachment(row: Record<string, unknown>): MaintenanceAttachment {
  const id = String(row.id);
  return {
    id,
    maintenanceRequestId: String(row.maintenance_request_id),
    fileName: String(row.file_name),
    filePath: String(row.file_path),
    fileSize: row.file_size != null ? Number(row.file_size) : undefined,
    mimeType: row.mime_type ? String(row.mime_type) : undefined,
    uploadedByTenantId: row.uploaded_by_tenant_id
      ? String(row.uploaded_by_tenant_id)
      : undefined,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    url: `/api/maintenance/attachments/${id}`,
  };
}

export function validateMaintenancePhoto(file: File): string | null {
  if (!SUPPORTED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    return 'Please upload a photo (JPEG, PNG, or WEBP)';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Each photo must be under 5MB';
  }
  return null;
}

export async function listAttachmentsForRequests(
  requestIds: string[]
): Promise<Map<string, MaintenanceAttachment[]>> {
  const map = new Map<string, MaintenanceAttachment[]>();
  if (requestIds.length === 0) return map;

  await ensureMaintenanceAttachmentsTable();

  const result = await pool.query(
    `SELECT *
     FROM maintenance_request_attachments
     WHERE maintenance_request_id = ANY($1::uuid[])
     ORDER BY created_at ASC`,
    [requestIds]
  );

  for (const row of result.rows) {
    const att = mapAttachment(row);
    const list = map.get(att.maintenanceRequestId) || [];
    list.push(att);
    map.set(att.maintenanceRequestId, list);
  }
  return map;
}

export async function getMaintenanceAttachmentById(
  id: string
): Promise<MaintenanceAttachment | null> {
  await ensureMaintenanceAttachmentsTable();
  const result = await pool.query(
    `SELECT a.*, mr.tenant_id
     FROM maintenance_request_attachments a
     INNER JOIN maintenance_requests mr ON mr.id = a.maintenance_request_id
     WHERE a.id = $1`,
    [id]
  );
  if (!result.rows[0]) return null;
  return {
    ...mapAttachment(result.rows[0]),
    // tenant_id available on row for auth checks via getAttachmentWithRequest
  };
}

export async function getAttachmentWithRequest(id: string): Promise<{
  attachment: MaintenanceAttachment;
  tenantId: string | null;
} | null> {
  await ensureMaintenanceAttachmentsTable();
  const result = await pool.query(
    `SELECT a.*, mr.tenant_id
     FROM maintenance_request_attachments a
     INNER JOIN maintenance_requests mr ON mr.id = a.maintenance_request_id
     WHERE a.id = $1`,
    [id]
  );
  if (!result.rows[0]) return null;
  return {
    attachment: mapAttachment(result.rows[0]),
    tenantId: result.rows[0].tenant_id ? String(result.rows[0].tenant_id) : null,
  };
}

export async function saveMaintenancePhotos(input: {
  maintenanceRequestId: string;
  files: File[];
  tenantId?: string | null;
}): Promise<MaintenanceAttachment[]> {
  await ensureMaintenanceAttachmentsTable();

  const files = input.files.slice(0, MAX_PHOTOS);
  const saved: MaintenanceAttachment[] = [];

  for (const file of files) {
    const err = validateMaintenancePhoto(file);
    if (err) throw new Error(err);

    const stored = await saveUploadedFile(file, 'uploads/maintenance');
    const result = await pool.query(
      `INSERT INTO maintenance_request_attachments (
         maintenance_request_id, file_name, file_path, file_size, mime_type, uploaded_by_tenant_id
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.maintenanceRequestId,
        stored.fileName,
        stored.filePath,
        stored.fileSize,
        file.type || 'image/jpeg',
        input.tenantId || null,
      ]
    );
    saved.push(mapAttachment(result.rows[0]));
  }

  return saved;
}

export { MAX_PHOTOS, MAX_FILE_SIZE, SUPPORTED_TYPES };
