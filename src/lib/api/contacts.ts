import pool from '@/lib/db';
import {
  CONTACT_ROLES,
  inferContactUtilityTypes,
  isContactRole,
  VENDOR_COMPANY_LAST_NAME,
  type Contact,
  type ContactRole,
} from '@/lib/constants/contacts';

export type { Contact, ContactRole, VendorUtilityType };
export {
  contactDisplayName,
  inferContactUtilityTypes,
  VENDOR_COMPANY_LAST_NAME,
} from '@/lib/constants/contacts';

interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tenant_id: string | null;
  user_id: string | null;
  is_active: boolean | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  roles: string[] | null;
}

export interface CreateContactInput {
  firstName: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  roles: ContactRole[];
  isActive?: boolean;
}

function mapRow(row: ContactRow): Contact {
  const roles = (row.roles || [])
    .map((r) => String(r || '').toUpperCase())
    .filter(isContactRole);
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    notes: row.notes || undefined,
    tenantId: row.tenant_id || undefined,
    userId: row.user_id || undefined,
    isActive: row.is_active !== false,
    roles,
    utilityTypes: inferContactUtilityTypes({
      firstName: row.first_name,
      lastName: row.last_name,
      notes: row.notes || undefined,
    }),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

const DEFAULT_VENDORS: Array<{ firstName: string; notes: string }> = [
  {
    firstName: 'Angeles Electric Corp.',
    notes: 'Electric utility provider (Alfonso / Angeles area)',
  },
  {
    firstName: 'Balibago WaterWorks System',
    notes: 'Water utility provider',
  },
];

/** Idempotent seed for known utility providers from client discovery. */
export async function ensureDefaultVendors(): Promise<void> {
  for (const vendor of DEFAULT_VENDORS) {
    const existing = await pool.query(
      `SELECT c.id
       FROM contacts c
       INNER JOIN contact_roles cr ON cr.contact_id = c.id AND cr.role = 'VENDOR'
       WHERE lower(trim(c.first_name)) = lower(trim($1))
       LIMIT 1`,
      [vendor.firstName]
    );
    if (existing.rows.length > 0) continue;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const created = await client.query(
        `INSERT INTO contacts (first_name, last_name, notes, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
        [vendor.firstName, VENDOR_COMPANY_LAST_NAME, vendor.notes]
      );
      await client.query(
        `INSERT INTO contact_roles (contact_id, role)
         VALUES ($1, 'VENDOR')
         ON CONFLICT (contact_id, role) DO NOTHING`,
        [created.rows[0].id]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export async function listContacts(options?: {
  role?: ContactRole;
  activeOnly?: boolean;
  search?: string;
  utilityType?: 'electricity' | 'water';
}): Promise<Contact[]> {
  const role = options?.role;
  const activeOnly = options?.activeOnly !== false;
  const search = options?.search?.trim();
  const utilityType = options?.utilityType;

  const params: unknown[] = [];
  const clauses: string[] = [];

  if (role) {
    params.push(role);
    clauses.push(`EXISTS (
      SELECT 1 FROM contact_roles cr
      WHERE cr.contact_id = c.id AND cr.role = $${params.length}
    )`);
  }

  if (activeOnly) {
    clauses.push(`(c.is_active IS NULL OR c.is_active = true)`);
  }

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(
      c.first_name ILIKE $${params.length}
      OR c.last_name ILIKE $${params.length}
      OR (c.first_name || ' ' || c.last_name) ILIKE $${params.length}
      OR COALESCE(c.email, '') ILIKE $${params.length}
      OR COALESCE(c.phone, '') ILIKE $${params.length}
    )`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT
       c.id,
       c.first_name,
       c.last_name,
       c.email,
       c.phone,
       c.notes,
       c.tenant_id,
       c.user_id,
       c.is_active,
       c.created_at,
       c.updated_at,
       COALESCE(
         array_agg(cr.role ORDER BY cr.role) FILTER (WHERE cr.role IS NOT NULL),
         ARRAY[]::varchar[]
       ) AS roles
     FROM contacts c
     LEFT JOIN contact_roles cr ON cr.contact_id = c.id
     ${where}
     GROUP BY c.id
     ORDER BY c.first_name ASC, c.last_name ASC`,
    params
  );

  const contacts = result.rows.map((row) => mapRow(row as ContactRow));
  if (!utilityType) return contacts;
  return contacts.filter((c) => (c.utilityTypes || []).includes(utilityType));
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const firstName = input.firstName.trim();
  if (!firstName) {
    throw new Error('First name / vendor name is required');
  }
  if (firstName.length > 100) {
    throw new Error('Name must be 100 characters or fewer');
  }

  const lastName = (input.lastName || '').trim() || VENDOR_COMPANY_LAST_NAME;
  if (lastName.length > 100) {
    throw new Error('Contact name must be 100 characters or fewer');
  }

  const roles = Array.from(
    new Set(
      (input.roles || [])
        .map((r) => String(r).toUpperCase())
        .filter(isContactRole)
    )
  );
  if (roles.length === 0) {
    throw new Error(`At least one role is required (${CONTACT_ROLES.join(', ')})`);
  }

  const email = input.email?.trim() || null;
  const phoneRaw = input.phone?.trim() || null;
  const phone = phoneRaw && phoneRaw.length > 20 ? phoneRaw.slice(0, 20) : phoneRaw;
  const notes = input.notes?.trim() || null;

  const client = await pool.connect();
  let id: string;
  try {
    await client.query('BEGIN');
    const created = await client.query(
      `INSERT INTO contacts (first_name, last_name, email, phone, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [firstName, lastName, email, phone, notes, input.isActive !== false]
    );
    id = created.rows[0].id as string;
    for (const role of roles) {
      await client.query(
        `INSERT INTO contact_roles (contact_id, role)
         VALUES ($1, $2)
         ON CONFLICT (contact_id, role) DO NOTHING`,
        [id, role]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const loaded = await pool.query(
    `SELECT
       c.id,
       c.first_name,
       c.last_name,
       c.email,
       c.phone,
       c.notes,
       c.tenant_id,
       c.user_id,
       c.is_active,
       c.created_at,
       c.updated_at,
       COALESCE(
         array_agg(cr.role ORDER BY cr.role) FILTER (WHERE cr.role IS NOT NULL),
         ARRAY[]::varchar[]
       ) AS roles
     FROM contacts c
     LEFT JOIN contact_roles cr ON cr.contact_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [id]
  );
  if (!loaded.rows[0]) {
    throw new Error('Contact created but could not be loaded');
  }
  return mapRow(loaded.rows[0] as ContactRow);
}
