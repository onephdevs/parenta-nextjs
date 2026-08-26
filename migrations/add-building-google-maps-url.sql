-- Store a pasted Google Maps link and allow buildings without a street line.
-- Landing “What’s nearby” uses latitude/longitude as the origin pin.

ALTER TABLE buildings
  ALTER COLUMN address_line1 DROP NOT NULL;

ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS google_maps_url text;

COMMENT ON COLUMN buildings.google_maps_url IS
  'Google Maps share link or coordinates pasted in admin; source for latitude/longitude';

COMMENT ON COLUMN buildings.latitude IS
  'WGS84 latitude; origin pin for landing What’s nearby (Google Maps paste or Nominatim)';

COMMENT ON COLUMN buildings.longitude IS
  'WGS84 longitude; origin pin for landing What’s nearby (Google Maps paste or Nominatim)';

COMMENT ON COLUMN buildings.geocoded_at IS
  'When latitude/longitude were last set (Google Maps paste or Nominatim)';
