-- Username login + optional email + first-login profile completion
-- Safe to re-run.

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT true;

-- Existing users keep email; new portal accounts may omit email until first login.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE tenants ALTER COLUMN email DROP NOT NULL;

-- Backfill username from email local-part where missing (best-effort).
UPDATE users
SET username = split_part(email, '@', 1)
WHERE username IS NULL
  AND email IS NOT NULL
  AND position('@' in email) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
  ON users (lower(username))
  WHERE username IS NOT NULL;
