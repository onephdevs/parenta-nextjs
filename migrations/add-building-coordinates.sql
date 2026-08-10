-- Building geocoordinates for nearby amenities / maps (OSM Nominatim geocode).
-- NULL until first successful geocode; then persisted for reuse.

ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_buildings_coordinates
  ON buildings (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN buildings.latitude IS 'WGS84 latitude; filled by Nominatim on first nearby request';
COMMENT ON COLUMN buildings.longitude IS 'WGS84 longitude; filled by Nominatim on first nearby request';
COMMENT ON COLUMN buildings.geocoded_at IS 'When latitude/longitude were last set via geocoding';
