-- Room tenancy + asset location history snapshots
-- Uses existing tenant_room_assignments / asset_assignments (already historical).
-- Adds denormalized labels so history survives tenant/room renames or deletes.

-- PART 2: Tenant name snapshots on room assignments
ALTER TABLE tenant_room_assignments
  ADD COLUMN IF NOT EXISTS tenant_name_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tenant_email_snapshot VARCHAR(255);

-- Backfill from live tenant rows
UPDATE tenant_room_assignments tra
SET
  tenant_name_snapshot = TRIM(CONCAT(COALESCE(t.first_name, ''), ' ', COALESCE(t.last_name, ''))),
  tenant_email_snapshot = t.email
FROM tenants t
WHERE t.id = tra.tenant_id
  AND (
    tra.tenant_name_snapshot IS NULL
    OR tra.tenant_name_snapshot = ''
    OR tra.tenant_email_snapshot IS NULL
  );

-- PART 3: Room/building snapshots on asset assignments
ALTER TABLE asset_assignments
  ADD COLUMN IF NOT EXISTS room_number_snapshot VARCHAR(100),
  ADD COLUMN IF NOT EXISTS building_name_snapshot VARCHAR(255);

-- Fix inconsistent column usage: some code wrote end_date; canonical column is return_date
-- (no-op if end_date does not exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'asset_assignments' AND column_name = 'end_date'
  ) THEN
    UPDATE asset_assignments
    SET return_date = COALESCE(return_date, end_date::date)
    WHERE return_date IS NULL AND end_date IS NOT NULL;
  END IF;
END $$;

-- Backfill location labels from live rooms/buildings
UPDATE asset_assignments aa
SET
  room_number_snapshot = COALESCE(aa.room_number_snapshot, r.room_number),
  building_name_snapshot = COALESCE(aa.building_name_snapshot, b.name)
FROM rooms r
LEFT JOIN buildings b ON b.id = r.building_id
WHERE r.id = aa.room_id
  AND (aa.room_number_snapshot IS NULL OR aa.building_name_snapshot IS NULL);

-- Helpful indexes for history queries
CREATE INDEX IF NOT EXISTS idx_tenant_room_assignments_room_start
  ON tenant_room_assignments (room_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset_created
  ON asset_assignments (asset_id, created_at DESC);
