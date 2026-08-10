-- Denormalized author display name so notes keep attribution even if the user row changes.
ALTER TABLE entity_notes
  ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(200);

COMMENT ON COLUMN entity_notes.created_by_name IS
  'Display name captured at write time (session first/last/email).';
