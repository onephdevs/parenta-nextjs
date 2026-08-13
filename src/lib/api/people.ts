import pool from '@/lib/db';

/**
 * People directory — forever person records.
 * Badge is DERIVED from occupancy (tenant_room_assignments), not a stored flag.
 * - active: has ≥1 active stay right now
 * - past: has ≥1 stay, none currently active
 * - prospect: never leased (0 stays)
 */
export type PersonBadge = 'active' | 'past' | 'prospect';

export interface DirectoryPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  tenantStatus: string;
  isTenant: boolean;
  hasPortal: boolean;
  badge: PersonBadge;
  currentRoomId?: string | null;
  currentRoomNumber?: string | null;
  currentBuildingId?: string | null;
  currentBuildingName?: string | null;
  currentMonthlyRent?: number | null;
  stayCount: number;
  createdAt: string;
  moveInDate?: string | null;
  moveOutDate?: string | null;
}

export interface PersonStay {
  id: string;
  roomId: string;
  roomNumber: string;
  buildingId: string | null;
  buildingName: string | null;
  startDate: string | null;
  endDate: string | null;
  monthlyRate: number;
  assignmentStatus: string;
  notes?: string | null;
}

export interface DirectoryPersonDetail extends DirectoryPerson {
  previousAddress?: string | null;
  notes?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  stays: PersonStay[];
}

function deriveBadge(row: {
  current_room_id?: string | null;
  stay_count?: number | string;
}): PersonBadge {
  const stayCount = Number(row.stay_count) || 0;
  // Source of truth: active occupancy join, not tenants.is_tenant
  if (row.current_room_id) return 'active';
  if (stayCount > 0) return 'past';
  return 'prospect';
}

function mapPerson(row: Record<string, unknown>): DirectoryPerson {
  return {
    id: String(row.id),
    firstName: String(row.first_name || ''),
    lastName: String(row.last_name || ''),
    email: String(row.email || ''),
    phone: (row.phone as string) || null,
    emergencyContactName: (row.emergency_contact_name as string) || null,
    emergencyContactPhone: (row.emergency_contact_phone as string) || null,
    tenantStatus: String(row.tenant_status || ''),
    isTenant: Boolean(row.is_tenant),
    hasPortal: Boolean(row.user_id),
    badge: deriveBadge(row as Parameters<typeof deriveBadge>[0]),
    currentRoomId: row.current_room_id ? String(row.current_room_id) : null,
    currentRoomNumber: (row.current_room_number as string) || null,
    currentBuildingId: row.current_building_id ? String(row.current_building_id) : null,
    currentBuildingName: (row.current_building_name as string) || null,
    currentMonthlyRent: row.current_monthly_rent
      ? parseFloat(String(row.current_monthly_rent))
      : null,
    stayCount: Number(row.stay_count) || 0,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : '',
    moveInDate: row.move_in_date ? String(row.move_in_date).slice(0, 10) : null,
    moveOutDate: row.move_out_date ? String(row.move_out_date).slice(0, 10) : null,
  };
}

const ACTIVE_STAY_SQL = `
  EXISTS (
    SELECT 1 FROM tenant_room_assignments tra
    WHERE tra.tenant_id = t.id
      AND tra.assignment_status = 'active'
      AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
  )
`;

export async function getPeopleStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE ${ACTIVE_STAY_SQL})::int AS active_count,
      COUNT(*) FILTER (
        WHERE NOT (${ACTIVE_STAY_SQL})
          AND EXISTS (SELECT 1 FROM tenant_room_assignments x WHERE x.tenant_id = t.id)
      )::int AS past_count,
      COUNT(*) FILTER (
        WHERE NOT EXISTS (SELECT 1 FROM tenant_room_assignments x WHERE x.tenant_id = t.id)
      )::int AS prospect_count,
      COUNT(*) FILTER (WHERE t.user_id IS NOT NULL)::int AS portal_count
    FROM tenants t
  `);
  const row = result.rows[0] || {};
  return {
    total: Number(row.total) || 0,
    active: Number(row.active_count) || 0,
    past: Number(row.past_count) || 0,
    prospect: Number(row.prospect_count) || 0,
    withPortal: Number(row.portal_count) || 0,
  };
}

export async function listPeople(options?: {
  search?: string;
  badge?: PersonBadge | 'all';
  buildingId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ people: DirectoryPerson[]; total: number }> {
  const limit = Math.min(options?.limit || 200, 500);
  const offset = options?.offset || 0;
  const values: unknown[] = [];
  let param = 0;
  const where: string[] = [];

  if (options?.search?.trim()) {
    param++;
    where.push(`(
      COALESCE(t.first_name, '') ILIKE $${param}
      OR COALESCE(t.last_name, '') ILIKE $${param}
      OR COALESCE(t.email, '') ILIKE $${param}
      OR COALESCE(t.phone, '') ILIKE $${param}
      OR COALESCE(curr_b.name, '') ILIKE $${param}
      OR COALESCE(curr_r.room_number, '') ILIKE $${param}
    )`);
    values.push(`%${options.search.trim()}%`);
  }

  if (options?.buildingId) {
    param++;
    where.push(`curr_b.id = $${param}`);
    values.push(options.buildingId);
  }

  const badge = options?.badge || 'all';
  if (badge === 'active') {
    where.push(`curr_r.id IS NOT NULL`);
  } else if (badge === 'past') {
    where.push(`(
      curr_r.id IS NULL
      AND EXISTS (SELECT 1 FROM tenant_room_assignments x WHERE x.tenant_id = t.id)
    )`);
  } else if (badge === 'prospect') {
    where.push(`NOT EXISTS (SELECT 1 FROM tenant_room_assignments x WHERE x.tenant_id = t.id)`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const fromSql = `
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT tra.monthly_rate, tra.room_id
      FROM tenant_room_assignments tra
      WHERE tra.tenant_id = t.id
        AND tra.assignment_status = 'active'
        AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
      ORDER BY tra.start_date DESC
      LIMIT 1
    ) curr ON true
    LEFT JOIN rooms curr_r ON curr_r.id = curr.room_id
    LEFT JOIN buildings curr_b ON curr_b.id = curr_r.building_id
  `;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total ${fromSql} ${whereSql}`,
    values
  );
  const total = Number(countResult.rows[0]?.total) || 0;

  param++;
  const limitParam = param;
  param++;
  const offsetParam = param;
  values.push(limit, offset);

  const listResult = await pool.query(
    `
    SELECT
      t.*,
      curr.monthly_rate AS current_monthly_rent,
      curr_r.id AS current_room_id,
      curr_r.room_number AS current_room_number,
      curr_b.id AS current_building_id,
      curr_b.name AS current_building_name,
      (
        SELECT COUNT(*)::int FROM tenant_room_assignments s WHERE s.tenant_id = t.id
      ) AS stay_count
    ${fromSql}
    ${whereSql}
    ORDER BY
      CASE
        WHEN curr_r.id IS NOT NULL THEN 0
        WHEN EXISTS (SELECT 1 FROM tenant_room_assignments s WHERE s.tenant_id = t.id) THEN 1
        ELSE 2
      END,
      COALESCE(t.last_name, ''),
      COALESCE(t.first_name, ''),
      t.created_at DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    values
  );

  return {
    people: listResult.rows.map(mapPerson),
    total,
  };
}

export async function getPersonDetail(id: string): Promise<DirectoryPersonDetail | null> {
  const personResult = await pool.query(
    `
    SELECT
      t.*,
      curr.monthly_rate AS current_monthly_rent,
      curr_r.id AS current_room_id,
      curr_r.room_number AS current_room_number,
      curr_b.id AS current_building_id,
      curr_b.name AS current_building_name,
      (
        SELECT COUNT(*)::int FROM tenant_room_assignments s WHERE s.tenant_id = t.id
      ) AS stay_count
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT tra.monthly_rate, tra.room_id
      FROM tenant_room_assignments tra
      WHERE tra.tenant_id = t.id
        AND tra.assignment_status = 'active'
        AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
      ORDER BY tra.start_date DESC
      LIMIT 1
    ) curr ON true
    LEFT JOIN rooms curr_r ON curr_r.id = curr.room_id
    LEFT JOIN buildings curr_b ON curr_b.id = curr_r.building_id
    WHERE t.id = $1
    `,
    [id]
  );

  if (personResult.rows.length === 0) return null;

  const person = mapPerson(personResult.rows[0]);
  const row = personResult.rows[0];

  const staysResult = await pool.query(
    `
    SELECT
      tra.id,
      tra.room_id,
      r.room_number,
      b.id AS building_id,
      b.name AS building_name,
      tra.start_date,
      tra.end_date,
      tra.monthly_rate,
      tra.assignment_status,
      tra.notes
    FROM tenant_room_assignments tra
    JOIN rooms r ON r.id = tra.room_id
    LEFT JOIN buildings b ON b.id = r.building_id
    WHERE tra.tenant_id = $1
    ORDER BY tra.start_date DESC NULLS LAST, tra.created_at DESC
    `,
    [id]
  );

  const stays: PersonStay[] = staysResult.rows.map((s) => ({
    id: String(s.id),
    roomId: String(s.room_id),
    roomNumber: String(s.room_number || ''),
    buildingId: s.building_id ? String(s.building_id) : null,
    buildingName: s.building_name ? String(s.building_name) : null,
    startDate: s.start_date ? String(s.start_date).slice(0, 10) : null,
    endDate: s.end_date ? String(s.end_date).slice(0, 10) : null,
    monthlyRate: parseFloat(String(s.monthly_rate)) || 0,
    assignmentStatus: String(s.assignment_status || ''),
    notes: s.notes ? String(s.notes) : null,
  }));

  return {
    ...person,
    previousAddress: row.previous_address ? String(row.previous_address) : null,
    notes: row.notes ? String(row.notes) : null,
    leaseStartDate: row.lease_start_date ? String(row.lease_start_date).slice(0, 10) : null,
    leaseEndDate: row.lease_end_date ? String(row.lease_end_date).slice(0, 10) : null,
    stays,
  };
}
