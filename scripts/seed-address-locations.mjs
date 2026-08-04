#!/usr/bin/env node
/**
 * Seed address_regions / address_cities from bundled PSGC-derived JSON.
 * Regions = provinces (+ Metro Manila for NCR). Cities = municipalities/cities.
 *
 * Note: jgngo muncity.json province_id values are unreliable (region-scoped).
 * Cities are matched to provinces via PSGC code prefix instead.
 *
 * Usage: node scripts/seed-address-locations.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

config({ path: join(root, '.env.local') });
config({ path: join(root, '.env') });

const url = (process.env.DIRECT_URL || process.env.DATABASE_URL || '').replace(
  /[?&]pgbouncer=true/g,
  ''
);

if (!url) {
  console.error('DIRECT_URL or DATABASE_URL is required');
  process.exit(1);
}

const regionsSrc = JSON.parse(
  readFileSync(join(root, 'data/addresses/region.json'), 'utf8')
);
const provincesSrc = JSON.parse(
  readFileSync(join(root, 'data/addresses/province.json'), 'utf8')
);
const citiesSrc = JSON.parse(
  readFileSync(join(root, 'data/addresses/muncity.json'), 'utf8')
);

function cleanName(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCode(code) {
  return String(code ?? '')
    .replace(/\D/g, '')
    .padStart(9, '0')
    .slice(0, 9);
}

/** Strip trailing zeros for longest-prefix matching (043400000 → 0434). */
function codeStem(code) {
  const normalized = normalizeCode(code).replace(/0+$/, '');
  return normalized.length >= 2 ? normalized : normalizeCode(code).slice(0, 4);
}

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('supabase') || url.includes('vercel') ? { rejectUnauthorized: false } : undefined,
});
await client.connect();

try {
  await client.query('BEGIN');

  await client.query(`
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
  `);
  await client.query(`
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
  `);

  await client.query('DELETE FROM address_cities');
  await client.query('DELETE FROM address_regions');

  const ncrProvinces = provincesSrc.filter((p) => Number(p.region_id) === 13);
  const otherProvinces = provincesSrc
    .filter((p) => Number(p.region_id) !== 13)
    .sort((a, b) => cleanName(a.description).localeCompare(cleanName(b.description)));

  /** @type {Array<{ code: string, name: string, sort_order: number, provinceCodes: string[] }>} */
  const regionRows = [
    {
      code: 'MM',
      name: 'Metro Manila',
      sort_order: 0,
      provinceCodes: ncrProvinces.map((p) => normalizeCode(p.code)),
    },
  ];

  let sortOrder = 10;
  for (const p of otherProvinces) {
    regionRows.push({
      code: normalizeCode(p.code),
      name: cleanName(p.description),
      sort_order: sortOrder++,
      provinceCodes: [normalizeCode(p.code)],
    });
  }

  const regionInsert = await client.query(
    `INSERT INTO address_regions (country_code, code, name, sort_order)
     SELECT 'PH', x.code, x.name, x.sort_order
     FROM UNNEST($1::text[], $2::text[], $3::int[]) AS x(code, name, sort_order)
     RETURNING id, code, name`,
    [
      regionRows.map((r) => r.code),
      regionRows.map((r) => r.name),
      regionRows.map((r) => r.sort_order),
    ]
  );

  /** @type {Map<string, string>} region code -> id */
  const regionIdByCode = new Map(regionInsert.rows.map((r) => [r.code, r.id]));

  /** Province PSGC stem -> region id (longest stem wins when matching cities).
   *  NCR LGUs are seeded separately — do not match muncity rows onto Metro Manila
   *  via Manila district codes (1339…). */
  const provinceMatchers = [];
  for (const row of regionRows) {
    if (row.code === 'MM') continue;
    const regionId = regionIdByCode.get(row.code);
    if (!regionId) continue;
    for (const provinceCode of row.provinceCodes) {
      provinceMatchers.push({
        stem: codeStem(provinceCode),
        fullCode: provinceCode,
        regionId,
        regionName: row.name,
      });
    }
  }
  provinceMatchers.sort((a, b) => b.stem.length - a.stem.length);

  function findRegionIdForCityCode(cityCode) {
    const code = normalizeCode(cityCode);
    for (const matcher of provinceMatchers) {
      if (code.startsWith(matcher.stem)) return matcher.regionId;
    }
    return null;
  }

  /** @type {Array<{ regionId: string, code: string | null, name: string }>} */
  const cityRows = [];
  const cityKey = new Set();

  function pushCity(regionId, code, name) {
    const cleaned = cleanName(name);
    if (!regionId || !cleaned) return;
    const key = `${regionId}::${cleaned.toLowerCase()}`;
    if (cityKey.has(key)) return;
    cityKey.add(key);
    cityRows.push({
      regionId,
      code: code != null ? normalizeCode(code) : null,
      name: cleaned,
    });
  }

  // NCR LGUs are province-level rows in this dataset
  for (const p of ncrProvinces) {
    pushCity(regionIdByCode.get('MM'), p.code, p.description);
  }

  let matched = 0;
  let unmatched = 0;
  for (const c of citiesSrc) {
    const regionId = findRegionIdForCityCode(c.code);
    if (!regionId) {
      unmatched += 1;
      continue;
    }
    // Skip assigning NCR-looking codes to Metro Manila twice if already added
    pushCity(regionId, c.code, c.description);
    matched += 1;
  }

  // Provinces/HUCs with no cities: use the province name itself
  const citiesByRegion = new Map();
  for (const city of cityRows) {
    citiesByRegion.set(city.regionId, (citiesByRegion.get(city.regionId) || 0) + 1);
  }
  for (const p of otherProvinces) {
    const regionId = regionIdByCode.get(normalizeCode(p.code));
    if (!regionId) continue;
    if ((citiesByRegion.get(regionId) || 0) === 0) {
      pushCity(regionId, p.code, p.description);
    }
  }

  const BATCH = 500;
  for (let i = 0; i < cityRows.length; i += BATCH) {
    const slice = cityRows.slice(i, i + BATCH);
    await client.query(
      `INSERT INTO address_cities (region_id, code, name)
       SELECT x.region_id, x.code, x.name
       FROM UNNEST($1::uuid[], $2::text[], $3::text[]) AS x(region_id, code, name)
       ON CONFLICT (region_id, name) DO NOTHING`,
      [
        slice.map((c) => c.regionId),
        slice.map((c) => c.code),
        slice.map((c) => c.name),
      ]
    );
  }

  await client.query(`
    UPDATE address_regions r
    SET sort_order = sub.ord
    FROM (
      SELECT id,
        CASE WHEN name = 'Metro Manila' THEN 0
             ELSE 10 + ROW_NUMBER() OVER (ORDER BY name)
        END AS ord
      FROM address_regions
      WHERE country_code = 'PH'
    ) sub
    WHERE r.id = sub.id
  `);

  await client.query('COMMIT');

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM address_regions WHERE country_code = 'PH') AS regions,
      (SELECT COUNT(*)::int FROM address_cities) AS cities
  `);
  const samples = await client.query(`
    SELECT r.name AS region, COUNT(c.id)::int AS cities
    FROM address_regions r
    LEFT JOIN address_cities c ON c.region_id = r.id
    WHERE r.name = ANY($1)
    GROUP BY r.name
    ORDER BY r.name
  `, [['Metro Manila', 'Laguna', 'Cavite', 'Cebu', 'Pampanga']]);

  console.log('Seeded Philippine address locations:');
  console.log(`  regions: ${counts.rows[0].regions}`);
  console.log(`  cities:  ${counts.rows[0].cities}`);
  console.log(`  matched municipality rows: ${matched}`);
  console.log(`  unmatched municipality rows: ${unmatched}`);
  console.log(`  source admin regions: ${regionsSrc.length}`);
  console.log('  sample counts:', samples.rows);
} catch (err) {
  await client.query('ROLLBACK');
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
