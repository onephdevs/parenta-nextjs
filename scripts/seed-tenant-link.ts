/**
 * Seed script to ensure demo tenant is properly linked to user account
 * Run with: npx tsx scripts/seed-tenant-link.ts
 */

import pool from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function seedTenantLink() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting tenant-user link seeding...\n');
    
    await client.query('BEGIN');
    
    // 1. Ensure demo users exist
    console.log('1️⃣  Creating demo users...');
    
    const passwordHash = await bcrypt.hash('tenant123', 12);
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    
    // Admin user
    await client.query(`
      INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_active, email_verified)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'admin@parenta.com',
        $1,
        'admin',
        'Admin',
        'User',
        true,
        true
      )
      ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash
    `, [adminPasswordHash]);
    
    console.log('   ✅ Admin user: admin@parenta.com');
    
    // Tenant user
    await client.query(`
      INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_active, email_verified)
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        'tenant@parenta.com',
        $1,
        'tenant',
        'John',
        'Doe',
        true,
        true
      )
      ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash
    `, [passwordHash]);
    
    console.log('   ✅ Tenant user: tenant@parenta.com / tenant123\n');
    
    // 2. Ensure demo building exists
    console.log('2️⃣  Creating demo building...');
    
    await client.query(`
      INSERT INTO buildings (id, name, address_line1, city, state, postal_code, country, description, total_units, is_active)
      VALUES (
        '10000000-0000-0000-0000-000000000001',
        'Sunrise Residences',
        '123 Main Street',
        'Manila',
        'Metro Manila',
        '1000',
        'Philippines',
        'Modern residential building in the heart of Manila',
        10,
        true
      )
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('   ✅ Building: Sunrise Residences\n');
    
    // 3. Ensure demo room exists
    console.log('3️⃣  Creating demo room...');
    
    await client.query(`
      INSERT INTO rooms (id, building_id, room_number, floor_number, room_type, square_footage, monthly_rent, room_status, is_active)
      VALUES (
        '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        '201A',
        2,
        'studio',
        450.00,
        15000.00,
        'occupied',
        true
      )
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('   ✅ Room: 201A\n');
    
    // 4. Ensure user_id column exists in tenants table
    console.log('4️⃣  Checking tenants table schema...');
    
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tenants' AND column_name='user_id'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('   ⚠️  Adding user_id column to tenants table...');
      await client.query(`
        ALTER TABLE tenants ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id)
      `);
      console.log('   ✅ user_id column added');
    } else {
      console.log('   ✅ user_id column already exists');
    }
    
    console.log('');
    
    // 5. Create/update demo tenant profile
    console.log('5️⃣  Creating demo tenant profile...');
    
    await client.query(`
      INSERT INTO tenants (
        id,
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
      )
      VALUES (
        '30000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
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
        '2024-01-01',
        '2025-12-31',
        true
      )
      ON CONFLICT (id) DO UPDATE
      SET 
        user_id = EXCLUDED.user_id,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        security_deposit = EXCLUDED.security_deposit,
        tenant_status = EXCLUDED.tenant_status
    `);
    
    console.log('   ✅ Tenant profile: John Doe (linked to tenant@parenta.com)\n');
    
    // 6. Create tenant room assignment
    console.log('6️⃣  Creating room assignment...');
    
    await client.query(`
      INSERT INTO tenant_room_assignments (
        id,
        tenant_id,
        room_id,
        start_date,
        end_date,
        monthly_rate,
        deposit_paid,
        assignment_status,
        notes
      )
      VALUES (
        '40000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        '2024-01-01',
        '2025-12-31',
        15000.00,
        30000.00,
        'active',
        'Demo tenant assignment'
      )
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('   ✅ Assignment: John Doe → Room 201A\n');
    
    // 7. Create sample payments
    console.log('7️⃣  Creating sample payments...');
    
    const payments = [
      { month: '2025-10-01', status: 'paid', ref: 'REF-2025-10-001' },
      { month: '2025-09-01', status: 'paid', ref: 'REF-2025-09-001' },
      { month: '2025-08-01', status: 'paid', ref: 'REF-2025-08-001' },
      { month: '2025-11-01', status: 'pending', ref: 'REF-2025-11-001' },
    ];
    
    for (const payment of payments) {
      await client.query(`
        INSERT INTO payments (
          tenant_id,
          room_id,
          assignment_id,
          amount,
          payment_type,
          payment_method,
          payment_date,
          due_date,
          payment_status,
          reference_number
        )
        VALUES (
          '30000000-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000001',
          '40000000-0000-0000-0000-000000000001',
          15000.00,
          'rent',
          'bank_transfer',
          $1,
          $1,
          $2,
          $3
        )
        ON CONFLICT DO NOTHING
      `, [payment.month, payment.status, payment.ref]);
      
      console.log(`   ✅ Payment: ${payment.month} - ${payment.status}`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Seeding completed successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Demo Credentials:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Admin:  admin@parenta.com  / admin123');
    console.log('Tenant: tenant@parenta.com / tenant123');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Verify the link
    const verify = await client.query(`
      SELECT 
        u.email as user_email,
        u.role,
        t.first_name || ' ' || t.last_name as tenant_name,
        t.tenant_status,
        r.room_number,
        b.name as building_name
      FROM users u
      INNER JOIN tenants t ON t.user_id = u.id
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE u.email = 'tenant@parenta.com'
    `);
    
    if (verify.rows.length > 0) {
      const row = verify.rows[0];
      console.log('✅ Verification: User-Tenant Link Active');
      console.log(`   User: ${row.user_email}`);
      console.log(`   Tenant: ${row.tenant_name}`);
      console.log(`   Status: ${row.tenant_status}`);
      console.log(`   Room: ${row.room_number}`);
      console.log(`   Building: ${row.building_name}\n`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed function
seedTenantLink()
  .then(() => {
    console.log('🎉 Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });

