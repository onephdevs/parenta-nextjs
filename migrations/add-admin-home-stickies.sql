-- Personal scratch-pad notes on the admin Home page (not entity-attached).

CREATE TABLE IF NOT EXISTS admin_home_stickies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'lavender',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_home_stickies_color_chk'
      AND conrelid = 'admin_home_stickies'::regclass
  ) THEN
    ALTER TABLE admin_home_stickies
      ADD CONSTRAINT admin_home_stickies_color_chk
      CHECK (color IN ('lavender', 'sky', 'pink', 'mint', 'peach'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS admin_home_stickies_user_id_idx
  ON admin_home_stickies (user_id, sort_order, created_at);

COMMENT ON TABLE admin_home_stickies IS
  'Per-user home-page stickies: reminders and notes not attached to a tenant or room.';
