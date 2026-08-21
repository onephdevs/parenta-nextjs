-- Toggle whether a building appears in the landing-page "What's nearby" property picker.
-- Default true so existing properties stay visible until an admin turns them off.

ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS show_on_landing_nearby BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN buildings.show_on_landing_nearby IS
  'When true, building is listed in the public landing nearby / commute property picker.';
