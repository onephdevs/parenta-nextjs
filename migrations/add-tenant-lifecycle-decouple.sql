-- Tenant lifecycle decouple: is_tenant flag, richer assignment snapshots,
-- forever history (tenant_id ON DELETE SET NULL), normalize 'past' → 'terminated'.

-- 1) is_tenant on people row (true only while currently renting)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS is_tenant BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenants.is_tenant IS
  'True while person has an active room assignment; false for pending/former. Person row is never deleted for history.';

-- Backfill from active assignments
UPDATE tenants t
SET is_tenant = true,
    tenant_status = CASE
      WHEN t.tenant_status IS NULL OR t.tenant_status = '' THEN 'active'
      WHEN t.tenant_status = 'pending' THEN 'active'
      ELSE t.tenant_status
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM tenant_room_assignments tra
  WHERE tra.tenant_id = t.id
    AND tra.assignment_status = 'active'
    AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
);

UPDATE tenants t
SET is_tenant = false,
    updated_at = CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM tenant_room_assignments tra
  WHERE tra.tenant_id = t.id
    AND tra.assignment_status = 'active'
    AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
)
AND t.is_tenant = true;

CREATE INDEX IF NOT EXISTS idx_tenants_is_tenant ON tenants(is_tenant);

-- 2) Richer contact snapshots on occupancy history (information is gold)
ALTER TABLE tenant_room_assignments
  ADD COLUMN IF NOT EXISTS tenant_phone_snapshot VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tenant_emergency_name_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tenant_emergency_phone_snapshot VARCHAR(50);

COMMENT ON COLUMN tenant_room_assignments.tenant_phone_snapshot IS
  'Phone at assignment time; survives tenant rename/unlink';
COMMENT ON COLUMN tenant_room_assignments.tenant_emergency_name_snapshot IS
  'Emergency contact name at assignment time';
COMMENT ON COLUMN tenant_room_assignments.tenant_emergency_phone_snapshot IS
  'Emergency contact phone at assignment time';

UPDATE tenant_room_assignments tra
SET
  tenant_phone_snapshot = COALESCE(tra.tenant_phone_snapshot, t.phone),
  tenant_emergency_name_snapshot = COALESCE(tra.tenant_emergency_name_snapshot, t.emergency_contact_name),
  tenant_emergency_phone_snapshot = COALESCE(tra.tenant_emergency_phone_snapshot, t.emergency_contact_phone),
  tenant_name_snapshot = COALESCE(
    NULLIF(tra.tenant_name_snapshot, ''),
    TRIM(CONCAT(COALESCE(t.first_name, ''), ' ', COALESCE(t.last_name, '')))
  ),
  tenant_email_snapshot = COALESCE(tra.tenant_email_snapshot, t.email)
FROM tenants t
WHERE t.id = tra.tenant_id;

-- 3) Normalize assignment_status drift ('past' → 'terminated')
DO $$
BEGIN
  -- Temporarily allow 'past' so we can update, then re-tighten
  ALTER TABLE tenant_room_assignments DROP CONSTRAINT IF EXISTS tenant_room_assignments_assignment_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

UPDATE tenant_room_assignments
SET assignment_status = 'terminated',
    updated_at = CURRENT_TIMESTAMP
WHERE assignment_status = 'past';

ALTER TABLE tenant_room_assignments
  DROP CONSTRAINT IF EXISTS tenant_room_assignments_assignment_status_check;

ALTER TABLE tenant_room_assignments
  ADD CONSTRAINT tenant_room_assignments_assignment_status_check
  CHECK (assignment_status IN ('active', 'terminated', 'pending'));

-- 4) Decouple history from tenant hard-delete: SET NULL instead of CASCADE
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'tenant_room_assignments'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'tenant_id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE tenant_room_assignments DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

-- Allow null tenant_id so history rows survive person removal
ALTER TABLE tenant_room_assignments
  ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE tenant_room_assignments
  ADD CONSTRAINT tenant_room_assignments_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
