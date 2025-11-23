-- Add occupants table for non-tenant occupants (relatives, etc.)
CREATE TABLE IF NOT EXISTS occupants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- Link to primary tenant if applicable
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  relationship_to_tenant VARCHAR(100), -- e.g., "spouse", "child", "parent", "relative", "other"
  date_of_birth DATE,
  phone VARCHAR(20),
  email VARCHAR(255),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),
  move_in_date DATE NOT NULL,
  move_out_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_occupants_room_id ON occupants(room_id);
CREATE INDEX IF NOT EXISTS idx_occupants_tenant_id ON occupants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_occupants_active ON occupants(is_active) WHERE is_active = true;

