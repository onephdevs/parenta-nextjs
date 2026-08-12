-- Parenta txn IDs allocated when onboarding move-in payment is verified (Payment received)
ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS deposit_parenta_txn_id TEXT,
  ADD COLUMN IF NOT EXISTS advance_parenta_txn_id TEXT;

COMMENT ON COLUMN pipeline_cards.deposit_parenta_txn_id IS
  'Parenta txn for move-in security deposit (txn-d-######-YY), set when Payment received';
COMMENT ON COLUMN pipeline_cards.advance_parenta_txn_id IS
  'Parenta txn for move-in advance rent (txn-a-######-YY), set when Payment received';
