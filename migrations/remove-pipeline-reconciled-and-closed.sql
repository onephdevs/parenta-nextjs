-- Remove expenses "reconciled" and maintenance "closed" pipeline stages.
-- Move any cards on those stages to Paid / Resolved first.

DO $$
DECLARE
  expenses_id UUID;
  maintenance_id UUID;
  reconciled_id UUID;
  paid_id UUID;
  closed_id UUID;
  resolved_id UUID;
BEGIN
  -- Expenses: reconciled → paid
  SELECT id INTO expenses_id FROM pipeline_boards WHERE slug = 'expenses' LIMIT 1;
  IF expenses_id IS NOT NULL THEN
    SELECT id INTO reconciled_id
    FROM pipeline_stages WHERE board_id = expenses_id AND slug = 'reconciled' LIMIT 1;
    SELECT id INTO paid_id
    FROM pipeline_stages WHERE board_id = expenses_id AND slug = 'paid' LIMIT 1;

    IF reconciled_id IS NOT NULL AND paid_id IS NOT NULL THEN
      UPDATE pipeline_cards SET stage_id = paid_id, updated_at = CURRENT_TIMESTAMP
      WHERE stage_id = reconciled_id;
      UPDATE pipeline_card_events SET from_stage_id = paid_id WHERE from_stage_id = reconciled_id;
      UPDATE pipeline_card_events SET to_stage_id = paid_id WHERE to_stage_id = reconciled_id;
      DELETE FROM pipeline_stages WHERE id = reconciled_id;
    ELSIF reconciled_id IS NOT NULL THEN
      DELETE FROM pipeline_cards WHERE stage_id = reconciled_id;
      DELETE FROM pipeline_stages WHERE id = reconciled_id;
    END IF;
  END IF;

  -- Maintenance: closed → resolved
  SELECT id INTO maintenance_id FROM pipeline_boards WHERE slug = 'maintenance' LIMIT 1;
  IF maintenance_id IS NOT NULL THEN
    SELECT id INTO closed_id
    FROM pipeline_stages WHERE board_id = maintenance_id AND slug = 'closed' LIMIT 1;
    SELECT id INTO resolved_id
    FROM pipeline_stages WHERE board_id = maintenance_id AND slug = 'resolved' LIMIT 1;

    IF closed_id IS NOT NULL AND resolved_id IS NOT NULL THEN
      UPDATE pipeline_cards
      SET stage_id = resolved_id,
          card_status = 'won',
          updated_at = CURRENT_TIMESTAMP
      WHERE stage_id = closed_id;
      UPDATE pipeline_card_events SET from_stage_id = resolved_id WHERE from_stage_id = closed_id;
      UPDATE pipeline_card_events SET to_stage_id = resolved_id WHERE to_stage_id = closed_id;
      DELETE FROM pipeline_stages WHERE id = closed_id;
    ELSIF closed_id IS NOT NULL THEN
      DELETE FROM pipeline_cards WHERE stage_id = closed_id;
      DELETE FROM pipeline_stages WHERE id = closed_id;
    END IF;

    -- Resolved becomes the terminal stage
    UPDATE pipeline_stages
    SET is_terminal = true, is_won = true, updated_at = CURRENT_TIMESTAMP
    WHERE board_id = maintenance_id AND slug = 'resolved';
  END IF;
END $$;
