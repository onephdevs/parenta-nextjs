import pool from '@/lib/db';
import { saveUploadedFile } from '@/lib/api/documents';
import { getImageUrl } from '@/lib/format/image-url';
import { logActivitySafe } from '@/lib/services/activity-logger';

export type PaymentUpdateType = 'reply' | 'status_change' | 'system';

export interface PaymentUpdate {
  id: string;
  paymentId: string;
  authorRole: string;
  authorUserId?: string;
  authorName?: string;
  body: string;
  updateType: PaymentUpdateType;
  photoUrl?: string;
  photoFileName?: string;
  photoMimeType?: string;
  createdAt: string;
}

let tableEnsured = false;
let ensurePromise: Promise<void> | null = null;

export async function ensurePaymentUpdatesTable(): Promise<void> {
  if (tableEnsured) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID NOT NULL
          REFERENCES payments(id) ON DELETE CASCADE,
        author_role VARCHAR(20) NOT NULL
          CHECK (author_role IN ('admin', 'staff', 'tenant', 'system')),
        author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        author_name TEXT,
        body TEXT NOT NULL DEFAULT '',
        update_type VARCHAR(30) NOT NULL DEFAULT 'reply',
        photo_file_name TEXT,
        photo_file_path TEXT,
        photo_mime_type TEXT,
        photo_file_size INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_updates_payment_created
        ON payment_updates (payment_id, created_at DESC)
    `);
    tableEnsured = true;
  })().catch((err) => {
    ensurePromise = null;
    throw err;
  });

  return ensurePromise;
}

function mapUpdate(row: Record<string, unknown>): PaymentUpdate {
  const photoPath = row.photo_file_path ? String(row.photo_file_path) : '';
  return {
    id: String(row.id),
    paymentId: String(row.payment_id),
    authorRole: String(row.author_role || 'system'),
    authorUserId: row.author_user_id ? String(row.author_user_id) : undefined,
    authorName: row.author_name ? String(row.author_name) : undefined,
    body: String(row.body || ''),
    updateType: (row.update_type as PaymentUpdateType) || 'reply',
    photoUrl: photoPath ? getImageUrl(photoPath) : undefined,
    photoFileName: row.photo_file_name ? String(row.photo_file_name) : undefined,
    photoMimeType: row.photo_mime_type ? String(row.photo_mime_type) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function listPaymentUpdates(paymentId: string): Promise<PaymentUpdate[]> {
  await ensurePaymentUpdatesTable();
  const result = await pool.query(
    `SELECT *
     FROM payment_updates
     WHERE payment_id = $1
     ORDER BY created_at ASC`,
    [paymentId]
  );
  return result.rows.map(mapUpdate);
}

export async function createPaymentUpdate(input: {
  paymentId: string;
  authorRole: 'admin' | 'staff' | 'tenant' | 'system';
  authorUserId?: string | null;
  authorName?: string | null;
  body: string;
  updateType?: PaymentUpdateType;
  photo?: File | null;
}): Promise<PaymentUpdate> {
  await ensurePaymentUpdatesTable();

  let photoFileName: string | null = null;
  let photoFilePath: string | null = null;
  let photoMimeType: string | null = null;
  let photoFileSize: number | null = null;

  if (input.photo && input.photo.size > 0) {
    if (!input.photo.type.startsWith('image/')) {
      throw new Error('Photo must be an image');
    }
    if (input.photo.size > 5 * 1024 * 1024) {
      throw new Error('Photo must be under 5MB');
    }
    const saved = await saveUploadedFile(input.photo, 'uploads/payment-updates');
    photoFileName = saved.fileName || input.photo.name;
    photoFilePath = saved.filePath;
    photoMimeType = input.photo.type;
    photoFileSize = input.photo.size;
  }

  const body = input.body.trim();
  const updateType = input.updateType || 'reply';
  if (!body && !photoFilePath) {
    throw new Error('Write a message or attach a photo');
  }

  const result = await pool.query(
    `INSERT INTO payment_updates (
       payment_id, author_role, author_user_id, author_name,
       body, update_type,
       photo_file_name, photo_file_path, photo_mime_type, photo_file_size
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      input.paymentId,
      input.authorRole,
      input.authorUserId || null,
      input.authorName || null,
      body || (updateType === 'system' ? 'Update' : 'Photo'),
      updateType,
      photoFileName,
      photoFilePath,
      photoMimeType,
      photoFileSize,
    ]
  );

  return mapUpdate(result.rows[0]);
}

export async function getPaymentTenantNotifyUserId(paymentId: string): Promise<{
  userId: string | null;
  tenantId: string | null;
  amount: number;
  status: string;
}> {
  const result = await pool.query(
    `SELECT p.tenant_id, p.amount, p.payment_status, t.user_id
     FROM payments p
     LEFT JOIN tenants t ON t.id = p.tenant_id
     WHERE p.id = $1
     LIMIT 1`,
    [paymentId]
  );
  if (result.rows.length === 0) {
    return { userId: null, tenantId: null, amount: 0, status: 'pending' };
  }
  const row = result.rows[0];
  return {
    userId: row.user_id ? String(row.user_id) : null,
    tenantId: row.tenant_id ? String(row.tenant_id) : null,
    amount: Number(row.amount) || 0,
    status: String(row.payment_status || 'pending'),
  };
}

export function tenantPaymentClaimLink(paymentId: string): string {
  return `/tenant/payments/${encodeURIComponent(paymentId)}`;
}

export function notifyTenantPaymentChange(input: {
  actorUserId: string | null;
  actorRole: 'admin' | 'staff' | 'tenant' | 'system';
  actionType: string;
  paymentId: string;
  title: string;
  tenantUserId: string | null;
  afterData?: Record<string, unknown>;
  summary?: string;
}): void {
  if (!input.tenantUserId) return;
  const actorRole = input.actorRole === 'staff' ? 'admin' : input.actorRole;
  const link = tenantPaymentClaimLink(input.paymentId);
  logActivitySafe({
    actorUserId: input.actorUserId,
    actorRole,
    actionType: input.actionType,
    category: 'payments',
    entityType: 'payment',
    entityId: input.paymentId,
    entityLabel: input.title,
    afterData: input.afterData,
    link,
    notifyUserIds: [input.tenantUserId],
    notifyActor: false,
    metadata: {
      link,
      summary: input.summary || undefined,
    },
  });
}
