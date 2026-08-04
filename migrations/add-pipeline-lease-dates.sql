-- Opportunity lease details before Generate lease creates tenant + assignment

ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS lease_start_date DATE,
  ADD COLUMN IF NOT EXISTS lease_end_date DATE,
  ADD COLUMN IF NOT EXISTS move_in_date DATE;
