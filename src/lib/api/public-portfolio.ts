import pool from '@/lib/db';
import { getBuildingStats, getOccupancyStats } from '@/lib/api/buildings';
import { getImageUrl } from '@/lib/format/image-url';

export interface PublicPortfolioStats {
  propertyCount: number;
  totalUnits: number;
  occupancyRate: number;
  availableUnits: number;
}

export interface PublicFeaturedProperty {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string;
  totalUnits: number;
  availableUnits: number;
  startingRent: number | null;
  imageUrl: string | null;
}

export interface PublicPortfolioPayload {
  stats: PublicPortfolioStats;
  properties: PublicFeaturedProperty[];
  propertiesWithAvailability: number;
  totalProperties: number;
}

function formatAddress(row: {
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
}): string {
  const parts = [row.address_line1, row.city, row.state, row.postal_code].filter(Boolean);
  return parts.length ? parts.join(', ') : '';
}

/**
 * Safe public aggregates + featured buildings for the marketing homepage.
 * Exposes no financial/revenue data.
 */
export async function getPublicPortfolio(): Promise<PublicPortfolioPayload> {
  const [buildingStats, occupancyStats, propertiesResult] = await Promise.all([
    getBuildingStats(),
    getOccupancyStats(),
    pool.query<{
      id: string;
      name: string;
      address_line1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      total_units: string;
      vacant_units: string;
      starting_rent: string | null;
      primary_image_path: string | null;
    }>(`
      SELECT
        b.id,
        b.name,
        b.address_line1,
        b.city,
        b.state,
        b.postal_code,
        COUNT(r.id)::text AS total_units,
        COUNT(r.id) FILTER (WHERE r.room_status = 'vacant')::text AS vacant_units,
        MIN(r.monthly_rate) FILTER (
          WHERE r.room_status = 'vacant' AND r.monthly_rate IS NOT NULL AND r.monthly_rate > 0
        )::text AS starting_rent,
        (
          SELECT i.file_path
          FROM images i
          WHERE i.entity_type = 'building' AND i.entity_id = b.id
          ORDER BY i.is_primary DESC, i.created_at ASC
          LIMIT 1
        ) AS primary_image_path
      FROM buildings b
      LEFT JOIN rooms r ON r.building_id = b.id AND r.is_active = true
      WHERE b.is_active = true
      GROUP BY b.id
      ORDER BY
        COUNT(r.id) FILTER (WHERE r.room_status = 'vacant') DESC,
        b.name ASC
    `),
  ]);

  const propertyCount = parseInt(String(buildingStats.total_buildings), 10) || 0;
  const totalUnits = parseInt(String(buildingStats.total_units), 10) || 0;
  const availableUnits = parseInt(String(occupancyStats.vacant_rooms), 10) || 0;
  const occupancyRate = Math.round(parseFloat(String(occupancyStats.occupancy_rate)) || 0);

  const properties: PublicFeaturedProperty[] = propertiesResult.rows.map((row) => {
    const imagePath = row.primary_image_path;
    return {
      id: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
      address: formatAddress(row),
      totalUnits: parseInt(row.total_units, 10) || 0,
      availableUnits: parseInt(row.vacant_units, 10) || 0,
      startingRent: row.starting_rent != null ? parseFloat(row.starting_rent) : null,
      imageUrl: imagePath ? getImageUrl(imagePath) : null,
    };
  });

  const propertiesWithAvailability = properties.filter((p) => p.availableUnits > 0).length;

  return {
    stats: {
      propertyCount,
      totalUnits,
      occupancyRate,
      availableUnits,
    },
    properties,
    propertiesWithAvailability,
    totalProperties: propertyCount,
  };
}
