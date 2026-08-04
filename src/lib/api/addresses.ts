import pool from '@/lib/db';

export interface AddressRegion {
  id: string;
  countryCode: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface AddressCity {
  id: string;
  regionId: string;
  code: string | null;
  name: string;
}

function mapRegion(row: Record<string, unknown>): AddressRegion {
  return {
    id: String(row.id),
    countryCode: String(row.country_code),
    code: String(row.code),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapCity(row: Record<string, unknown>): AddressCity {
  return {
    id: String(row.id),
    regionId: String(row.region_id),
    code: row.code != null ? String(row.code) : null,
    name: String(row.name),
  };
}

export async function getAddressRegions(countryCode = 'PH'): Promise<AddressRegion[]> {
  const result = await pool.query(
    `SELECT id, country_code, code, name, sort_order
     FROM address_regions
     WHERE country_code = $1 AND is_active = true
     ORDER BY sort_order ASC, name ASC`,
    [countryCode]
  );
  return result.rows.map(mapRegion);
}

export async function getAddressCitiesByRegion(regionId: string): Promise<AddressCity[]> {
  const result = await pool.query(
    `SELECT id, region_id, code, name
     FROM address_cities
     WHERE region_id = $1 AND is_active = true
     ORDER BY name ASC`,
    [regionId]
  );
  return result.rows.map(mapCity);
}

export async function findRegionByName(
  name: string,
  countryCode = 'PH'
): Promise<AddressRegion | null> {
  const result = await pool.query(
    `SELECT id, country_code, code, name, sort_order
     FROM address_regions
     WHERE country_code = $1 AND LOWER(name) = LOWER($2) AND is_active = true
     LIMIT 1`,
    [countryCode, name.trim()]
  );
  return result.rows[0] ? mapRegion(result.rows[0]) : null;
}

export async function validateCityInRegion(
  regionName: string,
  cityName: string,
  countryCode = 'PH'
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1
     FROM address_cities c
     JOIN address_regions r ON r.id = c.region_id
     WHERE r.country_code = $1
       AND LOWER(r.name) = LOWER($2)
       AND LOWER(c.name) = LOWER($3)
       AND r.is_active = true
       AND c.is_active = true
     LIMIT 1`,
    [countryCode, regionName.trim(), cityName.trim()]
  );
  return result.rows.length > 0;
}
