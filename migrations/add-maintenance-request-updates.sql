-- Progress updates / replies on maintenance tickets (admin ↔ tenant).
-- One optional photo per update; rating used for tenant feedback.

CREATE TABLE IF NOT EXISTS maintenance_request_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL
    REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  author_role VARCHAR(20) NOT NULL
    CHECK (author_role IN ('admin', 'staff', 'tenant', 'system')),
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT NOT NULL DEFAULT '',
  update_type VARCHAR(30) NOT NULL DEFAULT 'progress'
    CHECK (
      update_type IN (
        'progress',
        'status_change',
        'acknowledgement',
        'feedback',
        'closed'
      )
    ),
  rating INTEGER
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  photo_file_name TEXT,
  photo_file_path TEXT,
  photo_mime_type TEXT,
  photo_file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mru_request_created
  ON maintenance_request_updates (maintenance_request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mru_author_user
  ON maintenance_request_updates (author_user_id);

COMMENT ON TABLE maintenance_request_updates IS
  'Append-only progress notes, photos, acknowledgements, and feedback on a maintenance ticket.';

-- Rename maintenance board first stage label: Submitted → Open
UPDATE pipeline_stages ps
SET name = 'Open'
FROM pipeline_boards pb
WHERE ps.board_id = pb.id
  AND pb.slug = 'maintenance'
  AND ps.slug = 'submitted'
  AND ps.name IS DISTINCT FROM 'Open';
