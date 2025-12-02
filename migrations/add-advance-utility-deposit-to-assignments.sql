-- Add advance payment, utility deposit, and deposit validity tracking to tenant_room_assignments

-- Add new columns to tenant_room_assignments table
ALTER TABLE tenant_room_assignments
  ADD COLUMN IF NOT EXISTS advance_paid DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utility_deposit_paid DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_valid_until DATE,
  ADD COLUMN IF NOT EXISTS deposit_refundable BOOLEAN DEFAULT true;

-- Comments for documentation
COMMENT ON COLUMN tenant_room_assignments.advance_paid IS 'Advance payment amount paid at assignment start';
COMMENT ON COLUMN tenant_room_assignments.utility_deposit_paid IS 'Utility deposit amount paid at assignment start';
COMMENT ON COLUMN tenant_room_assignments.deposit_valid_until IS 'Date until which deposit remains valid (assignment start date + validity days)';
COMMENT ON COLUMN tenant_room_assignments.deposit_refundable IS 'Whether deposit is refundable (false if deposit_valid_until has passed)';

-- Create index for deposit validity queries
CREATE INDEX IF NOT EXISTS idx_tenant_room_assignments_deposit_valid_until 
  ON tenant_room_assignments(deposit_valid_until) 
  WHERE deposit_valid_until IS NOT NULL;

