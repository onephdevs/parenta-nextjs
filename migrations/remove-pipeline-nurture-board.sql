-- Remove Nurture pipeline board and all of its stages/cards.
-- Cards must go first (stages have ON DELETE RESTRICT from cards.stage_id).

DO $$
DECLARE
  nurture_id UUID;
BEGIN
  SELECT id INTO nurture_id FROM pipeline_boards WHERE slug = 'nurture' LIMIT 1;
  IF nurture_id IS NULL THEN
    RAISE NOTICE 'Nurture board not found — nothing to remove';
    RETURN;
  END IF;

  DELETE FROM pipeline_cards WHERE board_id = nurture_id;
  DELETE FROM pipeline_stages WHERE board_id = nurture_id;
  DELETE FROM pipeline_boards WHERE id = nurture_id;

  RAISE NOTICE 'Removed nurture board %', nurture_id;
END $$;
