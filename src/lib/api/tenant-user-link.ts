/**
 * Tenant-User Link Management
 * Handles the connection between user accounts (authentication) and tenant profiles (property management)
 */

import crypto from 'crypto';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendTenantPortalCredentialsEmail } from '@/lib/services/email-service';

/** @deprecated Seed/dev only. New tenants get a random password emailed to them. */
export const DEFAULT_TENANT_PASSWORD = 'tenant123';

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function generateTemporaryPassword(length = 12): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
  }
  return out;
}

export interface CreateTenantWithUserData {
  // User account fields
  email?: string | null;
  username?: string | null;
  password?: string; // Optional: a random password is generated and emailed when omitted
  sendInvitation?: boolean; // If true, sends invitation email to set password
  profileCompleted?: boolean;
  tenantStatus?: string;
  
  // Tenant profile fields
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  employmentStatus?: string;
  employerName?: string;
  monthlyIncome?: number;
  previousAddress?: string;
  securityDeposit?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  notes?: string;
}

/**
 * Creates both a user account and tenant profile in a single transaction
 */
export async function createTenantWithUser(data: CreateTenantWithUserData): Promise<{
  userId: string;
  tenantId: string;
  temporaryPassword?: string;
  emailSent?: boolean;
}> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const password = data.password || generateTemporaryPassword();
    const profileCompleted =
      data.profileCompleted !== undefined
        ? data.profileCompleted
        : false;
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const email = data.email ? data.email.toLowerCase().trim() : null;
    const username = data.username ? data.username.trim() : null;

    if (!email && !username) {
      throw new Error('Email or username is required');
    }

    // User INSERT on the same client so ROLLBACK undoes both user + tenant
    let userId: string;
    try {
      const userResult = await client.query(
        `INSERT INTO users (
           email, username, password_hash, role, first_name, last_name, profile_completed
         )
         VALUES ($1, $2, $3, 'tenant', $4, $5, $6)
         RETURNING id`,
        [
          email,
          username,
          passwordHash,
          data.firstName.trim(),
          data.lastName.trim(),
          profileCompleted,
        ]
      );
      userId = String(userResult.rows[0].id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error('User with this email or username already exists');
      }
      throw error;
    }
    
    // Create tenant profile linked to user
    const tenantQuery = `
      INSERT INTO tenants (
        user_id,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        employment_status,
        employer_name,
        monthly_income,
        previous_address,
        security_deposit,
        lease_start_date,
        lease_end_date,
        tenant_status,
        notes,
        is_active,
        is_tenant
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, false)
      RETURNING id
    `;
    
    const tenantValues = [
      userId,
      data.firstName.trim(),
      data.lastName.trim(),
      email,
      data.phone || null,
      data.dateOfBirth || null,
      data.emergencyContactName || null,
      data.emergencyContactPhone || null,
      data.emergencyContactRelationship || null,
      data.employmentStatus || null,
      data.employerName || null,
      data.monthlyIncome || null,
      data.previousAddress || null,
      data.securityDeposit || null,
      data.leaseStartDate || null,
      data.leaseEndDate || null,
      data.tenantStatus || 'pending',
      data.notes || null,
      true,
    ];
    
    const tenantResult = await client.query(tenantQuery, tenantValues);
    const tenantId = tenantResult.rows[0].id;
    
    await client.query('COMMIT');

    let emailSent = false;
    if (email) {
      const mailed = await sendTenantPortalCredentialsEmail({
        to: email,
        firstName: data.firstName,
        temporaryPassword: password,
      });
      emailSent = mailed.success;
      if (!mailed.success) {
        console.error(
          `[Tenant login] Could not email portal password to ${email}: ${mailed.error || 'unknown error'}`
        );
      }
    }

    return {
      userId,
      tenantId,
      temporaryPassword: password,
      emailSent,
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface EnsureTenantForLeaseResult {
  tenantId: string;
  userId: string | null;
  /** True when email belongs to admin/staff — portal login was not created */
  portalLoginSkipped: boolean;
  createdNewLogin: boolean;
  temporaryPassword?: string;
  emailSent?: boolean;
}

/**
 * Resolve or create a tenant profile for lease generation.
 * - Existing tenant by email → reuse
 * - Existing tenant-role user without profile → create + link
 * - Existing admin/staff user → create tenant profile without portal login
 *   (emails are unique on users; one address cannot be both admin and tenant)
 * - Otherwise → create tenant user + profile
 */
export async function ensureTenantForLease(
  data: CreateTenantWithUserData
): Promise<EnsureTenantForLeaseResult> {
  if (!data.email) {
    throw new Error('Email is required to create or link a lease tenant');
  }
  const email = data.email.toLowerCase().trim();
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();

  const existingTenant = await pool.query<{ id: string; user_id: string | null }>(
    `SELECT id, user_id FROM tenants WHERE LOWER(email) = $1 AND is_active = true
     ORDER BY CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END, created_at ASC
     LIMIT 1`,
    [email]
  );
  if (existingTenant.rows[0]) {
    return {
      tenantId: String(existingTenant.rows[0].id),
      userId: existingTenant.rows[0].user_id,
      portalLoginSkipped: false,
      createdNewLogin: false,
    };
  }

  const existingUser = await pool.query<{
    id: string;
    role: string;
  }>(`SELECT id, role FROM users WHERE LOWER(email) = $1 LIMIT 1`, [email]);

  if (existingUser.rows[0]) {
    const user = existingUser.rows[0];

    if (user.role === 'tenant') {
      const linked = await getTenantByUserId(user.id);
      if (linked?.id) {
        return {
          tenantId: String(linked.id),
          userId: user.id,
          portalLoginSkipped: false,
          createdNewLogin: false,
        };
      }

      const created = await createTenantProfileOnly({
        ...data,
        email,
        firstName,
        lastName,
        userId: user.id,
      });
      return { tenantId: created.tenantId, userId: user.id, portalLoginSkipped: false, createdNewLogin: false };
    }

    // Admin/staff (or other non-tenant roles): email is taken — create tenant without portal user
    const noteParts = [
      data.notes,
      `Portal login skipped: ${email} is already a ${user.role} account. Assign a different tenant email later for portal access.`,
    ].filter(Boolean);

    const created = await createTenantProfileOnly({
      ...data,
      email,
      firstName,
      lastName,
      userId: null,
      notes: noteParts.join('\n'),
    });
    return {
      tenantId: created.tenantId,
      userId: null,
      portalLoginSkipped: true,
      createdNewLogin: false,
    };
  }

  const created = await createTenantWithUser({
    ...data,
    email,
    firstName,
    lastName,
    password: data.password || generateTemporaryPassword(),
    profileCompleted: data.profileCompleted ?? false,
  });
  return {
    tenantId: created.tenantId,
    userId: created.userId,
    portalLoginSkipped: false,
    createdNewLogin: true,
    temporaryPassword: created.temporaryPassword,
    emailSent: created.emailSent,
  };
}

async function createTenantProfileOnly(data: CreateTenantWithUserData & {
  userId: string | null;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<{ tenantId: string }> {
  const result = await pool.query(
    `INSERT INTO tenants (
       user_id, first_name, last_name, email, phone,
       date_of_birth, emergency_contact_name, emergency_contact_phone,
       emergency_contact_relationship, employment_status, employer_name,
       monthly_income, previous_address, security_deposit,
       lease_start_date, lease_end_date, tenant_status, notes, is_active, is_tenant
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8,
       $9, $10, $11,
       $12, $13, $14,
       $15, $16, 'pending', $17, true, false
     )
     RETURNING id`,
    [
      data.userId,
      data.firstName,
      data.lastName,
      data.email,
      data.phone || null,
      data.dateOfBirth || null,
      data.emergencyContactName || null,
      data.emergencyContactPhone || null,
      data.emergencyContactRelationship || null,
      data.employmentStatus || null,
      data.employerName || null,
      data.monthlyIncome || null,
      data.previousAddress || null,
      data.securityDeposit || null,
      data.leaseStartDate || null,
      data.leaseEndDate || null,
      data.notes || null,
    ]
  );
  return { tenantId: String(result.rows[0].id) };
}

/**
 * Links an existing user account to an existing tenant profile
 */
export async function linkUserToTenant(userId: string, tenantId: string): Promise<void> {
  const query = `
    UPDATE tenants
    SET user_id = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `;
  
  try {
    await pool.query(query, [userId, tenantId]);
  } catch (error) {
    console.error('Error linking user to tenant:', error);
    throw new Error(`Failed to link user to tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets tenant profile by user ID
 */
export async function getTenantByUserId(userId: string) {
  const query = `
    SELECT 
      t.*,
      u.email as user_email,
      u.is_active as user_active
    FROM tenants t
    INNER JOIN users u ON t.user_id = u.id
    WHERE t.user_id = $1
  `;
  
  try {
    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching tenant by user ID:', error);
    throw error;
  }
}

/**
 * Gets complete tenant data including user account, assignments, and payments
 */
export async function getTenantCompleteData(userId: string) {
  const query = `
    SELECT 
      -- Tenant info
      t.id as tenant_id,
      t.first_name,
      t.last_name,
      t.email as tenant_email,
      t.phone,
      t.tenant_status,
      t.security_deposit,
      t.lease_start_date,
      t.lease_end_date,
      t.move_in_date,
      
      -- Current assignment (active and not past end date)
      tra.id as assignment_id,
      tra.start_date as assignment_start,
      tra.end_date as assignment_end,
      tra.monthly_rate,
      tra.deposit_paid,
      tra.advance_paid,
      tra.utility_deposit_paid,
      tra.deposit_valid_until,
      tra.deposit_refundable,
      tra.assignment_status,
      
      -- Room details
      r.id as room_id,
      r.room_number,
      r.floor_number,
      r.room_type,
      
      -- Building details
      b.id as building_id,
      b.name as building_name,
      b.address_line1,
      b.address_line2,
      b.city,
      b.state,
      b.postal_code
      
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT *
      FROM tenant_room_assignments tra2
      WHERE tra2.tenant_id = t.id
        AND tra2.assignment_status = 'active'
        AND (tra2.end_date IS NULL OR tra2.end_date::date >= CURRENT_DATE)
      ORDER BY tra2.start_date DESC
      LIMIT 1
    ) tra ON true
    LEFT JOIN rooms r ON tra.room_id = r.id
    LEFT JOIN buildings b ON r.building_id = b.id
    WHERE t.user_id = $1 AND t.is_active = true
  `;
  
  try {
    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching complete tenant data:', error);
    throw new Error(`Failed to fetch tenant data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Same payload as getTenantCompleteData, keyed by tenant profile id (for admin preview).
 */
export async function getTenantCompleteDataByTenantId(tenantId: string) {
  const query = `
    SELECT 
      t.id as tenant_id,
      t.first_name,
      t.last_name,
      t.email as tenant_email,
      t.phone,
      t.tenant_status,
      t.security_deposit,
      t.lease_start_date,
      t.lease_end_date,
      t.move_in_date,
      tra.id as assignment_id,
      tra.start_date as assignment_start,
      tra.end_date as assignment_end,
      tra.monthly_rate,
      tra.deposit_paid,
      tra.advance_paid,
      tra.utility_deposit_paid,
      tra.deposit_valid_until,
      tra.deposit_refundable,
      tra.assignment_status,
      r.id as room_id,
      r.room_number,
      r.floor_number,
      r.room_type,
      b.id as building_id,
      b.name as building_name,
      b.address_line1,
      b.address_line2,
      b.city,
      b.state,
      b.postal_code
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT *
      FROM tenant_room_assignments tra2
      WHERE tra2.tenant_id = t.id
        AND tra2.assignment_status = 'active'
        AND (tra2.end_date IS NULL OR tra2.end_date::date >= CURRENT_DATE)
      ORDER BY tra2.start_date DESC
      LIMIT 1
    ) tra ON true
    LEFT JOIN rooms r ON tra.room_id = r.id
    LEFT JOIN buildings b ON r.building_id = b.id
    WHERE t.id = $1 AND t.is_active = true
  `;

  try {
    const result = await pool.query(query, [tenantId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching complete tenant data by tenant id:', error);
    throw new Error(
      `Failed to fetch tenant data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export class TenantPortalPasswordError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'TenantPortalPasswordError';
    this.status = status;
    Object.setPrototypeOf(this, TenantPortalPasswordError.prototype);
  }
}

export interface SetTenantPortalPasswordInput {
  tenantId: string;
  /** If omitted or blank, a temporary password is generated. */
  password?: string;
  sendEmail?: boolean;
}

export interface SetTenantPortalPasswordResult {
  userId: string;
  createdNewLogin: boolean;
  temporaryPassword: string;
  emailSent: boolean;
  emailedTo: string | null;
  tenantLabel: string;
}

/**
 * Admin: set or generate a tenant portal password.
 * Creates a tenant-role login and links it when the person has no user yet.
 * Does not change profile_completed on an existing portal user.
 */
export async function setTenantPortalPassword(
  input: SetTenantPortalPasswordInput
): Promise<SetTenantPortalPasswordResult> {
  const provided =
    typeof input.password === 'string' && input.password.length > 0 ? input.password : '';
  if (provided && provided.length < 8) {
    throw new TenantPortalPasswordError('Password must be at least 8 characters');
  }

  const password = provided || generateTemporaryPassword();
  const sendEmail = Boolean(input.sendEmail);

  const tenantResult = await pool.query<{
    id: string;
    user_id: string | null;
    first_name: string;
    last_name: string;
    email: string | null;
  }>(
    `SELECT id, user_id, first_name, last_name, email
     FROM tenants
     WHERE id = $1`,
    [input.tenantId]
  );

  if (tenantResult.rows.length === 0) {
    throw new TenantPortalPasswordError('Tenant not found', 404);
  }

  const tenant = tenantResult.rows[0];
  const email = tenant.email ? tenant.email.toLowerCase().trim() : null;

  if (sendEmail && !email) {
    throw new TenantPortalPasswordError(
      'This tenant has no email. Add an email on the profile before sending the password.'
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  let userId = '';
  let createdNewLogin = false;
  let kind: 'created' | 'reset' = 'reset';

  try {
    await client.query('BEGIN');

    let linkedUserId = tenant.user_id ? String(tenant.user_id) : null;
    if (linkedUserId) {
      const linkedUser = await client.query<{ id: string; role: string }>(
        `SELECT id, role FROM users WHERE id = $1`,
        [linkedUserId]
      );
      if (linkedUser.rows.length === 0) {
        linkedUserId = null;
      } else if (linkedUser.rows[0].role !== 'tenant') {
        throw new TenantPortalPasswordError(
          'This tenant is linked to an office account. Portal passwords can only be set for tenant logins.'
        );
      }
    }

    if (linkedUserId) {
      await client.query(
        `UPDATE users
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND role = 'tenant'`,
        [passwordHash, linkedUserId]
      );
      userId = linkedUserId;
    } else {
      if (!email) {
        throw new TenantPortalPasswordError(
          'This tenant has no portal login and no email. Add an email on the profile first, then set a password.'
        );
      }

      const existingUser = await client.query<{ id: string; role: string }>(
        `SELECT id, role FROM users WHERE LOWER(email) = $1 LIMIT 1`,
        [email]
      );

      if (existingUser.rows[0]) {
        const user = existingUser.rows[0];
        if (user.role !== 'tenant') {
          throw new TenantPortalPasswordError(
            `Cannot create a portal login: ${email} is already an office account. Use a different tenant email.`
          );
        }

        const otherTenant = await client.query<{ id: string }>(
          `SELECT id FROM tenants WHERE user_id = $1 AND id <> $2 LIMIT 1`,
          [user.id, tenant.id]
        );
        if (otherTenant.rows[0]) {
          throw new TenantPortalPasswordError(
            'This email already has a portal login linked to another tenant.'
          );
        }

        await client.query(
          `UPDATE users
           SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND role = 'tenant'`,
          [passwordHash, user.id]
        );
        await client.query(
          `UPDATE tenants
           SET user_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [user.id, tenant.id]
        );
        userId = String(user.id);
      } else {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO users (
             email, password_hash, role, first_name, last_name, profile_completed
           )
           VALUES ($1, $2, 'tenant', $3, $4, false)
           RETURNING id`,
          [email, passwordHash, tenant.first_name, tenant.last_name]
        );
        userId = String(inserted.rows[0].id);
        await client.query(
          `UPDATE tenants
           SET user_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [userId, tenant.id]
        );
        createdNewLogin = true;
        kind = 'created';
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof TenantPortalPasswordError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new TenantPortalPasswordError(
        'A login with this email already exists',
        409
      );
    }
    throw error;
  } finally {
    client.release();
  }

  let emailSent = false;
  if (sendEmail && email) {
    const mailed = await sendTenantPortalCredentialsEmail({
      to: email,
      firstName: tenant.first_name,
      temporaryPassword: password,
      kind,
    });
    emailSent = mailed.success;
    if (!mailed.success) {
      console.error(
        `[Tenant login] Could not email portal password to ${email}: ${mailed.error || 'unknown error'}`
      );
    }
  }

  return {
    userId,
    createdNewLogin,
    temporaryPassword: password,
    emailSent,
    emailedTo: sendEmail ? email : null,
    tenantLabel: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || email || input.tenantId,
  };
}

/**
 * Verifies that a user-tenant link exists and is valid
 */
export async function verifyUserTenantLink(userId: string): Promise<boolean> {
  const query = `
    SELECT COUNT(*) as count
    FROM tenants
    WHERE user_id = $1 AND is_active = true
  `;
  
  try {
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Error verifying user-tenant link:', error);
    return false;
  }
}

