import pool from '@/lib/db';
import { saveUploadedFile } from '@/lib/api/documents';
import { logActivitySafe } from '@/lib/services/activity-logger';

export type MaintenanceUpdateType =
  | 'progress'
  | 'status_change'
  | 'acknowledgement'
  | 'feedback'
  | 'closed'
  | 'reply';

export type MaintenanceReactionType = 'like' | 'heart';

export interface MaintenanceUpdateReactions {
  like: number;
  heart: number;
  myReaction: MaintenanceReactionType | null;
}

export interface MaintenanceUpdate {
  id: string;
  maintenanceRequestId: string;
  authorRole: string;
  authorUserId?: string;
  authorName?: string;
  body: string;
  updateType: MaintenanceUpdateType;
  rating?: number;
  photoUrl?: string;
  photoFileName?: string;
  photoMimeType?: string;
  createdAt: string;
  reactions: MaintenanceUpdateReactions;
}

let tableEnsured = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureMaintenanceUpdatesTable(): Promise<void> {
  if (tableEnsured) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_request_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        maintenance_request_id UUID NOT NULL
          REFERENCES maintenance_requests(id) ON DELETE CASCADE,
        author_role VARCHAR(20) NOT NULL
          CHECK (author_role IN ('admin', 'staff', 'tenant', 'system')),
        author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        author_name TEXT,
        body TEXT NOT NULL DEFAULT '',
        update_type VARCHAR(30) NOT NULL DEFAULT 'progress',
        rating INTEGER
          CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
        photo_file_name TEXT,
        photo_file_path TEXT,
        photo_mime_type TEXT,
        photo_file_size INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Only add when missing. Migration already widens the check to include 'reply'.
    // Avoid DROP+ADD on every boot — concurrent requests raced on ADD (42710).
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'maintenance_request_updates_update_type_check'
            AND conrelid = 'maintenance_request_updates'::regclass
        ) THEN
          ALTER TABLE maintenance_request_updates
            ADD CONSTRAINT maintenance_request_updates_update_type_check
            CHECK (
              update_type IN (
                'progress',
                'status_change',
                'acknowledgement',
                'feedback',
                'closed',
                'reply'
              )
            );
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN
          NULL;
      END $$;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mru_request_created
        ON maintenance_request_updates (maintenance_request_id, created_at DESC)
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_update_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        update_id UUID NOT NULL
          REFERENCES maintenance_request_updates(id) ON DELETE CASCADE,
        user_id UUID NOT NULL
          REFERENCES users(id) ON DELETE CASCADE,
        reaction VARCHAR(20) NOT NULL
          CHECK (reaction IN ('like', 'heart')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (update_id, user_id)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mur_update
        ON maintenance_update_reactions (update_id)
    `);
    tableEnsured = true;
  })().finally(() => {
    ensurePromise = null;
  });

  return ensurePromise;
}

function emptyReactions(): MaintenanceUpdateReactions {
  return { like: 0, heart: 0, myReaction: null };
}

function mapUpdate(
  row: Record<string, unknown>,
  reactions?: MaintenanceUpdateReactions
): MaintenanceUpdate {
  const id = String(row.id);
  const hasPhoto = Boolean(row.photo_file_path);
  return {
    id,
    maintenanceRequestId: String(row.maintenance_request_id),
    authorRole: String(row.author_role || 'system'),
    authorUserId: row.author_user_id ? String(row.author_user_id) : undefined,
    authorName: row.author_name ? String(row.author_name) : undefined,
    body: String(row.body || ''),
    updateType: String(row.update_type || 'progress') as MaintenanceUpdateType,
    rating: row.rating != null ? Number(row.rating) : undefined,
    photoUrl: hasPhoto ? `/api/maintenance/updates/${id}/photo` : undefined,
    photoFileName: row.photo_file_name ? String(row.photo_file_name) : undefined,
    photoMimeType: row.photo_mime_type ? String(row.photo_mime_type) : undefined,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    reactions: reactions || emptyReactions(),
  };
}

async function loadReactionsForUpdates(
  updateIds: string[],
  viewerUserId?: string | null
): Promise<Map<string, MaintenanceUpdateReactions>> {
  const map = new Map<string, MaintenanceUpdateReactions>();
  for (const id of updateIds) {
    map.set(id, emptyReactions());
  }
  if (updateIds.length === 0) return map;

  await ensureMaintenanceUpdatesTable();
  const result = await pool.query(
    `SELECT update_id, reaction, user_id
     FROM maintenance_update_reactions
     WHERE update_id = ANY($1::uuid[])`,
    [updateIds]
  );

  for (const row of result.rows) {
    const updateId = String(row.update_id);
    const current = map.get(updateId) || emptyReactions();
    const reaction = String(row.reaction) as MaintenanceReactionType;
    if (reaction === 'like') current.like += 1;
    if (reaction === 'heart') current.heart += 1;
    if (viewerUserId && String(row.user_id) === viewerUserId) {
      current.myReaction = reaction;
    }
    map.set(updateId, current);
  }
  return map;
}

export async function listMaintenanceUpdates(
  requestId: string,
  viewerUserId?: string | null
): Promise<MaintenanceUpdate[]> {
  await ensureMaintenanceUpdatesTable();
  const result = await pool.query(
    `SELECT * FROM maintenance_request_updates
     WHERE maintenance_request_id = $1
     ORDER BY created_at ASC`,
    [requestId]
  );
  const ids = result.rows.map((row) => String(row.id));
  const reactions = await loadReactionsForUpdates(ids, viewerUserId);
  return result.rows.map((row) =>
    mapUpdate(row, reactions.get(String(row.id)))
  );
}

export async function listMaintenanceUpdatesForRequests(
  requestIds: string[],
  viewerUserId?: string | null
): Promise<Map<string, MaintenanceUpdate[]>> {
  const map = new Map<string, MaintenanceUpdate[]>();
  if (requestIds.length === 0) return map;
  await ensureMaintenanceUpdatesTable();
  const result = await pool.query(
    `SELECT * FROM maintenance_request_updates
     WHERE maintenance_request_id = ANY($1::uuid[])
     ORDER BY created_at ASC`,
    [requestIds]
  );
  const ids = result.rows.map((row) => String(row.id));
  const reactions = await loadReactionsForUpdates(ids, viewerUserId);
  for (const row of result.rows) {
    const key = String(row.maintenance_request_id);
    const list = map.get(key) || [];
    list.push(mapUpdate(row, reactions.get(String(row.id))));
    map.set(key, list);
  }
  return map;
}

export async function getMaintenanceUpdateById(
  id: string
): Promise<Record<string, unknown> | null> {
  await ensureMaintenanceUpdatesTable();
  const result = await pool.query(
    `SELECT * FROM maintenance_request_updates WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Toggle like/heart on an update. Same reaction again removes it.
 * Switching reaction replaces the previous one.
 */
export async function toggleMaintenanceUpdateReaction(input: {
  updateId: string;
  userId: string;
  reaction: MaintenanceReactionType;
}): Promise<MaintenanceUpdateReactions> {
  await ensureMaintenanceUpdatesTable();
  if (input.reaction !== 'like' && input.reaction !== 'heart') {
    throw new Error('Reaction must be like or heart');
  }

  const existing = await pool.query(
    `SELECT reaction FROM maintenance_update_reactions
     WHERE update_id = $1 AND user_id = $2
     LIMIT 1`,
    [input.updateId, input.userId]
  );

  if (existing.rows.length > 0) {
    const current = String(existing.rows[0].reaction);
    if (current === input.reaction) {
      await pool.query(
        `DELETE FROM maintenance_update_reactions
         WHERE update_id = $1 AND user_id = $2`,
        [input.updateId, input.userId]
      );
    } else {
      await pool.query(
        `UPDATE maintenance_update_reactions
         SET reaction = $3, created_at = NOW()
         WHERE update_id = $1 AND user_id = $2`,
        [input.updateId, input.userId, input.reaction]
      );
    }
  } else {
    await pool.query(
      `INSERT INTO maintenance_update_reactions (update_id, user_id, reaction)
       VALUES ($1, $2, $3)`,
      [input.updateId, input.userId, input.reaction]
    );
  }

  const reactions = await loadReactionsForUpdates(
    [input.updateId],
    input.userId
  );
  return reactions.get(input.updateId) || emptyReactions();
}

export async function createMaintenanceUpdate(input: {
  requestId: string;
  authorRole: 'admin' | 'staff' | 'tenant' | 'system';
  authorUserId?: string | null;
  authorName?: string | null;
  body: string;
  updateType?: MaintenanceUpdateType;
  rating?: number | null;
  photo?: File | null;
}): Promise<MaintenanceUpdate> {
  await ensureMaintenanceUpdatesTable();

  let photoFileName: string | null = null;
  let photoFilePath: string | null = null;
  let photoMimeType: string | null = null;
  let photoFileSize: number | null = null;

  if (input.photo && input.photo.size > 0) {
    if (!input.photo.type.startsWith('image/')) {
      throw new Error('Progress photo must be an image');
    }
    if (input.photo.size > 5 * 1024 * 1024) {
      throw new Error('Progress photo must be under 5MB');
    }
    const saved = await saveUploadedFile(
      input.photo,
      'uploads/maintenance-updates'
    );
    photoFileName = saved.fileName || input.photo.name;
    photoFilePath = saved.filePath;
    photoMimeType = input.photo.type;
    photoFileSize = input.photo.size;
  }

  const body = input.body.trim();
  const updateType = input.updateType || 'progress';
  if (
    !body &&
    (updateType === 'progress' || updateType === 'reply') &&
    !photoFilePath
  ) {
    throw new Error(
      updateType === 'reply'
        ? 'Write a reply before sending'
        : 'Add a note or photo for this update'
    );
  }

  const result = await pool.query(
    `INSERT INTO maintenance_request_updates (
       maintenance_request_id, author_role, author_user_id, author_name,
       body, update_type, rating,
       photo_file_name, photo_file_path, photo_mime_type, photo_file_size
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      input.requestId,
      input.authorRole,
      input.authorUserId || null,
      input.authorName || null,
      body ||
        (updateType === 'acknowledgement'
          ? 'Acknowledged service'
          : updateType === 'closed'
            ? 'Closed by tenant'
            : 'Update'),
      updateType,
      input.rating ?? null,
      photoFileName,
      photoFilePath,
      photoMimeType,
      photoFileSize,
    ]
  );

  return mapUpdate(result.rows[0], emptyReactions());
}

/** Resolve linked tenant portal user for notifications. */
export async function getMaintenanceTenantNotifyUserId(
  requestId: string
): Promise<{ userId: string | null; title: string; tenantId: string | null }> {
  const result = await pool.query(
    `SELECT mr.title, mr.tenant_id, t.user_id
     FROM maintenance_requests mr
     LEFT JOIN tenants t ON t.id = mr.tenant_id
     WHERE mr.id = $1
     LIMIT 1`,
    [requestId]
  );
  if (result.rows.length === 0) {
    return { userId: null, title: 'Maintenance', tenantId: null };
  }
  const row = result.rows[0];
  return {
    userId: row.user_id ? String(row.user_id) : null,
    title: String(row.title || 'Maintenance'),
    tenantId: row.tenant_id ? String(row.tenant_id) : null,
  };
}

export function tenantMaintenanceRequestLink(requestId: string): string {
  return `/tenant/maintenance/${encodeURIComponent(requestId)}`;
}

export function notifyTenantMaintenanceChange(input: {
  actorUserId: string | null;
  actorRole: 'admin' | 'staff' | 'tenant' | 'system';
  actionType: string;
  requestId: string;
  title: string;
  tenantUserId: string | null;
  afterData?: Record<string, unknown>;
  summary?: string;
}): void {
  if (!input.tenantUserId) return;
  const actorRole =
    input.actorRole === 'staff' ? 'admin' : input.actorRole;
  const link = tenantMaintenanceRequestLink(input.requestId);
  logActivitySafe({
    actorUserId: input.actorUserId,
    actorRole,
    actionType: input.actionType,
    category: 'maintenance',
    entityType: 'maintenance_request',
    entityId: input.requestId,
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
