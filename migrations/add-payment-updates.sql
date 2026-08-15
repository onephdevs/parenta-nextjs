-- Conversation on a tenant payment claim (admin ↔ tenant).
-- Used while a receipt awaits office verification, and after confirm/reject.

CREATE TABLE IF NOT EXISTS payment_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL
    REFERENCES payments(id) ON DELETE CASCADE,
  author_role VARCHAR(20) NOT NULL
    CHECK (author_role IN ('admin', 'staff', 'tenant', 'system')),
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT NOT NULL DEFAULT '',
  update_type VARCHAR(30) NOT NULL DEFAULT 'reply'
    CHECK (
      update_type IN (
        'reply',
        'status_change',
        'system'
      )
    ),
  photo_file_name TEXT,
  photo_file_path TEXT,
  photo_mime_type TEXT,
  photo_file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_updates_payment_created
  ON payment_updates (payment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_updates_author_user
  ON payment_updates (author_user_id);

COMMENT ON TABLE payment_updates IS
  'Append-only messages and photos on a payment claim so tenants can track verification and the office can reply.';
