-- Add advance payment, utility deposit, and deposit validity tracking to reservations

-- Add new columns to reservations table
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utility_deposit_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_valid_until DATE;

-- Comments for documentation
COMMENT ON COLUMN reservations.advance_amount IS 'Advance payment amount for reservation';
COMMENT ON COLUMN reservations.utility_deposit_amount IS 'Utility deposit amount for reservation';
COMMENT ON COLUMN reservations.deposit_valid_until IS 'Date until which deposit remains valid (reservation_date + validity days)';

-- Create index for deposit validity queries
CREATE INDEX IF NOT EXISTS idx_reservations_deposit_valid_until 
  ON reservations(deposit_valid_until) 
  WHERE deposit_valid_until IS NOT NULL;

