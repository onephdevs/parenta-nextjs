import pool from '@/lib/db';
import type { Building, DatabaseBuilding, CreateBuildingData } from '@/types/database';
import { parseStoredCoordinate } from '@/lib/maps/google-maps-location';
import {
  assertOccupancyReconciles,
  buildOccupancyReconciliation,
} from '@/lib/occupancy/reconcile';
import {
  LANDING_FEATURED_LIMIT,
  LandingFeaturedFullError,
} from '@/lib/landing-featured';

// Helper function to map database building to app building
function mapDatabaseBuildingToBuilding(dbBuilding: DatabaseBuilding): Building {
  return {
    id: dbBuilding.id,
    name: (dbBuilding.name || '').trim(),
    addressLine1: dbBuilding.address_line1 || '',
    addressLine2: dbBuilding.address_line2,
    city: dbBuilding.city,
    state: dbBuilding.state,
    postalCode: dbBuilding.postal_code,
    country: dbBuilding.country,
    description: dbBuilding.description,
    buildingType: dbBuilding.building_type,
    yearBuilt: dbBuilding.year_built,
    totalFloors: dbBuilding.total_floors,
    totalUnits: dbBuilding.total_units,
    activeUnits: dbBuilding.active_units || 0,
    amenities: dbBuilding.amenities,
    isActive: dbBuilding.is_active,
    autoLateFee: dbBuilding.auto_late_fee !== false,
    showOnLandingNearby: dbBuilding.show_on_landing_nearby === true,
    latitude: parseStoredCoordinate(dbBuilding.latitude),
    longitude: parseStoredCoordinate(dbBuilding.longitude),
    googleMapsUrl: dbBuilding.google_maps_url || null,
    createdAt: dbBuilding.created_at,
    updatedAt: dbBuilding.updated_at,
  };
}

export interface PaginatedBuildingsResponse {
  buildings: Building[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Get all buildings with optional pagination
export async function getAllBuildings(options?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedBuildingsResponse> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE b.is_active = true';
    const values: unknown[] = [];
    let paramCount = 0;

    if (options?.search) {
      paramCount++;
      whereClause += ` AND (b.name ILIKE $${paramCount} OR b.city ILIKE $${paramCount})`;
      values.push(`%${options.search}%`);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT b.id)
      FROM buildings b
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated buildings
    const query = `
      SELECT 
        b.*,
        COUNT(r.id) as total_units,
        SUM(CASE WHEN r.room_status = 'occupied' THEN 1 ELSE 0 END) as occupied_units,
        SUM(CASE WHEN r.room_status = 'vacant' THEN 1 ELSE 0 END) as vacant_units,
        (
          SELECT i.file_path
          FROM images i
          WHERE i.entity_type = 'building' AND i.entity_id = b.id
          ORDER BY i.is_primary DESC, i.created_at ASC
          LIMIT 1
        ) AS primary_image_path
      FROM buildings b
      LEFT JOIN rooms r ON r.building_id = b.id AND r.is_active = true
      ${whereClause}
      GROUP BY b.id
      ORDER BY b.name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    values.push(limit, offset);
    const result = await pool.query(query, values);
    const buildings = result.rows.map(row => {
      const building = mapDatabaseBuildingToBuilding(row);
      return {
        ...building,
        totalUnits: parseInt(row.total_units) || 0,
        occupiedUnits: parseInt(row.occupied_units) || 0,
        vacantUnits: parseInt(row.vacant_units) || 0,
        primaryImagePath: (row.primary_image_path as string | null) || null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      buildings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    console.error('Error fetching buildings:', error);
    throw error;
  }
}

// Get building by ID
export async function getBuildingById(id: string): Promise<Building | null> {
  try {
    const query = `
      SELECT * FROM buildings 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return mapDatabaseBuildingToBuilding(result.rows[0]);
  } catch (error) {
    console.error('Error fetching building:', error);
    throw error;
  }
}

// Create building
export async function createBuilding(buildingData: CreateBuildingData): Promise<Building> {
  try {
    const hasCoords =
      buildingData.latitude != null && buildingData.longitude != null;
    const query = `
      INSERT INTO buildings (
        name, address_line1, address_line2, city, state, postal_code, 
        country, description, building_type, year_built, total_floors, amenities,
        latitude, longitude, google_maps_url, geocoded_at, show_on_landing_nearby
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    
    const values = [
      buildingData.name,
      buildingData.addressLine1?.trim() || null,
      buildingData.addressLine2?.trim() || null,
      buildingData.city,
      buildingData.state,
      buildingData.postalCode?.trim() || null,
      buildingData.country || 'Philippines',
      buildingData.description,
      buildingData.buildingType || 'residential',
      buildingData.yearBuilt,
      buildingData.totalFloors,
      buildingData.amenities || [],
      hasCoords ? buildingData.latitude : null,
      hasCoords ? buildingData.longitude : null,
      buildingData.googleMapsUrl?.trim() || null,
      hasCoords ? new Date() : null,
      buildingData.showOnLandingNearby === true,
    ];
    
    const result = await pool.query(query, values);
    return mapDatabaseBuildingToBuilding(result.rows[0]);
  } catch (error) {
    console.error('Error creating building:', error);
    throw error;
  }
}

// Get building statistics
export async function getBuildingStats() {
  try {
    // Count rooms directly instead of using stored total_units column
    const query = `
      SELECT 
        COUNT(DISTINCT b.id) as total_buildings,
        COUNT(DISTINCT b.id) as active_buildings,
        COUNT(r.id) as total_units,
        COUNT(r.id) as active_units
      FROM buildings b
      LEFT JOIN rooms r ON r.building_id = b.id AND r.is_active = true
      WHERE b.is_active = true
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching building stats:', error);
    throw error;
  }
}

// Get occupancy statistics
export async function getOccupancyStats() {
  try {
    const query = `
      SELECT 
        COUNT(r.*) as total_rooms,
        COUNT(*) FILTER (WHERE r.room_status = 'occupied') as occupied_rooms,
        COUNT(*) FILTER (WHERE r.room_status = 'vacant') as vacant_rooms,
        COUNT(*) FILTER (WHERE r.room_status = 'maintenance') as maintenance_rooms,
        ROUND(
          (COUNT(*) FILTER (WHERE r.room_status = 'occupied')::DECIMAL / 
           NULLIF(COUNT(r.*), 0)) * 100, 2
        ) as occupancy_rate
      FROM rooms r
      INNER JOIN buildings b ON r.building_id = b.id
      WHERE r.is_active = true AND b.is_active = true
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching occupancy stats:', error);
    throw error;
  }
}

export async function countLandingFeaturedBuildings(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM buildings
    WHERE is_active = true AND COALESCE(show_on_landing_nearby, false) = true
    `
  );
  return parseInt(result.rows[0]?.count ?? '0', 10) || 0;
}

export async function getLandingFeaturedState(): Promise<{ count: number; max: number }> {
  const count = await countLandingFeaturedBuildings();
  return { count, max: LANDING_FEATURED_LIMIT };
}

// Update building
export async function updateBuilding(id: string, buildingData: Partial<CreateBuildingData>): Promise<Building> {
  try {
    if (buildingData.showOnLandingNearby === true) {
      const current = await getBuildingById(id);
      if (!current?.showOnLandingNearby) {
        const count = await countLandingFeaturedBuildings();
        if (count >= LANDING_FEATURED_LIMIT) {
          throw new LandingFeaturedFullError(count);
        }
      }
    }
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    Object.entries(buildingData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        const dbKey = key === 'addressLine1' ? 'address_line1' : 
                     key === 'addressLine2' ? 'address_line2' :
                     key === 'postalCode' ? 'postal_code' :
                     key === 'buildingType' ? 'building_type' :
                     key === 'yearBuilt' ? 'year_built' :
                     key === 'totalFloors' ? 'total_floors' :
                     key === 'autoLateFee' ? 'auto_late_fee' :
                     key === 'showOnLandingNearby' ? 'show_on_landing_nearby' :
                     key === 'googleMapsUrl' ? 'google_maps_url' :
                     key === 'geocodedAt' ? 'geocoded_at' :
                     key;
        updates.push(`${dbKey} = $${paramCount}`);
        values.push(
          key === 'addressLine1' || key === 'addressLine2' || key === 'googleMapsUrl'
            ? (typeof value === 'string' ? value.trim() || null : value)
            : value
        );
      }
    });

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    values.push(id);

    const query = `
      UPDATE buildings 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND is_active = true
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Building not found');
    }
    
    return mapDatabaseBuildingToBuilding(result.rows[0]);
  } catch (error) {
    console.error('Error updating building:', error);
    throw error;
  }
}

// Delete/deactivate building
export async function deleteBuilding(id: string): Promise<void> {
  try {
    const query = `
      UPDATE buildings 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await pool.query(query, [id]);
  } catch (error) {
    console.error('Error deleting building:', error);
    throw error;
  }
}

// Get building with room statistics
export async function getBuildingWithRoomStats(id: string): Promise<(Building & { roomStats: unknown }) | null> {
  try {
    const buildingQuery = `
      SELECT * FROM buildings 
      WHERE id = $1 AND is_active = true
    `;
    
    const roomStatsQuery = `
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(*) FILTER (WHERE room_status = 'vacant') as vacant_rooms,
        COUNT(*) FILTER (WHERE room_status = 'occupied') as occupied_rooms,
        COUNT(*) FILTER (WHERE room_status = 'maintenance') as maintenance_rooms,
        COUNT(*) FILTER (WHERE room_status = 'reserved') as reserved_rooms,
        ROUND(AVG(monthly_rate), 2) as average_rent,
        MIN(monthly_rate) as min_rent,
        MAX(monthly_rate) as max_rent
      FROM rooms 
      WHERE building_id = $1 AND is_active = true
    `;
    
    const [buildingResult, roomStatsResult] = await Promise.all([
      pool.query(buildingQuery, [id]),
      pool.query(roomStatsQuery, [id])
    ]);
    
    if (buildingResult.rows.length === 0) {
      return null;
    }
    
    const building = mapDatabaseBuildingToBuilding(buildingResult.rows[0]);
    const roomStats = roomStatsResult.rows[0];
    const totalRooms = parseInt(roomStats.total_rooms) || 0;
    const occupiedRooms = parseInt(roomStats.occupied_rooms) || 0;
    const vacantRooms = parseInt(roomStats.vacant_rooms) || 0;
    const occupancy = buildOccupancyReconciliation({
      totalUnits: totalRooms,
      occupied: occupiedRooms,
      vacant: vacantRooms,
    });
    assertOccupancyReconciles(occupancy, `building ${id}`);
    
    return {
      ...building,
      roomStats: {
        totalRooms: occupancy.totalUnits,
        vacantRooms: occupancy.vacant,
        occupiedRooms: occupancy.occupied,
        /** Derived: total − occupied − vacant (maintenance + reserved + other) */
        unassignedRooms: occupancy.unassigned,
        maintenanceRooms: parseInt(roomStats.maintenance_rooms) || 0,
        reservedRooms: parseInt(roomStats.reserved_rooms) || 0,
        averageRent: parseFloat(roomStats.average_rent) || 0,
        minRent: parseFloat(roomStats.min_rent) || 0,
        maxRent: parseFloat(roomStats.max_rent) || 0,
        occupancyRate: occupancy.occupiedPercent,
        reconciles: occupancy.reconciles,
      }
    };
  } catch (error) {
    console.error('Error fetching building with room stats:', error);
    throw error;
  }
} 