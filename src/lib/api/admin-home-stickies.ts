import pool from '@/lib/db';
import { isStickyColor, type AdminHomeSticky } from '@/lib/admin-home-stickies-shared';

export {
  STICKY_COLORS,
  isStickyColor,
  type AdminHomeSticky,
  type StickyColor,
} from '@/lib/admin-home-stickies-shared';

function mapRow(row: Record<string, unknown>): AdminHomeSticky {
  const color = String(row.color || 'lavender');
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title || ''),
    body: String(row.body || ''),
    color: isStickyColor(color) ? color : 'lavender',
    sortOrder: Number(row.sort_order || 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function listAdminHomeStickies(userId: string): Promise<AdminHomeSticky[]> {
  const result = await pool.query(
    `
    SELECT id, user_id, title, body, color, sort_order, created_at, updated_at
    FROM admin_home_stickies
    WHERE user_id = $1
    ORDER BY sort_order ASC, created_at DESC
    `,
    [userId]
  );
  return result.rows.map((row) => mapRow(row));
}

export async function createAdminHomeSticky(input: {
  userId: string;
  title?: string;
  body?: string;
  color?: string;
}): Promise<AdminHomeSticky> {
  const color = input.color && isStickyColor(input.color) ? input.color : 'lavender';
  const inserted = await pool.query(
    `
    INSERT INTO admin_home_stickies (user_id, title, body, color, sort_order)
    VALUES (
      $1,
      $2,
      $3,
      $4,
      COALESCE(
        (SELECT MIN(sort_order) - 1 FROM admin_home_stickies WHERE user_id = $1),
        0
      )
    )
    RETURNING id, user_id, title, body, color, sort_order, created_at, updated_at
    `,
    [input.userId, input.title?.trim() || '', input.body?.trim() || '', color]
  );
  return mapRow(inserted.rows[0]);
}

export async function updateAdminHomeSticky(input: {
  id: string;
  userId: string;
  title?: string;
  body?: string;
  color?: string;
}): Promise<AdminHomeSticky | null> {
  const sets: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const params: unknown[] = [];
  let i = 1;

  if (input.title !== undefined) {
    sets.push(`title = $${i++}`);
    params.push(input.title);
  }
  if (input.body !== undefined) {
    sets.push(`body = $${i++}`);
    params.push(input.body);
  }
  if (input.color !== undefined) {
    if (!isStickyColor(input.color)) return null;
    sets.push(`color = $${i++}`);
    params.push(input.color);
  }

  params.push(input.id, input.userId);

  const result = await pool.query(
    `
    UPDATE admin_home_stickies
    SET ${sets.join(', ')}
    WHERE id = $${i++} AND user_id = $${i++}
    RETURNING id, user_id, title, body, color, sort_order, created_at, updated_at
    `,
    params
  );
  if (!result.rows[0]) return null;
  return mapRow(result.rows[0]);
}

export async function deleteAdminHomeSticky(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM admin_home_stickies WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}
