-- Lease Template CMS
-- Global default templates + optional per-building overrides.
-- Published versions are immutable; lease generation snapshots wording at create/sign time.

CREATE TABLE IF NOT EXISTS lease_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE, -- NULL = global default
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  -- Signing preferences for this template
  signature_method VARCHAR(30) NOT NULL DEFAULT 'typed_name'
    CHECK (signature_method IN ('typed_name', 'drawn', 'upload')),
  require_witness BOOLEAN NOT NULL DEFAULT true,
  audit_ip BOOLEAN NOT NULL DEFAULT true,
  audit_timestamp BOOLEAN NOT NULL DEFAULT true,
  audit_user_agent BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lease_templates_one_published_global
  ON lease_templates ((1))
  WHERE status = 'published' AND building_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lease_templates_one_published_building
  ON lease_templates (building_id)
  WHERE status = 'published' AND building_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lease_templates_building ON lease_templates(building_id);
CREATE INDEX IF NOT EXISTS idx_lease_templates_status ON lease_templates(status);

CREATE TABLE IF NOT EXISTS lease_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES lease_templates(id) ON DELETE CASCADE,
  section_key VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  -- When set, section only renders if the condition evaluates true
  -- e.g. 'has_co_tenants', 'has_pet_policy', 'has_house_rules', 'has_custom_clauses'
  condition_key VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_lease_template_section_key UNIQUE (template_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_lease_template_sections_template
  ON lease_template_sections(template_id, sort_order);

-- Immutable wording snapshot for each generated/signed lease document
CREATE TABLE IF NOT EXISTS lease_agreement_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  template_id UUID REFERENCES lease_templates(id) ON DELETE SET NULL,
  template_version INTEGER,
  template_name VARCHAR(255),
  resolved_html TEXT NOT NULL,
  context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sections_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lease_agreement_snapshots_document
  ON lease_agreement_snapshots(document_id);

CREATE INDEX IF NOT EXISTS idx_lease_agreement_snapshots_template
  ON lease_agreement_snapshots(template_id);

-- E-signature audit trail (clickwrap / typed name / drawn / upload)
CREATE TABLE IF NOT EXISTS lease_signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signer_role VARCHAR(30) NOT NULL
    CHECK (signer_role IN ('tenant', 'landlord', 'witness', 'guarantor')),
  signer_name VARCHAR(255) NOT NULL,
  signer_email VARCHAR(255),
  signature_method VARCHAR(30) NOT NULL
    CHECK (signature_method IN ('typed_name', 'drawn', 'upload')),
  signature_payload TEXT, -- typed name text, or data-URL / storage path for image
  typed_name VARCHAR(255),
  ip_address VARCHAR(64),
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lease_signature_events_document
  ON lease_signature_events(document_id, signed_at);

COMMENT ON TABLE lease_templates IS 'Section-based lease clause library; global or per-building override';
COMMENT ON TABLE lease_template_sections IS 'Editable clause blocks with optional render conditions';
COMMENT ON TABLE lease_agreement_snapshots IS 'Frozen template wording at generation/sign time — edits to templates never rewrite signed leases';
COMMENT ON TABLE lease_signature_events IS 'Clickwrap / e-signature audit (IP, timestamp, user-agent)';
