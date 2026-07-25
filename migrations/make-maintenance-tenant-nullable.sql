-- Allow maintenance requests without a linked tenant (e.g. asset QR reports, common-area work)
ALTER TABLE maintenance_requests
  ALTER COLUMN tenant_id DROP NOT NULL;
