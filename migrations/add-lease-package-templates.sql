-- Lease package templates (Alfonso PMS commercial terms)
-- Distinct from CMS lease_templates (document wording / e-sign).

CREATE TABLE IF NOT EXISTS lease_package_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  -- NULL = no fixed term (open lease)
  term_months INTEGER NULL CHECK (term_months IS NULL OR term_months > 0),
  -- NULL = deposit not required
  deposit_months NUMERIC(6,2) NULL CHECK (deposit_months IS NULL OR deposit_months >= 0),
  advance_months NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (advance_months >= 0),
  grace_period_days INTEGER NOT NULL DEFAULT 7 CHECK (grace_period_days >= 0),
  penalty_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (penalty_type IN ('percentage', 'flat_fee')),
  penalty_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (penalty_fee >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lease_package_templates_name_unique
  ON lease_package_templates (lower(name))
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_lease_package_templates_active
  ON lease_package_templates (is_active, name);

-- Link assignments to a package template (nullable for legacy rows)
ALTER TABLE tenant_room_assignments
  ADD COLUMN IF NOT EXISTS lease_package_template_id UUID
    REFERENCES lease_package_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tra_lease_package_template
  ON tenant_room_assignments (lease_package_template_id);

COMMENT ON TABLE lease_package_templates IS
  'Commercial lease packages (term/deposit/advance/grace/penalty) selectable when creating or renewing leases';

-- Seed defaults if empty
INSERT INTO lease_package_templates (
  name, term_months, deposit_months, advance_months,
  grace_period_days, penalty_type, penalty_fee
)
SELECT * FROM (VALUES
  ('Standard 12-Month', 12, 2::numeric, 1::numeric, 7, 'percentage', 2::numeric),
  ('Student Lease', 6, 1::numeric, 1::numeric, 5, 'flat_fee', 500::numeric),
  ('Short-Term Lease', 3, NULL::numeric, 1::numeric, 3, 'percentage', 5::numeric),
  ('Open Lease', NULL::integer, 1::numeric, 1::numeric, 5, 'flat_fee', 500::numeric),
  ('Premium Lease', 12, 3::numeric, 2::numeric, 10, 'flat_fee', 1000::numeric)
) AS v(name, term_months, deposit_months, advance_months, grace_period_days, penalty_type, penalty_fee)
WHERE NOT EXISTS (SELECT 1 FROM lease_package_templates LIMIT 1);
