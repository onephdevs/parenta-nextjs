-- Philippine address reference data (regions / provinces + cities / municipalities)
-- Used by building location dropdowns. buildings.city / buildings.state still store names.

CREATE TABLE IF NOT EXISTS address_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL DEFAULT 'PH',
  code VARCHAR(20) NOT NULL,
  name VARCHAR(150) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT address_regions_country_code_unique UNIQUE (country_code, code)
);

CREATE TABLE IF NOT EXISTS address_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES address_regions(id) ON DELETE CASCADE,
  code VARCHAR(20),
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT address_cities_region_name_unique UNIQUE (region_id, name)
);

CREATE INDEX IF NOT EXISTS idx_address_regions_country_active
  ON address_regions (country_code, is_active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_address_cities_region_active
  ON address_cities (region_id, is_active, name);

-- Widen buildings.state to fit longer region names (e.g. Metro Manila)
ALTER TABLE buildings
  ALTER COLUMN state TYPE VARCHAR(150);
