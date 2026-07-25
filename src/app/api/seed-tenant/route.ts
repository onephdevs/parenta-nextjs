import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/seed-tenant
 * Seeds demo tenant data with proper user-tenant link.
 * Locked to development + SEED_SECRET (x-seed-secret header).
 */
function isSeedAllowed(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  const expected = process.env.SEED_SECRET;
  if (!expected) {
    return false;
  }
  return request.headers.get('x-seed-secret') === expected;
}

export async function POST(request: NextRequest) {
  if (!isSeedAllowed(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Seed endpoint disabled',
        details:
          'Only available in development when SEED_SECRET is set and sent as x-seed-secret header',
      },
      { status: 403 }
    );
  }

  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting tenant-user link seeding...');
    
    await client.query('BEGIN');
    
    //1. Create demo users
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
    
    // 2. Ensure user_id column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tenants' AND column_name='user_id'
    `);
    
    if (columnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE tenants ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id)
      `);
    }
    
    // 3. Create demo building
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
    
    // 4. Create demo room
    await client.query(`
      INSERT INTO rooms (id, building_id, room_number, floor_number, room_type, square_footage, monthly_rate, room_status, is_active)
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
    
    // 5. Create demo tenant profile (linked to user)
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
    
    // 6. Create room assignment
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
    
    // 7. Create sample payments
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
    }
    
    await client.query('COMMIT');
    
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
    
    return NextResponse.json({
      success: true,
      message: 'Demo tenant data seeded successfully',
      data: {
        users: ['admin@parenta.com', 'tenant@parenta.com'],
        verification: verify.rows[0],
        credentials: {
          admin: {
            email: 'admin@parenta.com',
            password: 'admin123'
          },
          tenant: {
            email: 'tenant@parenta.com',
            password: 'tenant123'
          }
        }
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding tenant:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed tenant data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

