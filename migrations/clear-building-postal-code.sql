-- Postal code is no longer collected for properties.
-- Keep the column nullable so older documents still select it.

ALTER TABLE buildings
  ALTER COLUMN postal_code DROP NOT NULL;

UPDATE buildings
SET postal_code = NULL
WHERE postal_code IS NOT NULL;

COMMENT ON COLUMN buildings.postal_code IS
  'Deprecated for properties; no longer collected in admin. Nullable for older documents.';
