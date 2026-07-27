-- Background jobs table for Postgres-backed async work (no Redis required).
-- Used by monthly/bulk invoicing, notification queue processing, exports.

CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0,
  result JSONB,
  error TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_status_created
  ON background_jobs(status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_background_jobs_type
  ON background_jobs(job_type);

CREATE INDEX IF NOT EXISTS idx_background_jobs_created_by
  ON background_jobs(created_by);
