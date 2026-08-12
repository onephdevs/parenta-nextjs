-- Add viewing_status field to pipeline_cards for tracking the outcome of scheduled viewings
ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS viewing_status TEXT
    CHECK (viewing_status IN ('scheduled', 'completed', 'no_show', 'cancelled', 'rescheduled'))
    DEFAULT NULL;

COMMENT ON COLUMN pipeline_cards.viewing_status IS 'Outcome status of the scheduled property viewing';
