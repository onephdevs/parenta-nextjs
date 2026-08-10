/**
 * Historical entity notes (tenant / room / building / lease / payment / document).
 */

import pool from '@/lib/db';

export const ENTITY_NOTE_TYPES = [
  'tenant',
  'room',
  'building',
  'lease',
  'payment',
  'document',
] as const;

export type EntityNoteType = (typeof ENTITY_NOTE_TYPES)[number];

export interface EntityNote {
  id: string;
  entityType: EntityNoteType;
  entityId: string;
  body: string;
  createdByUserId: string | null;
  createdByName: string | null;
  createdByRole: string | null;
  createdAt: string;
}

export function isEntityNoteType(value: string): value is EntityNoteType {
  return (ENTITY_NOTE_TYPES as readonly string[]).includes(value);
}

function displayNameFromParts(
  first?: string | null,
  last?: string | null,
  email?: string | null,
  storedName?: string | null
): string | null {
  const fromParts = `${String(first || '').trim()} ${String(last || '').trim()}`.trim();
  if (fromParts) return fromParts;
  const fromStored = String(storedName || '').trim();
  if (fromStored) return fromStored;
  const fromEmail = String(email || '').trim();
  return fromEmail || null;
}

function mapRow(row: Record<string, unknown>): EntityNote {
  return {
    id: String(row.id),
    entityType: String(row.entity_type) as EntityNoteType,
    entityId: String(row.entity_id),
    body: String(row.body || ''),
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdByName: displayNameFromParts(
      row.author_first_name as string | null,
      row.author_last_name as string | null,
      row.author_email as string | null,
      row.created_by_name as string | null
    ),
    createdByRole: row.author_role ? String(row.author_role) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

const NOTE_SELECT = `
  SELECT
    n.id,
    n.entity_type,
    n.entity_id,
    n.body,
    n.created_by_user_id,
    n.created_by_name,
    n.created_at,
    u.first_name AS author_first_name,
    u.last_name AS author_last_name,
    u.email AS author_email,
    u.role AS author_role
  FROM entity_notes n
  LEFT JOIN users u ON u.id = n.created_by_user_id
`;

export async function listEntityNotes(
  entityType: EntityNoteType,
  entityId: string,
  limit = 100
): Promise<EntityNote[]> {
  const result = await pool.query(
    `
    ${NOTE_SELECT}
    WHERE n.entity_type = $1
      AND n.entity_id = $2
    ORDER BY n.created_at DESC
    LIMIT $3
    `,
    [entityType, entityId, Math.min(Math.max(limit, 1), 500)]
  );
  return result.rows.map((row) => mapRow(row));
}

export async function createEntityNote(input: {
  entityType: EntityNoteType;
  entityId: string;
  body: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
}): Promise<EntityNote> {
  const body = String(input.body || '').trim();
  if (!body) {
    throw new Error('Note body is required');
  }

  const createdByUserId = input.createdByUserId?.trim() || null;
  const createdByName = input.createdByName?.trim() || null;

  const inserted = await pool.query(
    `
    INSERT INTO entity_notes (entity_type, entity_id, body, created_by_user_id, created_by_name)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [
      input.entityType,
      input.entityId,
      body,
      createdByUserId,
      createdByName,
    ]
  );

  const id = String(inserted.rows[0].id);
  const listed = await pool.query(
    `
    ${NOTE_SELECT}
    WHERE n.id = $1
    `,
    [id]
  );
  return mapRow(listed.rows[0]);
}

export async function getEntityNoteById(id: string): Promise<EntityNote | null> {
  const result = await pool.query(
    `
    ${NOTE_SELECT}
    WHERE n.id = $1
    `,
    [id]
  );
  if (!result.rows[0]) return null;
  return mapRow(result.rows[0]);
}

export async function deleteEntityNote(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM entity_notes WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}
