-- New buildings stay off the landing page until an admin opts in.
-- Existing rows keep their current show_on_landing_nearby values.

ALTER TABLE buildings
  ALTER COLUMN show_on_landing_nearby SET DEFAULT false;

COMMENT ON COLUMN buildings.show_on_landing_nearby IS
  'When true, building appears in landing Featured properties and What’s nearby. New buildings default to false.';
