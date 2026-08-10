-- Phase 3 — Expense categories link fields for move-out refunds + disbursement reporting support.
-- Categories themselves are app-level enums (no DB CHECK on expenses.category today).

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_moveout_id UUID,
  ADD COLUMN IF NOT EXISTS related_assignment_id UUID REFERENCES tenant_room_assignments(id) ON DELETE SET NULL;

-- Optional FK to moveout_processing if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'moveout_processing'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_related_moveout'
  ) THEN
    ALTER TABLE expenses
      ADD CONSTRAINT fk_expenses_related_moveout
      FOREIGN KEY (related_moveout_id)
      REFERENCES moveout_processing(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_related_moveout ON expenses(related_moveout_id);
CREATE INDEX IF NOT EXISTS idx_expenses_related_assignment ON expenses(related_assignment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_moveout_refund_unique
  ON expenses(related_moveout_id)
  WHERE related_moveout_id IS NOT NULL AND category = 'refund';

COMMENT ON COLUMN expenses.related_moveout_id IS
  'When set on a REFUND expense, links the cash-out to a finalized move-out settlement.';
COMMENT ON COLUMN expenses.tenant_id IS
  'Optional tenant link for refunds and tenant-tagged expenses.';
