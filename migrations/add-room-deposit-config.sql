-- Add deposit configuration columns to rooms table
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_type VARCHAR(20) DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS deposit_percentage DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN rooms.deposit_required IS 'Whether a deposit is required to reserve this room';
COMMENT ON COLUMN rooms.deposit_type IS 'Type of deposit: fixed, percentage, or one_month';
COMMENT ON COLUMN rooms.deposit_amount IS 'Fixed deposit amount (used when deposit_type = fixed)';
COMMENT ON COLUMN rooms.deposit_percentage IS 'Percentage of monthly rent for deposit (used when deposit_type = percentage)';

-- Create index for filtering rooms by deposit requirement
CREATE INDEX IF NOT EXISTS idx_rooms_deposit_required ON rooms(deposit_required) WHERE deposit_required = true;

-- Update existing rooms to have reasonable defaults
-- Set deposit to one month's rent for all existing rooms
UPDATE rooms
SET 
  deposit_required = true,
  deposit_type = 'one_month',
  deposit_amount = NULL,
  deposit_percentage = NULL
WHERE deposit_required IS NULL;

