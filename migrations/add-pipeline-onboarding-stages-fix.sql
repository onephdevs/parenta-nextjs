-- Fix duplicate onboarding stages after partial onboarding-flow migrate.
-- Merge legacy review/lease_sent into background_check/awaiting_signature.

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

  -- application → Documents (name only)
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
  ELSIF drop_id IS NOT NULL AND keep_id IS NULL THEN
    UPDATE pipeline_stages
    SET slug = 'background_check', name = 'Background check', color = '#f59e0b',
        sort_order = 5, updated_at = CURRENT_TIMESTAMP
    WHERE id = drop_id;
  END IF;

  IF keep_id IS NOT NULL THEN
    UPDATE pipeline_stages
    SET name = 'Background check', color = '#f59e0b', sort_order = 5, updated_at = CURRENT_TIMESTAMP
    WHERE id = keep_id;
  END IF;

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
  ELSIF drop_id IS NOT NULL AND keep_id IS NULL THEN
    UPDATE pipeline_stages
    SET slug = 'awaiting_signature', name = 'Awaiting signature', color = '#14b8a6',
        sort_order = 6, updated_at = CURRENT_TIMESTAMP
    WHERE id = drop_id;
  END IF;

  IF keep_id IS NOT NULL THEN
    UPDATE pipeline_stages
    SET name = 'Awaiting signature', color = '#14b8a6', sort_order = 6, updated_at = CURRENT_TIMESTAMP
    WHERE id = keep_id;
  END IF;

  -- won → Lease signed
  UPDATE pipeline_stages
  SET name = 'Lease signed', color = '#22c55e', sort_order = 7,
      is_won = true, is_terminal = true, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = onboard_id AND slug = 'won';
END $$;
