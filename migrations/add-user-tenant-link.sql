-- Migration: Link Users and Tenants Tables
-- This migration adds user_id foreign key to tenants table if it doesn't exist
-- and creates demo tenant data

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name='tenants' AND column_name='user_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX idx_tenants_user_id ON tenants(user_id);
  END IF;
END $$;

-- Ensure demo users exist
INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_active, email_verified)
VALUES 
  -- Admin user
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@parenta.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBB3jEy', -- password: admin123
    'admin',
    'Admin',
    'User',
    true,
    true
  ),
  -- Tenant user
  (
    '00000000-0000-0000-0000-000000000002',
    'tenant@parenta.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBB3jEy', -- password: tenant123
    'tenant',
    'John',
    'Doe',
    true,
    true
  ),
  -- Staff user
  (
    '00000000-0000-0000-0000-000000000003',
    'staff@parenta.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBB3jEy', -- password: staff123
    'staff',
    'Jane',
    'Smith',
    true,
    true
  )
ON CONFLICT (email) DO UPDATE
SET 
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

-- Create demo building if it doesn't exist
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
ON CONFLICT (id) DO NOTHING;

-- Create demo room if it doesn't exist
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
ON CONFLICT (id) DO NOTHING;

-- Ensure demo tenant exists with link to user
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
  '00000000-0000-0000-0000-000000000002', -- Links to tenant@parenta.com user
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
  tenant_status = EXCLUDED.tenant_status;

-- Create tenant room assignment
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
ON CONFLICT (id) DO NOTHING;

-- Create some sample payments for the demo tenant
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
VALUES 
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    15000.00,
    'rent',
    'bank_transfer',
    '2025-10-01',
    '2025-10-01',
    'paid',
    'REF-2025-10-001'
  ),
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    15000.00,
    'rent',
    'bank_transfer',
    '2025-09-01',
    '2025-09-01',
    'paid',
    'REF-2025-09-001'
  ),
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    15000.00,
    'rent',
    'bank_transfer',
    '2025-08-01',
    '2025-08-01',
    'paid',
    'REF-2025-08-001'
  ),
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    15000.00,
    'rent',
    'online',
    '2025-11-01',
    '2025-11-01',
    'pending',
    'REF-2025-11-001'
  )
ON CONFLICT DO NOTHING;

-- Verify the setup
SELECT 'Migration completed successfully!' as message;
SELECT 
  u.email as user_email,
  u.role,
  t.first_name || ' ' || t.last_name as tenant_name,
  t.tenant_status,
  t.email as tenant_email
FROM users u
LEFT JOIN tenants t ON t.user_id = u.id
WHERE u.email IN ('admin@parenta.com', 'tenant@parenta.com', 'staff@parenta.com')
ORDER BY u.role;

