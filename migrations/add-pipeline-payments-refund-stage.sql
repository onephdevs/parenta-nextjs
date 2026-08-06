-- Add Refund stage on the Payments pipeline board (after Paid).

DO $$
DECLARE
  payments_id UUID;
BEGIN
  SELECT id INTO payments_id FROM pipeline_boards WHERE slug = 'payments' LIMIT 1;
  IF payments_id IS NULL THEN
    RETURN;
  END IF;

  -- Keep Escalation after Refund
  UPDATE pipeline_stages
  SET sort_order = 7, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = payments_id AND slug = 'escalation' AND sort_order < 7;

  UPDATE pipeline_stages
  SET sort_order = 5, updated_at = CURRENT_TIMESTAMP
  WHERE board_id = payments_id AND slug = 'paid';

  INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
  SELECT payments_id, 'refund', 'Refund', '#0d9488', 6, false, false, false
  WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_stages WHERE board_id = payments_id AND slug = 'refund'
  );

  UPDATE pipeline_stages
  SET name = 'Refund',
      color = '#0d9488',
      sort_order = 6,
      is_won = false,
      is_lost = false,
      is_terminal = false,
      updated_at = CURRENT_TIMESTAMP
  WHERE board_id = payments_id AND slug = 'refund';
END $$;
