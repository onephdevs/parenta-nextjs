/**
 * Tenant-User Link Management
 * Handles the connection between user accounts (authentication) and tenant profiles (property management)
 */

import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

/** Default portal password for tenants created from lease generation / admin setup. */
export const DEFAULT_TENANT_PASSWORD = 'tenant123';

export interface CreateTenantWithUserData {
  // User account fields
  email?: string | null;
  username?: string | null;
  password?: string; // Optional: defaults to DEFAULT_TENANT_PASSWORD (tenant123)
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
}> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Default portal password (same as lease/pipeline flow) unless admin sets one
    const password = data.password || DEFAULT_TENANT_PASSWORD;
    const isDefaultPassword =
      !data.password || data.password === DEFAULT_TENANT_PASSWORD;
    // Board/lease accounts with the default password must complete profile + change password
    const profileCompleted =
      data.profileCompleted !== undefined
        ? data.profileCompleted
        : !isDefaultPassword;
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
    
    if (data.sendInvitation && email) {
      console.log(`Invitation email would be sent to ${email} with password: ${password}`);
    }
    
    return {
      userId,
      tenantId,
      // Show once in admin UI when we assigned the default password
      temporaryPassword: isDefaultPassword ? password : undefined,
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
        };
      }

      const created = await createTenantProfileOnly({
        ...data,
        email,
        firstName,
        lastName,
        userId: user.id,
      });
      return { tenantId: created.tenantId, userId: user.id, portalLoginSkipped: false };
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
    };
  }

  const created = await createTenantWithUser({
    ...data,
    email,
    firstName,
    lastName,
    // New portal logins from lease generation must change password + confirm profile
    profileCompleted: data.profileCompleted ?? false,
  });
  return {
    tenantId: created.tenantId,
    userId: created.userId,
    portalLoginSkipped: false,
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

