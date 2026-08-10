-- Align maintenance_requests.assigned_to with pipeline_cards.assigned_to (users.id UUID).

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Best-effort map legacy free-text names to admin/staff users
UPDATE maintenance_requests mr
SET assigned_to_user_id = u.id
FROM users u
WHERE mr.assigned_to_user_id IS NULL
  AND mr.assigned_to IS NOT NULL
  AND TRIM(mr.assigned_to) <> ''
  AND u.is_active = true
  AND u.role IN ('admin', 'staff')
  AND (
    lower(trim(mr.assigned_to)) = lower(trim(concat_ws(' ', u.first_name, u.last_name)))
    OR lower(trim(mr.assigned_to)) = lower(trim(u.email))
    OR lower(trim(mr.assigned_to)) = lower(trim(u.first_name))
  );

-- Prefer board card assignee when linked
UPDATE maintenance_requests mr
SET assigned_to_user_id = pc.assigned_to
FROM pipeline_cards pc
INNER JOIN pipeline_boards pb ON pb.id = pc.board_id AND pb.slug = 'maintenance'
WHERE pc.maintenance_request_id = mr.id
  AND pc.assigned_to IS NOT NULL
  AND (
    mr.assigned_to_user_id IS NULL
    OR mr.assigned_to_user_id IS DISTINCT FROM pc.assigned_to
  );

-- Drop legacy VARCHAR assigned_to if present, then rename UUID column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'maintenance_requests'
      AND column_name = 'assigned_to'
      AND data_type IN ('character varying', 'text')
  ) THEN
    ALTER TABLE maintenance_requests DROP COLUMN assigned_to;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'maintenance_requests'
      AND column_name = 'assigned_to_user_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'maintenance_requests'
      AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE maintenance_requests RENAME COLUMN assigned_to_user_id TO assigned_to;
  END IF;
END $$;

-- If both somehow exist and assigned_to is still varchar, fall through handled above.
-- Ensure UUID column named assigned_to exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'maintenance_requests'
      AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE maintenance_requests
      ADD COLUMN assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_to
  ON maintenance_requests (assigned_to);

-- Push request assignee onto linked cards when card is unassigned
UPDATE pipeline_cards pc
SET assigned_to = mr.assigned_to,
    updated_at = CURRENT_TIMESTAMP
FROM maintenance_requests mr, pipeline_boards pb
WHERE pc.maintenance_request_id = mr.id
  AND pb.id = pc.board_id
  AND pb.slug = 'maintenance'
  AND mr.assigned_to IS NOT NULL
  AND pc.assigned_to IS NULL;

COMMENT ON COLUMN maintenance_requests.assigned_to IS
  'Assigned admin/staff user id; kept in sync with maintenance board card assignee.';
