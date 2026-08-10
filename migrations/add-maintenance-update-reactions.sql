-- Tenant/admin replies + reactions on maintenance progress thread.

-- Allow update_type = 'reply' (tenant/admin comments in the thread)
ALTER TABLE maintenance_request_updates
  DROP CONSTRAINT IF EXISTS maintenance_request_updates_update_type_check;

ALTER TABLE maintenance_request_updates
  ADD CONSTRAINT maintenance_request_updates_update_type_check
  CHECK (
    update_type IN (
      'progress',
      'status_change',
      'acknowledgement',
      'feedback',
      'closed',
      'reply'
    )
  );

CREATE TABLE IF NOT EXISTS maintenance_update_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL
    REFERENCES maintenance_request_updates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  reaction VARCHAR(20) NOT NULL
    CHECK (reaction IN ('like', 'heart')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (update_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mur_update
  ON maintenance_update_reactions (update_id);

CREATE INDEX IF NOT EXISTS idx_mur_user
  ON maintenance_update_reactions (user_id);

COMMENT ON TABLE maintenance_update_reactions IS
  'One like/heart reaction per user per maintenance thread message.';
