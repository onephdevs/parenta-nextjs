-- Phase 6 — Move-out inspection checklist + history import batches.
-- Idempotent where practical.
-- Refund amounts remain manually entered; checklist itemizes findings/deductions.

-- =====================================================
-- 0. MOVEOUT SETTLEMENT FIELDS (manual refund worksheet)
-- =====================================================
ALTER TABLE moveout_processing
  ADD COLUMN IF NOT EXISTS advance_return_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS utility_deposit_return_amount NUMERIC(10, 2);

-- =====================================================
-- 1. INSPECTION CHECKLIST TEMPLATES (default catalog)
-- =====================================================
CREATE TABLE IF NOT EXISTS moveout_inspection_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  item_key VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_moveout_inspection_template_global
  ON moveout_inspection_checklist_templates (item_key)
  WHERE building_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_moveout_inspection_template_building
  ON moveout_inspection_checklist_templates (building_id, item_key)
  WHERE building_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moveout_inspection_templates_building
  ON moveout_inspection_checklist_templates (building_id)
  WHERE building_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moveout_inspection_templates_active
  ON moveout_inspection_checklist_templates (is_active, sort_order);

-- =====================================================
-- 2. PER-MOVEOUT INSPECTION FINDINGS (itemized deductions)
-- =====================================================
CREATE TABLE IF NOT EXISTS moveout_inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moveout_id UUID NOT NULL REFERENCES moveout_processing(id) ON DELETE CASCADE,
  template_id UUID REFERENCES moveout_inspection_checklist_templates(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  item_key VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  finding_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  deduction_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  photo_url TEXT,
  inspected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_moveout_inspection_item UNIQUE (moveout_id, item_key),
  CONSTRAINT chk_moveout_inspection_finding
    CHECK (finding_status IN ('pending', 'pass', 'fail', 'na')),
  CONSTRAINT chk_moveout_inspection_deduction_nonneg
    CHECK (deduction_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_moveout_inspection_items_moveout
  ON moveout_inspection_items (moveout_id, sort_order);

-- =====================================================
-- 3. HISTORY IMPORT BATCH LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS history_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type VARCHAR(50) NOT NULL,
  filename TEXT,
  dry_run BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'previewed',
  row_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  committed_at TIMESTAMPTZ,
  CONSTRAINT chk_history_import_type
    CHECK (import_type IN ('payments', 'expenses', 'tenants', 'meter_readings')),
  CONSTRAINT chk_history_import_status
    CHECK (status IN ('previewed', 'committed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_history_import_batches_created
  ON history_import_batches (created_at DESC);

COMMENT ON TABLE moveout_inspection_items IS
  'Per-moveout checklist findings; deduction_amount is manually entered (no auto formula).';
COMMENT ON TABLE history_import_batches IS
  'Audit log for spreadsheet historical migration (dry-run + commit).';

-- =====================================================
-- 4. SEED DEFAULT CHECKLIST (portfolio-wide, building_id NULL)
-- =====================================================
INSERT INTO moveout_inspection_checklist_templates
  (building_id, sort_order, item_key, label, category)
VALUES
  (NULL, 10, 'walls_paint', 'Walls / paint condition', 'structure'),
  (NULL, 20, 'flooring', 'Flooring / tiles', 'structure'),
  (NULL, 30, 'doors_locks', 'Doors & locks', 'fixtures'),
  (NULL, 40, 'windows_screens', 'Windows & screens', 'fixtures'),
  (NULL, 50, 'kitchen_sink', 'Kitchen sink / cabinets', 'kitchen'),
  (NULL, 60, 'bathroom', 'Bathroom fixtures / tiles', 'bathroom'),
  (NULL, 70, 'appliances', 'Appliances (if any)', 'appliances'),
  (NULL, 80, 'lighting', 'Lights / electrical outlets', 'electrical'),
  (NULL, 90, 'keys_access', 'Keys / access cards returned', 'keys'),
  (NULL, 100, 'cleanliness', 'Overall cleanliness', 'cleanliness'),
  (NULL, 110, 'unpaid_bills', 'Unpaid bills / utilities (manual)', 'financial'),
  (NULL, 120, 'other_damages', 'Other damages', 'other')
ON CONFLICT (item_key) WHERE building_id IS NULL DO NOTHING;
