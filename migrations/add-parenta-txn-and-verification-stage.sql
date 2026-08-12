-- Parenta internal txn IDs (txn-r-000001-26) + Rent Payment verification stage
-- + expense reconciled stage for bank/statement match after Paid.

-- Sequence counters: per type + year (YY)
CREATE TABLE IF NOT EXISTS txn_sequences (
  txn_type VARCHAR(8) NOT NULL,
  year_yy SMALLINT NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (txn_type, year_yy)
);

COMMENT ON TABLE txn_sequences IS
  'Counters for Parenta txn IDs: txn-{type}-{######}-{YY}';

-- Store our ledger id separately from GCash/bank receipt reference_number
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS parenta_txn_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_parenta_txn_id
  ON payments (parenta_txn_id)
  WHERE parenta_txn_id IS NOT NULL;

COMMENT ON COLUMN payments.parenta_txn_id IS
  'Internal Parenta txn (txn-r-000001-26). reference_number stays the GCash/bank receipt ref.';

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS parenta_txn_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_parenta_txn_id
  ON expenses (parenta_txn_id)
  WHERE parenta_txn_id IS NOT NULL;

-- Optional on utility_bills when tenant pays / admin records payment claim
ALTER TABLE utility_bills
  ADD COLUMN IF NOT EXISTS parenta_txn_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_utility_bills_parenta_txn_id
  ON utility_bills (parenta_txn_id)
  WHERE parenta_txn_id IS NOT NULL;

-- Rent Payment board: Pending verification (after Overdue, before Paid)
DO $$
DECLARE
  payments_id UUID;
BEGIN
  SELECT id INTO payments_id FROM pipeline_boards WHERE slug = 'payments' LIMIT 1;
  IF payments_id IS NULL THEN
    RETURN;
  END IF;

  -- Sort order target:
  -- 1 upcoming, 2 due, 3 reminder_sent, 4 overdue,
  -- 5 pending_verification, 6 paid, 7 refund, 8 escalation
  UPDATE pipeline_stages
  SET sort_order = 8, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = payments_id AND slug = 'escalation';

  UPDATE pipeline_stages
  SET sort_order = 7, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = payments_id AND slug = 'refund';

  UPDATE pipeline_stages
  SET sort_order = 6, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = payments_id AND slug = 'paid';

  INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
  SELECT payments_id, 'pending_verification', 'Pending verification', '#f59e0b', 5, false, false, false
  WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_stages
    WHERE board_id = payments_id AND slug = 'pending_verification'
  );

  UPDATE pipeline_stages
  SET name = 'Pending verification',
      color = '#f59e0b',
      sort_order = 5,
      is_won = false,
      is_lost = false,
      is_terminal = false,
      updated_at = CURRENT_TIMESTAMP
  WHERE board_id = payments_id AND slug = 'pending_verification';
END $$;

-- Expenses board: Reconciled after Paid (bank/GCash out matched)
DO $$
DECLARE
  expenses_id UUID;
BEGIN
  SELECT id INTO expenses_id FROM pipeline_boards WHERE slug = 'expenses' LIMIT 1;
  IF expenses_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
  SELECT expenses_id, 'reconciled', 'Reconciled', '#64748b', 7, true, false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_stages
    WHERE board_id = expenses_id AND slug = 'reconciled'
  );

  UPDATE pipeline_stages
  SET name = 'Reconciled',
      color = '#64748b',
      sort_order = 7,
      is_won = true,
      is_lost = false,
      is_terminal = true,
      updated_at = CURRENT_TIMESTAMP
  WHERE board_id = expenses_id AND slug = 'reconciled';
END $$;
