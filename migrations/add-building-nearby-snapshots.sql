-- Persistent nearby-amenities snapshots (reduce Overpass calls).
-- Refreshed on a schedule controlled by app_settings.nearby_refresh_days (default 7).

CREATE TABLE IF NOT EXISTS building_nearby_snapshots (
  building_id UUID PRIMARY KEY REFERENCES buildings(id) ON DELETE CASCADE,
  origin_latitude DOUBLE PRECISION NOT NULL,
  origin_longitude DOUBLE PRECISION NOT NULL,
  places JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_building_nearby_snapshots_fetched
  ON building_nearby_snapshots (fetched_at);

-- Cached walking/driving polylines from apartment → a selected nearby place.
CREATE TABLE IF NOT EXISTS building_nearby_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  profile VARCHAR(20) NOT NULL DEFAULT 'walking'
    CHECK (profile IN ('walking', 'driving')),
  distance_meters INTEGER,
  duration_seconds INTEGER,
  geometry JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT building_nearby_routes_unique UNIQUE (building_id, place_id, profile)
);

CREATE INDEX IF NOT EXISTS idx_building_nearby_routes_building
  ON building_nearby_routes (building_id);

INSERT INTO app_settings (key, value, description, updated_at)
VALUES (
  'nearby_refresh_days',
  '7',
  'How often to refresh nearby map places from OpenStreetMap (days). Default weekly.',
  CURRENT_TIMESTAMP
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE building_nearby_snapshots IS 'Cached Overpass nearby places per building; refreshed every nearby_refresh_days';
COMMENT ON TABLE building_nearby_routes IS 'Cached OSRM routes from building to a selected nearby place';
