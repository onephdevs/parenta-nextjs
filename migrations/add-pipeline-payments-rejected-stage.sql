-- Add Rejected stage on the Rent Payment board (after Pending verification).
-- Rejected claims stay on the card with the original thread so the tenant
-- can reply or send a new screenshot on the same request.

DO $$
DECLARE
  payments_id UUID;
BEGIN
  SELECT id INTO payments_id FROM pipeline_boards WHERE slug = 'payments' LIMIT 1;
  IF payments_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE pipeline_stages
  SET sort_order = CASE slug
        WHEN 'pending_verification' THEN 5
        WHEN 'rejected' THEN 6
        WHEN 'paid' THEN 7
        WHEN 'refund' THEN 8
        WHEN 'escalation' THEN 9
        ELSE sort_order
      END,
      updated_at = CURRENT_TIMESTAMP
  WHERE board_id = payments_id
    AND slug IN ('pending_verification', 'rejected', 'paid', 'refund', 'escalation');

  INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
  SELECT payments_id, 'rejected', 'Rejected', '#e11d48', 6, false, false, false
  WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_stages WHERE board_id = payments_id AND slug = 'rejected'
  );

  UPDATE pipeline_stages
  SET name = 'Rejected',
      color = '#e11d48',
      sort_order = 6,
      is_won = false,
      is_lost = false,
      is_terminal = false,
      updated_at = CURRENT_TIMESTAMP
  WHERE board_id = payments_id AND slug = 'rejected';
END $$;
