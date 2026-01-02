-- Add room_id support to expenses table
-- This allows expenses to be associated with a specific room/apartment

-- Step 1: Add room_id column (nullable, since expenses can be building-wide)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_room_id ON expenses(room_id);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN expenses.room_id IS 'Optional: Room/apartment this expense is for. If NULL, expense is for entire building.';
