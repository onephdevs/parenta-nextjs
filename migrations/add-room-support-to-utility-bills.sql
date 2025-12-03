-- Add room_id support to utility_bills table
-- This allows utility bills to be associated with specific rooms/apartments
-- Bills can be room-specific (electric/water per room) or building-wide

-- Step 1: Add room_id column (nullable, since bills can be building-wide)
ALTER TABLE utility_bills
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- Step 2: Make building_id nullable (bills can be room-specific or building-wide)
-- First, ensure all existing bills have a building_id
UPDATE utility_bills
SET building_id = building_id
WHERE building_id IS NULL;

-- Now make it nullable
ALTER TABLE utility_bills
ALTER COLUMN building_id DROP NOT NULL;

-- Step 3: Add constraint to ensure either building_id or room_id is set
ALTER TABLE utility_bills
ADD CONSTRAINT check_building_or_room 
CHECK (building_id IS NOT NULL OR room_id IS NOT NULL);

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_utility_bills_room_id ON utility_bills(room_id);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN utility_bills.room_id IS 'Optional: Room/apartment this bill is for. If NULL, bill is for entire building.';
COMMENT ON COLUMN utility_bills.building_id IS 'Building this bill is for. Can be NULL if bill is room-specific.';
