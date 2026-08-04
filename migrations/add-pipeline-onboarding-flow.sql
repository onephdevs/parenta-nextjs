-- Onboarding flow: prospect documents, background check, lease status,
-- and stage labels through to Lease signed (Won creates tenant + assignment).

-- Opportunity documents (ID, income proof, lease draft, etc.)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS pipeline_card_id UUID REFERENCES pipeline_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_pipeline_card
  ON documents (pipeline_card_id)
  WHERE pipeline_card_id IS NOT NULL;

-- Card-level screening + lease progress (before tenant/assignment exist)
ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS background_check_status TEXT NOT NULL DEFAULT 'not_started';

ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS background_check_notes TEXT;

ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS lease_status TEXT NOT NULL DEFAULT 'not_started';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pipeline_cards_background_check_status_check'
  ) THEN
    ALTER TABLE pipeline_cards
      ADD CONSTRAINT pipeline_cards_background_check_status_check
      CHECK (background_check_status IN ('not_started', 'pending', 'approved', 'failed'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pipeline_cards_lease_status_check'
  ) THEN
    ALTER TABLE pipeline_cards
      ADD CONSTRAINT pipeline_cards_lease_status_check
      CHECK (lease_status IN ('not_started', 'generated', 'awaiting_signature', 'signed'));
  END IF;
END $$;

-- Align onboarding stages (idempotent merge of legacy + new slugs)
DO $$
DECLARE
  onboard_id UUID;
  keep_id UUID;
  drop_id UUID;
BEGIN
  SELECT id INTO onboard_id FROM pipeline_boards WHERE slug = 'onboarding' LIMIT 1;
  IF onboard_id IS NULL THEN
    RETURN;
  END IF;

  -- Ensure target stages exist
  INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
  SELECT onboard_id, v.slug, v.name, v.color, v.sort_order, v.is_won, v.is_lost, v.is_terminal
  FROM (
    VALUES
      ('application', 'Documents', '#3b82f6', 4, false, false, false),
      ('background_check', 'Background check', '#f59e0b', 5, false, false, false),
      ('awaiting_signature', 'Awaiting signature', '#14b8a6', 6, false, false, false),
      ('won', 'Lease signed', '#22c55e', 7, true, false, true)
  ) AS v(slug, name, color, sort_order, is_won, is_lost, is_terminal)
  WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_stages ps
    WHERE ps.board_id = onboard_id AND ps.slug = v.slug
  );

  UPDATE pipeline_stages
  SET name = 'Documents', color = '#3b82f6', sort_order = 4, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = onboard_id AND slug = 'application';

  -- Merge review → background_check
  SELECT id INTO keep_id FROM pipeline_stages
  WHERE board_id = onboard_id AND slug = 'background_check' LIMIT 1;
  SELECT id INTO drop_id FROM pipeline_stages
  WHERE board_id = onboard_id AND slug = 'review' LIMIT 1;

  IF keep_id IS NOT NULL AND drop_id IS NOT NULL THEN
    UPDATE pipeline_cards SET stage_id = keep_id WHERE stage_id = drop_id;
    UPDATE pipeline_cards SET prior_stage_id = keep_id WHERE prior_stage_id = drop_id;
    UPDATE pipeline_card_events SET from_stage_id = keep_id WHERE from_stage_id = drop_id;
    UPDATE pipeline_card_events SET to_stage_id = keep_id WHERE to_stage_id = drop_id;
    DELETE FROM pipeline_stages WHERE id = drop_id;
  ELSIF drop_id IS NOT NULL THEN
    UPDATE pipeline_stages
    SET slug = 'background_check', name = 'Background check', color = '#f59e0b',
        sort_order = 5, updated_at = CURRENT_TIMESTAMP
    WHERE id = drop_id;
  END IF;

  UPDATE pipeline_stages
  SET name = 'Background check', color = '#f59e0b', sort_order = 5, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = onboard_id AND slug = 'background_check';

  -- Merge lease_sent → awaiting_signature
  keep_id := NULL;
  drop_id := NULL;
  SELECT id INTO keep_id FROM pipeline_stages
  WHERE board_id = onboard_id AND slug = 'awaiting_signature' LIMIT 1;
  SELECT id INTO drop_id FROM pipeline_stages
  WHERE board_id = onboard_id AND slug = 'lease_sent' LIMIT 1;

  IF keep_id IS NOT NULL AND drop_id IS NOT NULL THEN
    UPDATE pipeline_cards SET stage_id = keep_id WHERE stage_id = drop_id;
    UPDATE pipeline_cards SET prior_stage_id = keep_id WHERE prior_stage_id = drop_id;
    UPDATE pipeline_card_events SET from_stage_id = keep_id WHERE from_stage_id = drop_id;
    UPDATE pipeline_card_events SET to_stage_id = keep_id WHERE to_stage_id = drop_id;
    DELETE FROM pipeline_stages WHERE id = drop_id;
  ELSIF drop_id IS NOT NULL THEN
    UPDATE pipeline_stages
    SET slug = 'awaiting_signature', name = 'Awaiting signature', color = '#14b8a6',
        sort_order = 6, updated_at = CURRENT_TIMESTAMP
    WHERE id = drop_id;
  END IF;

  UPDATE pipeline_stages
  SET name = 'Awaiting signature', color = '#14b8a6', sort_order = 6, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = onboard_id AND slug = 'awaiting_signature';

  UPDATE pipeline_stages
  SET name = 'Lease signed', color = '#22c55e', sort_order = 7,
      is_won = true, is_terminal = true, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = onboard_id AND slug = 'won';
END $$;
