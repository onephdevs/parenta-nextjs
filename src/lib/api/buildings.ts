import pool from '@/lib/db';
import type { Building, DatabaseBuilding, CreateBuildingData } from '@/types/database';

// Helper function to map database building to app building
function mapDatabaseBuildingToBuilding(dbBuilding: DatabaseBuilding): Building {
  return {
    id: dbBuilding.id,
    name: dbBuilding.name,
    addressLine1: dbBuilding.address_line1,
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
    createdAt: dbBuilding.created_at,
    updatedAt: dbBuilding.updated_at,
  };
}

// Get all buildings
export async function getAllBuildings(): Promise<Building[]> {
  try {
    const query = `
      SELECT * FROM buildings 
      WHERE is_active = true 
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query);
    return result.rows.map(mapDatabaseBuildingToBuilding);
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
    const query = `
      INSERT INTO buildings (
        name, address_line1, address_line2, city, state, postal_code, 
        country, description, building_type, year_built, total_floors, amenities
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      buildingData.name,
      buildingData.addressLine1,
      buildingData.addressLine2,
      buildingData.city,
      buildingData.state,
      buildingData.postalCode,
      buildingData.country || 'USA',
      buildingData.description,
      buildingData.buildingType || 'residential',
      buildingData.yearBuilt,
      buildingData.totalFloors,
      buildingData.amenities || []
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
    const query = `
      SELECT 
        COUNT(*) as total_buildings,
        COUNT(*) FILTER (WHERE is_active = true) as active_buildings,
        SUM(total_units) as total_units,
        SUM(total_units) FILTER (WHERE is_active = true) as active_units
      FROM buildings
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
        COUNT(*) as total_rooms,
        COUNT(*) FILTER (WHERE room_status = 'occupied') as occupied_rooms,
        COUNT(*) FILTER (WHERE room_status = 'vacant') as vacant_rooms,
        COUNT(*) FILTER (WHERE room_status = 'maintenance') as maintenance_rooms,
        ROUND(
          (COUNT(*) FILTER (WHERE room_status = 'occupied')::DECIMAL / 
           NULLIF(COUNT(*), 0)) * 100, 2
        ) as occupancy_rate
      FROM rooms 
      WHERE is_active = true
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching occupancy stats:', error);
    throw error;
  }
}

// Update building
export async function updateBuilding(id: string, buildingData: Partial<CreateBuildingData>): Promise<Building> {
  try {
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
                     key;
        updates.push(`${dbKey} = $${paramCount}`);
        values.push(value);
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
    
    return {
      ...building,
      roomStats: {
        totalRooms: parseInt(roomStats.total_rooms) || 0,
        vacantRooms: parseInt(roomStats.vacant_rooms) || 0,
        occupiedRooms: parseInt(roomStats.occupied_rooms) || 0,
        maintenanceRooms: parseInt(roomStats.maintenance_rooms) || 0,
        reservedRooms: parseInt(roomStats.reserved_rooms) || 0,
        averageRent: parseFloat(roomStats.average_rent) || 0,
        minRent: parseFloat(roomStats.min_rent) || 0,
        maxRent: parseFloat(roomStats.max_rent) || 0,
        occupancyRate: roomStats.total_rooms > 0 ? 
          Math.round((roomStats.occupied_rooms / roomStats.total_rooms) * 100) : 0
      }
    };
  } catch (error) {
    console.error('Error fetching building with room stats:', error);
    throw error;
  }
} 