-- Optional late-payment penalties on lease package templates
ALTER TABLE lease_package_templates
  ALTER COLUMN penalty_type DROP NOT NULL,
  ALTER COLUMN penalty_fee DROP NOT NULL,
  ALTER COLUMN grace_period_days DROP NOT NULL;

ALTER TABLE lease_package_templates
  DROP CONSTRAINT IF EXISTS lease_package_templates_penalty_type_check;

ALTER TABLE lease_package_templates
  ADD CONSTRAINT lease_package_templates_penalty_type_check
  CHECK (
    penalty_type IS NULL
    OR penalty_type IN ('percentage', 'flat_fee')
  );

COMMENT ON COLUMN lease_package_templates.penalty_type IS
  'NULL = no late fee configured for this package';
COMMENT ON COLUMN lease_package_templates.penalty_fee IS
  'NULL when penalties are not configured';
