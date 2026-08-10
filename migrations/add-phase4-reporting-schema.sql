-- Phase 4 — Reporting: lifetime collection ledger + vacant utility cost bearer.
-- Idempotent where practical.

-- =====================================================
-- 1. CUMULATIVE LIFETIME COLLECTION (persisted running total)
-- =====================================================
-- Previous Total + Current Period = Overall Collection
-- Stored per scope (portfolio or one building); not recalculated from scratch.

CREATE TABLE IF NOT EXISTS collection_lifetime_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key TEXT NOT NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  overall_collection NUMERIC(14, 2) NOT NULL DEFAULT 0,
  as_of_date DATE,
  last_committed_period_start DATE,
  last_committed_period_end DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_collection_lifetime_totals_scope UNIQUE (scope_key)
);

CREATE INDEX IF NOT EXISTS idx_collection_lifetime_totals_building
  ON collection_lifetime_totals (building_id)
  WHERE building_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS collection_lifetime_period_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key TEXT NOT NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  previous_total NUMERIC(14, 2) NOT NULL,
  period_collection NUMERIC(14, 2) NOT NULL,
  overall_collection NUMERIC(14, 2) NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_collection_lifetime_period UNIQUE (scope_key, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_collection_lifetime_commits_scope
  ON collection_lifetime_period_commits (scope_key, period_end DESC);

COMMENT ON TABLE collection_lifetime_totals IS
  'Running Overall Collection per portfolio/building; updated only via period commits.';
COMMENT ON TABLE collection_lifetime_period_commits IS
  'Audit of Previous + Period = Overall commits for lifetime collection.';

-- =====================================================
-- 2. UTILITY COST BEARER (tenant vs owner-absorbed)
-- =====================================================
ALTER TABLE utility_bills
  ADD COLUMN IF NOT EXISTS cost_bearer VARCHAR(20) NOT NULL DEFAULT 'TENANT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_utility_bills_cost_bearer'
  ) THEN
    ALTER TABLE utility_bills
      ADD CONSTRAINT chk_utility_bills_cost_bearer
      CHECK (cost_bearer IN ('TENANT', 'OWNER'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_utility_bills_cost_bearer
  ON utility_bills (cost_bearer);

COMMENT ON COLUMN utility_bills.cost_bearer IS
  'TENANT = billable to occupant; OWNER = vacant/owner-absorbed (not tenant balance).';

-- Backfill: vacant rooms (no active assignment) → OWNER
UPDATE utility_bills ub
SET cost_bearer = 'OWNER'
WHERE ub.room_id IS NOT NULL
  AND COALESCE(ub.cost_bearer, 'TENANT') = 'TENANT'
  AND EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = ub.room_id
      AND r.room_status = 'vacant'
  )
  AND NOT EXISTS (
    SELECT 1 FROM tenant_room_assignments tra
    WHERE tra.room_id = ub.room_id
      AND tra.assignment_status = 'active'
      AND (tra.end_date IS NULL OR tra.end_date >= CURRENT_DATE)
  );
