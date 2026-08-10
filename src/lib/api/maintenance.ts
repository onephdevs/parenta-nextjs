import pool from '../db';

export interface MaintenanceFilters {
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  buildingId?: string | null;
}

export interface MaintenanceStats {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  urgent: number;
  high: number;
}

export interface ListMaintenanceRequestsResult {
  requests: Record<string, unknown>[];
  stats: MaintenanceStats;
}

export interface CreateMaintenanceRequestInput {
  tenantId?: string | null;
  roomId?: string | null;
  buildingId?: string | null;
  title: string;
  description: string;
  category: string;
  priority?: string;
  scheduledDate?: string | null;
}

export interface UpdateMaintenanceRequestInput {
  id: string | number;
  status?: string;
  priority?: string;
  scheduledDate?: string | null;
  completedDate?: string | null;
  notes?: string;
  assignedTo?: string | null;
}

export type UpdateMaintenanceRequestResult =
  | { ok: true; before: Record<string, unknown>; updated: Record<string, unknown> }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'no_fields' };

export type DeleteMaintenanceRequestResult =
  | { ok: true; before: Record<string, unknown> }
  | { ok: false; reason: 'not_found' };

export function calculateMaintenanceStats(
  requests: Record<string, unknown>[]
): MaintenanceStats {
  return {
    total: requests.length,
    open: requests.filter((r) => r.status === 'open').length,
    inProgress: requests.filter((r) => r.status === 'in_progress').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    cancelled: requests.filter((r) => r.status === 'cancelled').length,
    urgent: requests.filter((r) => r.priority === 'urgent').length,
    high: requests.filter((r) => r.priority === 'high').length,
  };
}

export async function listMaintenanceRequests(
  filters: MaintenanceFilters = {}
): Promise<ListMaintenanceRequestsResult> {
  const { status, priority, category, buildingId } = filters;

  let query = `
    SELECT 
      mr.*,
      t.first_name || ' ' || t.last_name as tenant_name,
      t.email as tenant_email,
      t.phone as tenant_phone,
      r.room_number,
      b.name as building_name,
      COALESCE(
        NULLIF(TRIM(CONCAT_WS(', ', b.address_line1, b.address_line2, b.city, b.state, b.postal_code)), ''),
        b.address_line1,
        ''
      ) as building_address,
      NULLIF(TRIM(CONCAT_WS(' ', au.first_name, au.last_name)), '') as assigned_to_name,
      CASE
        WHEN au.id IS NULL THEN NULL
        ELSE UPPER(CONCAT(LEFT(COALESCE(au.first_name, ''), 1), LEFT(COALESCE(au.last_name, ''), 1)))
      END as assigned_to_initials
    FROM maintenance_requests mr
    LEFT JOIN tenants t ON mr.tenant_id = t.id
    LEFT JOIN rooms r ON mr.room_id = r.id
    LEFT JOIN buildings b ON b.id = COALESCE(mr.building_id, r.building_id)
    LEFT JOIN users au ON au.id = mr.assigned_to
    WHERE 1=1
  `;

  const params: unknown[] = [];
  let paramIndex = 1;

  if (status && status !== 'all') {
    query += ` AND mr.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (priority && priority !== 'all') {
    query += ` AND mr.priority = $${paramIndex}`;
    params.push(priority);
    paramIndex++;
  }

  if (category && category !== 'all') {
    query += ` AND mr.category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (buildingId && buildingId !== 'all') {
    query += ` AND mr.building_id = $${paramIndex}`;
    params.push(buildingId);
    paramIndex++;
  }

  query += ` ORDER BY 
    CASE mr.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    mr.request_date DESC
  `;

  const result = await pool.query(query, params);
  const requests = result.rows;

  const { listAttachmentsForRequests } = await import(
    '@/lib/api/maintenance-attachments'
  );
  const attachmentMap = await listAttachmentsForRequests(
    requests.map((r) => String(r.id))
  );

  const withAttachments = requests.map((r) => ({
    ...r,
    attachments: attachmentMap.get(String(r.id)) || [],
    attachmentCount: (attachmentMap.get(String(r.id)) || []).length,
  }));

  return {
    requests: withAttachments,
    stats: calculateMaintenanceStats(requests),
  };
}

export async function createMaintenanceRequest(
  input: CreateMaintenanceRequestInput
): Promise<Record<string, unknown>> {
  const {
    tenantId,
    roomId,
    buildingId,
    title,
    description,
    category,
    priority,
    scheduledDate,
  } = input;

  const insertQuery = `
    INSERT INTO maintenance_requests (
      tenant_id,
      room_id,
      building_id,
      title,
      description,
      category,
      priority,
      status,
      scheduled_date,
      request_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING *
  `;

  const values = [
    tenantId || null,
    roomId || null,
    buildingId || null,
    title,
    description,
    category,
    priority || 'medium',
    'open',
    scheduledDate || null,
  ];

  const result = await pool.query(insertQuery, values);
  return result.rows[0];
}

export async function getMaintenanceRequestById(
  id: string | number
): Promise<Record<string, unknown> | null> {
  const result = await pool.query(
    'SELECT * FROM maintenance_requests WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/** Detail row with tenant/unit labels and photo attachments for admin UI. */
export async function getMaintenanceRequestDetail(
  id: string,
  viewerUserId?: string | null
): Promise<Record<string, unknown> | null> {
  const result = await pool.query(
    `SELECT
       mr.*,
       t.first_name || ' ' || t.last_name AS tenant_name,
       t.email AS tenant_email,
       t.phone AS tenant_phone,
       r.room_number,
       b.name AS building_name,
       NULLIF(TRIM(CONCAT_WS(' ', au.first_name, au.last_name)), '') AS assigned_to_name
     FROM maintenance_requests mr
     LEFT JOIN tenants t ON mr.tenant_id = t.id
     LEFT JOIN rooms r ON mr.room_id = r.id
     LEFT JOIN buildings b ON b.id = COALESCE(mr.building_id, r.building_id)
     LEFT JOIN users au ON au.id = mr.assigned_to
     WHERE mr.id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const { listAttachmentsForRequests } = await import(
    '@/lib/api/maintenance-attachments'
  );
  const { listMaintenanceUpdates } = await import(
    '@/lib/api/maintenance-updates'
  );
  const attachmentMap = await listAttachmentsForRequests([id]);
  const attachments = attachmentMap.get(id) || [];
  const updates = await listMaintenanceUpdates(id, viewerUserId);

  return {
    ...result.rows[0],
    attachments,
    attachmentCount: attachments.length,
    updates,
  };
}

export async function updateMaintenanceRequest(
  input: UpdateMaintenanceRequestInput
): Promise<UpdateMaintenanceRequestResult> {
  const { id, status, priority, scheduledDate, completedDate, notes, assignedTo } =
    input;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (priority !== undefined) {
    updates.push(`priority = $${paramIndex}`);
    params.push(priority);
    paramIndex++;
  }

  if (scheduledDate !== undefined) {
    updates.push(`scheduled_date = $${paramIndex}`);
    params.push(scheduledDate || null);
    paramIndex++;
  }

  if (completedDate !== undefined) {
    updates.push(`completed_date = $${paramIndex}`);
    params.push(completedDate || null);
    paramIndex++;
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    params.push(notes);
    paramIndex++;
  }

  if (assignedTo !== undefined) {
    updates.push(`assigned_to = $${paramIndex}`);
    params.push(assignedTo || null);
    paramIndex++;
  }

  updates.push(`updated_at = NOW()`);

  if (updates.length === 1) {
    return { ok: false, reason: 'no_fields' };
  }

  const before = await getMaintenanceRequestById(id);
  if (!before) {
    return { ok: false, reason: 'not_found' };
  }

  params.push(id);

  const updateQuery = `
    UPDATE maintenance_requests 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(updateQuery, params);

  if (result.rows.length === 0) {
    return { ok: false, reason: 'not_found' };
  }

  return {
    ok: true,
    before,
    updated: result.rows[0],
  };
}

export async function deleteMaintenanceRequest(
  id: string
): Promise<DeleteMaintenanceRequestResult> {
  const before = await getMaintenanceRequestById(id);
  if (!before) {
    return { ok: false, reason: 'not_found' };
  }

  await pool.query('DELETE FROM maintenance_requests WHERE id = $1 RETURNING id', [
    id,
  ]);

  return { ok: true, before };
}
