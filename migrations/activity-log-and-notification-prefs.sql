-- Centralized activity log + notification preferences (Phase 3)
-- Also extends existing in-app notifications table

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(20) NOT NULL CHECK (actor_role IN ('admin', 'tenant', 'system')),
  action_type VARCHAR(80) NOT NULL,
  category VARCHAR(40) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID,
  entity_label VARCHAR(255),
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_category ON activity_log (category);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON activity_log (action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(40) NOT NULL,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
  ON notification_preferences (user_id);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category VARCHAR(40),
  ADD COLUMN IF NOT EXISTS link TEXT,
  ADD COLUMN IF NOT EXISTS related_activity_log_id UUID REFERENCES activity_log(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications (category);
CREATE INDEX IF NOT EXISTS idx_notifications_activity ON notifications (related_activity_log_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);

COMMENT ON TABLE activity_log IS 'Immutable recent-activity / audit feed for meaningful app actions';
COMMENT ON TABLE notification_preferences IS 'Per-user per-category in-app and email notification toggles';
