/**
 * Tenant-User Link Management
 * Handles the connection between user accounts (authentication) and tenant profiles (property management)
 */

import pool from '@/lib/db';
import { createUser } from '@/lib/db';
import type { CreateUserData } from '@/types/auth.types';
import bcrypt from 'bcryptjs';

export interface CreateTenantWithUserData {
  // User account fields
  email: string;
  password?: string; // Optional: if not provided, generates a random password
  sendInvitation?: boolean; // If true, sends invitation email to set password
  
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
export async function createTenantWithUser(data: CreateTenantWithUserData): Promise<{ userId: string; tenantId: string }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Generate password if not provided
    const password = data.password || generateRandomPassword();
    
    // Create user account
    const userData: CreateUserData = {
      email: data.email.toLowerCase().trim(),
      password,
      role: 'tenant',
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
    };
    
    const user = await createUser(userData);
    
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
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id
    `;
    
    const tenantValues = [
      user.id, // user_id
      data.firstName.trim(),
      data.lastName.trim(),
      data.email.toLowerCase().trim(),
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
      'pending', // Default status
      data.notes || null,
      true,
    ];
    
    const tenantResult = await client.query(tenantQuery, tenantValues);
    const tenantId = tenantResult.rows[0].id;
    
    await client.query('COMMIT');
    
    // TODO: Send invitation email if requested
    if (data.sendInvitation) {
      // Implementation for sending invitation email
      console.log(`Invitation email would be sent to ${data.email} with password: ${password}`);
    }
    
    return {
      userId: user.id,
      tenantId,
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
    throw new Error(`Failed to fetch tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      
      -- Current assignment
      tra.id as assignment_id,
      tra.start_date as assignment_start,
      tra.end_date as assignment_end,
      tra.monthly_rate,
      tra.deposit_paid,
      tra.advance_paid,
      tra.utility_deposit_paid,
      tra.deposit_valid_until,
      tra.deposit_refundable,
      
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
    LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
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
 * Generates a random secure password
 */
function generateRandomPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
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

