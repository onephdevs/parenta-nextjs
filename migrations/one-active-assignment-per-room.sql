-- One current lease per room (and per tenant). Duplicate active rows made
-- the property page JOIN render the same room twice.

-- Keep the newest active assignment per room.
UPDATE tenant_room_assignments
SET
  assignment_status = 'terminated',
  end_date = CURRENT_DATE,
  updated_at = CURRENT_TIMESTAMP
WHERE assignment_status = 'active'
  AND id NOT IN (
    SELECT DISTINCT ON (room_id) id
    FROM tenant_room_assignments
    WHERE assignment_status = 'active'
    ORDER BY room_id, created_at DESC NULLS LAST, id DESC
  );

-- Keep the newest active assignment per tenant.
UPDATE tenant_room_assignments
SET
  assignment_status = 'terminated',
  end_date = CURRENT_DATE,
  updated_at = CURRENT_TIMESTAMP
WHERE assignment_status = 'active'
  AND id NOT IN (
    SELECT DISTINCT ON (tenant_id) id
    FROM tenant_room_assignments
    WHERE assignment_status = 'active'
    ORDER BY tenant_id, created_at DESC NULLS LAST, id DESC
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_tra_one_active_per_room
  ON tenant_room_assignments (room_id)
  WHERE assignment_status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS uq_tra_one_active_per_tenant
  ON tenant_room_assignments (tenant_id)
  WHERE assignment_status = 'active';
