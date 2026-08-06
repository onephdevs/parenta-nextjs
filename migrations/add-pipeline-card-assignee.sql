-- Opportunity owner / assignee for GHL-style board cards
ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_cards_assigned
  ON pipeline_cards (assigned_to)
  WHERE assigned_to IS NOT NULL;

COMMENT ON COLUMN pipeline_cards.assigned_to IS 'Admin/staff user who owns this opportunity';
