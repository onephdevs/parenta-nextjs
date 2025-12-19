import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { linkUserToTenant } from '@/lib/api/tenant-user-link';

/**
 * POST /api/tenant/setup-default
 * Creates default tenant profile for existing user and assigns to unoccupied room
 * Admin only
 */
export async function POST() {
  const client = await pool.connect();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await client.query('BEGIN');

    // 1. Find or create user account for tenant@parenta.com
    const userResult = await client.query(
      `SELECT id, email, role FROM users WHERE email = $1 AND role = 'tenant'`,
      ['tenant@parenta.com']
    );

    let userId: string;
    if (userResult.rows.length === 0) {
      // Create user if doesn't exist
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.default.hash('tenant123', 12);
      
      const newUserResult = await client.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        ['tenant@parenta.com', passwordHash, 'tenant', 'John', 'Doe', true, true]
      );
      userId = newUserResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // 2. Check if tenant profile already exists
    const existingTenant = await client.query(
      `SELECT id, user_id FROM tenants WHERE email = $1`,
      ['tenant@parenta.com']
    );

    let tenantId: string;

    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].id;
      
      // Link user to tenant if not already linked
      if (!existingTenant.rows[0].user_id) {
        await linkUserToTenant(userId, tenantId);
      }
    } else {
      // 3. Create tenant profile
      const tenantResult = await client.query(
        `INSERT INTO tenants (
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
          security_deposit,
          tenant_status,
          lease_start_date,
          lease_end_date,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id`,
        [
          userId, // user_id
          'John', // first_name
          'Doe', // last_name
          'tenant@parenta.com', // email
          '+63 917 123 4567', // phone
          '1990-05-15', // date_of_birth
          'Jane Doe', // emergency_contact_name
          '+63 917 765 4321', // emergency_contact_phone
          'Spouse', // emergency_contact_relationship
          'Employed', // employment_status
          'Tech Corp Inc.', // employer_name
          45000.00, // monthly_income
          30000.00, // security_deposit
          'active', // tenant_status
          new Date().toISOString().split('T')[0], // lease_start_date (today)
          new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // lease_end_date (1 year from now)
          true // is_active
        ]
      );
      tenantId = tenantResult.rows[0].id;
    }

    // 4. Find an unoccupied room
    const roomResult = await client.query(
      `SELECT r.id, r.room_number, r.building_id, r.monthly_rate, b.name as building_name
       FROM rooms r
       INNER JOIN buildings b ON r.building_id = b.id
       WHERE r.room_status = 'vacant'
         AND r.is_active = true
         AND b.is_active = true
       ORDER BY r.created_at ASC
       LIMIT 1`
    );

    if (roomResult.rows.length === 0) {
      // No vacant rooms - create a demo building and room
      const buildingResult = await client.query(
        `INSERT INTO buildings (name, address_line1, city, state, postal_code, country, description, total_units, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          'Sunrise Residences',
          '123 Main Street',
          'Manila',
          'Metro Manila',
          '1000',
          'Philippines',
          'Modern residential building',
          10,
          true
        ]
      );

      let buildingId: string;
      if (buildingResult.rows.length > 0) {
        buildingId = buildingResult.rows[0].id;
      } else {
        // Get existing building
        const existingBuilding = await client.query(
          `SELECT id FROM buildings WHERE name = $1 LIMIT 1`,
          ['Sunrise Residences']
        );
        buildingId = existingBuilding.rows[0].id;
      }

      // Create a room
      const newRoomResult = await client.query(
        `INSERT INTO rooms (building_id, room_number, floor_number, room_type, square_footage, monthly_rate, room_status, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, room_number, monthly_rate`,
        [
          buildingId,
          '201A',
          2,
          'studio',
          450.00,
          15000.00,
          'vacant',
          true
        ]
      );

      const roomId = newRoomResult.rows[0].id;
      const roomNumber = newRoomResult.rows[0].room_number;
      const monthlyRate = parseFloat(newRoomResult.rows[0].monthly_rate);

      // Assign tenant to room
      await client.query(
        `INSERT INTO tenant_room_assignments (
          tenant_id,
          room_id,
          start_date,
          monthly_rate,
          deposit_paid,
          advance_paid,
          assignment_status,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING`,
        [
          tenantId,
          roomId,
          new Date().toISOString().split('T')[0],
          monthlyRate,
          30000.00, // deposit_paid
          15000.00, // advance_paid (1 month)
          'active',
          'Default tenant assignment'
        ]
      );

      // Update room status
      await client.query(
        `UPDATE rooms SET room_status = 'occupied' WHERE id = $1`,
        [roomId]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Default tenant created and assigned to room',
        data: {
          userId,
          tenantId,
          roomId,
          roomNumber,
          buildingName: 'Sunrise Residences',
          monthlyRate
        }
      });
    }

    // 5. Assign tenant to the found unoccupied room
    const room = roomResult.rows[0];
    const roomId = room.id;
    const roomNumber = room.room_number;
    const monthlyRate = parseFloat(room.monthly_rate);

    // Check if assignment already exists
    const existingAssignment = await client.query(
      `SELECT id FROM tenant_room_assignments 
       WHERE tenant_id = $1 AND room_id = $2 AND assignment_status = 'active'`,
      [tenantId, roomId]
    );

    if (existingAssignment.rows.length === 0) {
      // Create assignment
      await client.query(
        `INSERT INTO tenant_room_assignments (
          tenant_id,
          room_id,
          start_date,
          monthly_rate,
          deposit_paid,
          advance_paid,
          assignment_status,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          tenantId,
          roomId,
          new Date().toISOString().split('T')[0],
          monthlyRate,
          30000.00, // deposit_paid
          15000.00, // advance_paid (1 month)
          'active',
          'Default tenant assignment'
        ]
      );

      // Update room status to occupied
      await client.query(
        `UPDATE rooms SET room_status = 'occupied' WHERE id = $1`,
        [roomId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Default tenant created and assigned to room',
      data: {
        userId,
        tenantId,
        roomId,
        roomNumber,
        buildingName: room.building_name,
        monthlyRate
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up default tenant:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to setup default tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
