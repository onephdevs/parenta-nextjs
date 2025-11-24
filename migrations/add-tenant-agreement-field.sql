-- Add tenant_agreement_document_id field to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS tenant_agreement_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_agreement_document ON tenants(tenant_agreement_document_id) WHERE tenant_agreement_document_id IS NOT NULL;

