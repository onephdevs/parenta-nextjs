-- Lost outcome remarks for pipeline opportunities
ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;
