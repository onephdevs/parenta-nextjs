-- Enhance utility_bills for per-unit metering and allocation
-- Supports unit-specific bills, building-wide (common area), and split methods

-- Meter readings (optional — for PER_UNIT_METERED tracking)
ALTER TABLE utility_bills
ADD COLUMN IF NOT EXISTS meter_reading_previous NUMERIC(12, 2);

ALTER TABLE utility_bills
ADD COLUMN IF NOT EXISTS meter_reading_current NUMERIC(12, 2);

-- How a building-wide bill maps to units (or stands alone)
-- per_unit_metered | split_evenly | flat
ALTER TABLE utility_bills
ADD COLUMN IF NOT EXISTS allocation_method VARCHAR(30) DEFAULT 'per_unit_metered';

-- Parent bill when this row is a per-unit slice of a building-wide bill
ALTER TABLE utility_bills
ADD COLUMN IF NOT EXISTS parent_bill_id UUID REFERENCES utility_bills(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_utility_bills_allocation_method
  ON utility_bills(allocation_method);

CREATE INDEX IF NOT EXISTS idx_utility_bills_parent_bill
  ON utility_bills(parent_bill_id);

COMMENT ON COLUMN utility_bills.meter_reading_previous IS 'Optional previous meter reading for usage calc';
COMMENT ON COLUMN utility_bills.meter_reading_current IS 'Optional current meter reading for usage calc';
COMMENT ON COLUMN utility_bills.allocation_method IS 'per_unit_metered | split_evenly | flat';
COMMENT ON COLUMN utility_bills.parent_bill_id IS 'When set, this bill is a per-unit allocation of the parent building-wide bill';

-- Backfill: unit-specific bills are metered; building-wide without room default to flat
UPDATE utility_bills
SET allocation_method = 'per_unit_metered'
WHERE room_id IS NOT NULL
  AND (allocation_method IS NULL OR allocation_method = '');

UPDATE utility_bills
SET allocation_method = 'flat'
WHERE room_id IS NULL
  AND (allocation_method IS NULL OR allocation_method = 'per_unit_metered');
