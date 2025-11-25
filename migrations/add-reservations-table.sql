-- Reservations table for room reservation management
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  monthly_rate DECIMAL(10,2) NOT NULL,
  reservation_deposit DECIMAL(10,2) DEFAULT 0,
  deposit_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  reservation_status VARCHAR(20) DEFAULT 'active' 
    CHECK (reservation_status IN ('active', 'converted', 'expired', 'cancelled')),
  converted_to_assignment_id UUID REFERENCES tenant_room_assignments(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_id ON reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(reservation_status);
CREATE INDEX IF NOT EXISTS idx_reservations_expiry_date ON reservations(expiry_date);
CREATE INDEX IF NOT EXISTS idx_reservations_reservation_date ON reservations(reservation_date);

