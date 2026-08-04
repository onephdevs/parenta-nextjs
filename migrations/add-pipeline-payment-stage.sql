-- Add onboarding Payment stage between Background check and Awaiting signature.
-- Admin records move-in deposit/advance here before Generate lease.

DO $$
DECLARE
  onboard_id UUID;
BEGIN
  SELECT id INTO onboard_id FROM pipeline_boards WHERE slug = 'onboarding' LIMIT 1;
  IF onboard_id IS NULL THEN
    RETURN;
  END IF;

  -- Make room for Payment at sort_order 6
  UPDATE pipeline_stages
  SET sort_order = 7, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = onboard_id AND slug = 'awaiting_signature';

  UPDATE pipeline_stages
  SET sort_order = 8, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = onboard_id AND slug = 'won';

  UPDATE pipeline_stages
  SET sort_order = 9, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = onboard_id AND slug = 'lost';

  INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
  SELECT onboard_id, 'payment', 'Payment', '#8b5cf6', 6, false, false, false
  WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_stages WHERE board_id = onboard_id AND slug = 'payment'
  );

  UPDATE pipeline_stages
  SET name = 'Payment',
      color = '#8b5cf6',
      sort_order = 6,
      is_won = false,
      is_lost = false,
      is_terminal = false,
      updated_at = CURRENT_TIMESTAMP
  WHERE board_id = onboard_id AND slug = 'payment';
END $$;
