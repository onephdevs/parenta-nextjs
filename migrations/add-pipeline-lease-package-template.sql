-- Store selected commercial lease package on opportunity cards
ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS lease_package_template_id UUID
    REFERENCES lease_package_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_cards_lease_package_template
  ON pipeline_cards (lease_package_template_id);

COMMENT ON COLUMN pipeline_cards.lease_package_template_id IS
  'Lease package selected on onboarding opportunity; copied to assignment on Generate lease';
