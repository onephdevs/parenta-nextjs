-- Historical notes for tenants, rooms, properties, leases, payments, documents.
-- Append-only log with author attribution (not a single overwriteable text field).

CREATE TABLE IF NOT EXISTS entity_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(30) NOT NULL
    CHECK (
      entity_type IN (
        'tenant',
        'room',
        'building',
        'lease',
        'payment',
        'document'
      )
    ),
  entity_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_entity_notes_body_nonempty CHECK (char_length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_entity_notes_entity_created
  ON entity_notes (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entity_notes_created_by
  ON entity_notes (created_by_user_id);

COMMENT ON TABLE entity_notes IS
  'Append-only historical notes with author; entity_type + entity_id polymorphic link.';

-- One-time backfill from legacy single-field notes/descriptions
INSERT INTO entity_notes (entity_type, entity_id, body, created_by_user_id, created_at)
SELECT
  'tenant',
  t.id,
  trim(t.notes),
  NULL,
  COALESCE(t.updated_at, t.created_at, CURRENT_TIMESTAMP)
FROM tenants t
WHERE t.notes IS NOT NULL
  AND trim(t.notes) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM entity_notes en
    WHERE en.entity_type = 'tenant' AND en.entity_id = t.id AND en.body = trim(t.notes)
  );

INSERT INTO entity_notes (entity_type, entity_id, body, created_by_user_id, created_at)
SELECT
  'room',
  r.id,
  trim(r.description),
  NULL,
  COALESCE(r.updated_at, r.created_at, CURRENT_TIMESTAMP)
FROM rooms r
WHERE r.description IS NOT NULL
  AND trim(r.description) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM entity_notes en
    WHERE en.entity_type = 'room' AND en.entity_id = r.id AND en.body = trim(r.description)
  );

INSERT INTO entity_notes (entity_type, entity_id, body, created_by_user_id, created_at)
SELECT
  'building',
  b.id,
  trim(b.description),
  NULL,
  COALESCE(b.updated_at, b.created_at, CURRENT_TIMESTAMP)
FROM buildings b
WHERE b.description IS NOT NULL
  AND trim(b.description) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM entity_notes en
    WHERE en.entity_type = 'building' AND en.entity_id = b.id AND en.body = trim(b.description)
  );
