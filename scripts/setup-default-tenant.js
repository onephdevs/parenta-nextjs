/**
 * Setup Default Tenant Script
 * Creates tenant profile for tenant@parenta.com and assigns to unoccupied room
 * 
 * Usage: node scripts/setup-default-tenant.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupDefaultTenant() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up default tenant...\n');
    
    await client.query('BEGIN');

    // 1. Find or create user account for tenant@parenta.com
    const userResult = await client.query(
      `SELECT id, email, role FROM users WHERE email = $1 AND role = 'tenant'`,
      ['tenant@parenta.com']
    );

    let userId;
    if (userResult.rows.length === 0) {
      console.log('📝 Creating user account for tenant@parenta.com...');
      const passwordHash = await bcrypt.hash('tenant123', 12);
      
      const newUserResult = await client.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email`,
        ['tenant@parenta.com', passwordHash, 'tenant', 'John', 'Doe', true, true]
      );
      userId = newUserResult.rows[0].id;
      console.log(`✅ User created: ${newUserResult.rows[0].email} (ID: ${userId})\n`);
    } else {
      userId = userResult.rows[0].id;
      console.log(`✅ User exists: ${userResult.rows[0].email} (ID: ${userId})\n`);
    }

    // 2. Check if tenant profile already exists
    const existingTenant = await client.query(
      `SELECT id, user_id, first_name, last_name FROM tenants WHERE email = $1`,
      ['tenant@parenta.com']
    );

    let tenantId;

    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].id;
      console.log(`📋 Tenant profile exists: ${existingTenant.rows[0].first_name} ${existingTenant.rows[0].last_name} (ID: ${tenantId})`);
      
      // Link user to tenant if not already linked
      if (!existingTenant.rows[0].user_id) {
        console.log('🔗 Linking user to tenant profile...');
        await client.query(
          `UPDATE tenants SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [userId, tenantId]
        );
        console.log('✅ User linked to tenant profile\n');
      } else {
        console.log('✅ User already linked to tenant profile\n');
      }
    } else {
      // 3. Create tenant profile
      console.log('📝 Creating tenant profile...');
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
        RETURNING id, first_name, last_name`,
        [
          userId,
          'John',
          'Doe',
          'tenant@parenta.com',
          '+63 917 123 4567',
          '1990-05-15',
          'Jane Doe',
          '+63 917 765 4321',
          'Spouse',
          'Employed',
          'Tech Corp Inc.',
          45000.00,
          30000.00,
          'active',
          new Date().toISOString().split('T')[0],
          new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          true
        ]
      );
      tenantId = tenantResult.rows[0].id;
      console.log(`✅ Tenant profile created: ${tenantResult.rows[0].first_name} ${tenantResult.rows[0].last_name} (ID: ${tenantId})\n`);
    }

    // 4. Check if tenant already has an active assignment
    const existingAssignment = await client.query(
      `SELECT tra.id, r.room_number, b.name as building_name
       FROM tenant_room_assignments tra
       INNER JOIN rooms r ON tra.room_id = r.id
       INNER JOIN buildings b ON r.building_id = b.id
       WHERE tra.tenant_id = $1 AND tra.assignment_status = 'active'`,
      [tenantId]
    );

    if (existingAssignment.rows.length > 0) {
      const assignment = existingAssignment.rows[0];
      console.log(`✅ Tenant already assigned to room: ${assignment.room_number} in ${assignment.building_name}\n`);
      await client.query('COMMIT');
      
      return {
        success: true,
        message: 'Tenant already set up',
        data: {
          userId,
          tenantId,
          roomNumber: assignment.room_number,
          buildingName: assignment.building_name
        }
      };
    }

    // 5. Find an unoccupied room
    console.log('🔍 Looking for unoccupied room...');
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

    let roomId, roomNumber, monthlyRate, buildingName;

    if (roomResult.rows.length === 0) {
      // No vacant rooms - create a demo building and room
      console.log('⚠️  No vacant rooms found. Creating demo building and room...');
      
      const buildingResult = await client.query(
        `INSERT INTO buildings (name, address_line1, city, state, postal_code, country, description, total_units, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name`,
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

      let buildingId;
      if (buildingResult.rows.length > 0) {
        buildingId = buildingResult.rows[0].id;
        buildingName = buildingResult.rows[0].name;
      } else {
        // Get existing building
        const existingBuilding = await client.query(
          `SELECT id, name FROM buildings WHERE name = $1 LIMIT 1`,
          ['Sunrise Residences']
        );
        buildingId = existingBuilding.rows[0].id;
        buildingName = existingBuilding.rows[0].name;
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

      roomId = newRoomResult.rows[0].id;
      roomNumber = newRoomResult.rows[0].room_number;
      monthlyRate = parseFloat(newRoomResult.rows[0].monthly_rate);
      console.log(`✅ Created room: ${roomNumber} in ${buildingName} (Rate: ₱${monthlyRate.toLocaleString()})\n`);
    } else {
      const room = roomResult.rows[0];
      roomId = room.id;
      roomNumber = room.room_number;
      monthlyRate = parseFloat(room.monthly_rate);
      buildingName = room.building_name;
      console.log(`✅ Found room: ${roomNumber} in ${buildingName} (Rate: ₱${monthlyRate.toLocaleString()})\n`);
    }

    // 6. Assign tenant to the room
    console.log('🔗 Assigning tenant to room...');
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
      `UPDATE rooms SET room_status = 'occupied', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [roomId]
    );

    console.log(`✅ Tenant assigned to room: ${roomNumber}\n`);

    await client.query('COMMIT');

    const result = {
      success: true,
      message: 'Default tenant created and assigned to room',
      data: {
        userId,
        tenantId,
        roomId,
        roomNumber,
        buildingName,
        monthlyRate
      }
    };

    console.log('✅ Setup complete!\n');
    console.log('📊 Summary:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Room: ${roomNumber} in ${buildingName}`);
    console.log(`   Monthly Rate: ₱${monthlyRate.toLocaleString()}\n`);
    console.log('🔐 Login credentials:');
    console.log('   Email: tenant@parenta.com');
    console.log('   Password: tenant123\n');

    return result;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up default tenant:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
setupDefaultTenant()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
