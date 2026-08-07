-- Expenses board: link cards to utility_bills (mirrors expense_id / maintenance_request_id).

ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS utility_bill_id UUID REFERENCES utility_bills(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_cards_utility_bill
  ON pipeline_cards (utility_bill_id)
  WHERE utility_bill_id IS NOT NULL;

COMMENT ON COLUMN pipeline_cards.utility_bill_id IS 'Expenses board: source utility bill';
