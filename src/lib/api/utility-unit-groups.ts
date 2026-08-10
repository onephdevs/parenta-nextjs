/**
 * Named utility unit groups (e.g. Balibago 3rd-floor shared water → N rooms).
 */

import pool from '@/lib/db';

export interface UtilityUnitGroup {
  id: string;
  buildingId: string;
  buildingName?: string;
  name: string;
  utilityType: string | null;
  description: string | null;
  isActive: boolean;
  memberCount: number;
  roomIds: string[];
}

function mapGroup(row: Record<string, unknown>, roomIds: string[] = []): UtilityUnitGroup {
  return {
    id: String(row.id),
    buildingId: String(row.building_id),
    buildingName: row.building_name ? String(row.building_name) : undefined,
    name: String(row.name),
    utilityType: row.utility_type ? String(row.utility_type) : null,
    description: row.description ? String(row.description) : null,
    isActive: row.is_active !== false,
    memberCount: roomIds.length || Number(row.member_count) || 0,
    roomIds,
  };
}

export async function listUtilityUnitGroups(buildingId?: string): Promise<UtilityUnitGroup[]> {
  const params: unknown[] = [];
  let where = 'WHERE COALESCE(g.is_active, true) = true';
  if (buildingId) {
    params.push(buildingId);
    where += ` AND g.building_id = $1`;
  }

  const result = await pool.query(
    `
    SELECT g.*, b.name AS building_name,
           (SELECT COUNT(*)::int FROM utility_unit_group_members m WHERE m.group_id = g.id) AS member_count
    FROM utility_unit_groups g
    JOIN buildings b ON b.id = g.building_id
    ${where}
    ORDER BY b.name, g.name
    `,
    params
  );

  return result.rows.map((row) => mapGroup(row));
}

export async function getUtilityUnitGroup(id: string): Promise<UtilityUnitGroup | null> {
  const result = await pool.query(
    `
    SELECT g.*, b.name AS building_name
    FROM utility_unit_groups g
    JOIN buildings b ON b.id = g.building_id
    WHERE g.id = $1
    `,
    [id]
  );
  if (!result.rows[0]) return null;

  const members = await pool.query(
    `SELECT room_id FROM utility_unit_group_members WHERE group_id = $1 ORDER BY created_at`,
    [id]
  );
  const roomIds = members.rows.map((r) => String(r.room_id));
  return mapGroup(result.rows[0], roomIds);
}

export async function createUtilityUnitGroup(input: {
  buildingId: string;
  name: string;
  utilityType?: string | null;
  description?: string | null;
  roomIds?: string[];
}): Promise<UtilityUnitGroup> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await client.query(
      `INSERT INTO utility_unit_groups (building_id, name, utility_type, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        input.buildingId,
        input.name.trim(),
        input.utilityType || null,
        input.description || null,
      ]
    );
    const groupId = String(created.rows[0].id);
    const roomIds = Array.from(new Set(input.roomIds || []));
    for (const roomId of roomIds) {
      await client.query(
        `INSERT INTO utility_unit_group_members (group_id, room_id)
         VALUES ($1, $2)
         ON CONFLICT (group_id, room_id) DO NOTHING`,
        [groupId, roomId]
      );
    }
    await client.query('COMMIT');
    return (await getUtilityUnitGroup(groupId))!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateUtilityUnitGroup(
  id: string,
  input: {
    name?: string;
    utilityType?: string | null;
    description?: string | null;
    isActive?: boolean;
    roomIds?: string[];
  }
): Promise<UtilityUnitGroup> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (input.name !== undefined) {
      fields.push(`name = $${i++}`);
      values.push(input.name.trim());
    }
    if (input.utilityType !== undefined) {
      fields.push(`utility_type = $${i++}`);
      values.push(input.utilityType);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${i++}`);
      values.push(input.description);
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${i++}`);
      values.push(input.isActive);
    }
    if (fields.length > 0) {
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      await client.query(
        `UPDATE utility_unit_groups SET ${fields.join(', ')} WHERE id = $${i}`,
        values
      );
    }

    if (input.roomIds) {
      await client.query(`DELETE FROM utility_unit_group_members WHERE group_id = $1`, [
        id,
      ]);
      for (const roomId of Array.from(new Set(input.roomIds))) {
        await client.query(
          `INSERT INTO utility_unit_group_members (group_id, room_id)
           VALUES ($1, $2)
           ON CONFLICT (group_id, room_id) DO NOTHING`,
          [id, roomId]
        );
      }
    }

    await client.query('COMMIT');
    const updated = await getUtilityUnitGroup(id);
    if (!updated) throw new Error('Group not found');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
