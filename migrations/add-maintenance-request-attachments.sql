-- Photos / files attached to maintenance requests (tenant issue evidence).
CREATE TABLE IF NOT EXISTS maintenance_request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mra_request
  ON maintenance_request_attachments (maintenance_request_id);

COMMENT ON TABLE maintenance_request_attachments IS
  'Tenant-uploaded photos of maintenance issues for admin assessment';
