import pool from '../db';
import { UtilityMeterReading, DatabaseUtilityMeterReading, CreateMeterReadingData } from '../../types/database';

// Helper function to map database meter reading to UtilityMeterReading interface
function mapDatabaseMeterReadingToMeterReading(dbReading: DatabaseUtilityMeterReading): UtilityMeterReading {
  return {
    id: dbReading.id,
    buildingId: dbReading.building_id,
    roomId: dbReading.room_id,
    utilityType: dbReading.utility_type,
    meterNumber: dbReading.meter_number,
    readingDate: dbReading.reading_date,
    readingValue: dbReading.reading_value,
    previousReading: dbReading.previous_reading,
    usageCalculated: dbReading.usage_calculated,
    notes: dbReading.notes,
    createdAt: dbReading.created_at
  };
}

// Get all meter readings with optional filters
export async function getAllMeterReadings(filters: {
  buildingId?: string;
  roomId?: string;
  utilityType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
} = {}) {
  try {
    let query = `
      SELECT 
        umr.*,
        b.name as building_name,
        r.room_number,
        LAG(umr.reading_value) OVER (
          PARTITION BY umr.building_id, umr.room_id, umr.utility_type, umr.meter_number 
          ORDER BY umr.reading_date
        ) as calculated_previous_reading
      FROM utility_meter_readings umr
      LEFT JOIN buildings b ON umr.building_id = b.id
      LEFT JOIN rooms r ON umr.room_id = r.id
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.buildingId) {
      query += ` AND umr.building_id = $${paramIndex}`;
      params.push(filters.buildingId);
      paramIndex++;
    }

    if (filters.roomId) {
      query += ` AND umr.room_id = $${paramIndex}`;
      params.push(filters.roomId);
      paramIndex++;
    }

    if (filters.utilityType) {
      query += ` AND umr.utility_type = $${paramIndex}`;
      params.push(filters.utilityType);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND umr.reading_date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND umr.reading_date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ` ORDER BY umr.reading_date DESC, umr.utility_type ASC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM utility_meter_readings umr
      WHERE 1=1
    `;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (filters.buildingId) {
      countQuery += ` AND umr.building_id = $${countParamIndex}`;
      countParams.push(filters.buildingId);
      countParamIndex++;
    }

    if (filters.roomId) {
      countQuery += ` AND umr.room_id = $${countParamIndex}`;
      countParams.push(filters.roomId);
      countParamIndex++;
    }

    if (filters.utilityType) {
      countQuery += ` AND umr.utility_type = $${countParamIndex}`;
      countParams.push(filters.utilityType);
      countParamIndex++;
    }

    if (filters.startDate) {
      countQuery += ` AND umr.reading_date >= $${countParamIndex}`;
      countParams.push(filters.startDate);
      countParamIndex++;
    }

    if (filters.endDate) {
      countQuery += ` AND umr.reading_date <= $${countParamIndex}`;
      countParams.push(filters.endDate);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    const readings = result.rows.map((row: any) => ({
      ...mapDatabaseMeterReadingToMeterReading(row),
      buildingName: row.building_name,
      roomNumber: row.room_number,
      calculatedPreviousReading: row.calculated_previous_reading
    }));

    return {
      readings,
      total,
      limit: filters.limit || total,
      offset: filters.offset || 0
    };
  } catch (error) {
    console.error('Error fetching meter readings:', error);
    throw error;
  }
}

// Get meter reading by ID
export async function getMeterReadingById(id: string): Promise<UtilityMeterReading | null> {
  try {
    const query = `
      SELECT 
        umr.*,
        b.name as building_name,
        r.room_number
      FROM utility_meter_readings umr
      LEFT JOIN buildings b ON umr.building_id = b.id
      LEFT JOIN rooms r ON umr.room_id = r.id
      WHERE umr.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapDatabaseMeterReadingToMeterReading(result.rows[0]);
  } catch (error) {
    console.error('Error fetching meter reading:', error);
    throw error;
  }
}

// Create meter reading with automatic previous reading calculation
export async function createMeterReading(readingData: CreateMeterReadingData): Promise<UtilityMeterReading> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get the most recent reading for this meter to calculate previous reading
    const previousReadingQuery = `
      SELECT reading_value
      FROM utility_meter_readings
      WHERE building_id = $1
        AND utility_type = $2
        AND (room_id = $3 OR (room_id IS NULL AND $3 IS NULL))
        AND (meter_number = $4 OR (meter_number IS NULL AND $4 IS NULL))
        AND reading_date < $5
      ORDER BY reading_date DESC
      LIMIT 1
    `;

    const previousResult = await client.query(previousReadingQuery, [
      readingData.buildingId,
      readingData.utilityType,
      readingData.roomId,
      readingData.meterNumber,
      readingData.readingDate
    ]);

    const previousReading = previousResult.rows.length > 0 ? previousResult.rows[0].reading_value : null;

    // Insert the new reading
    const insertQuery = `
      INSERT INTO utility_meter_readings (
        building_id, room_id, utility_type, meter_number,
        reading_date, reading_value, previous_reading, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      readingData.buildingId,
      readingData.roomId,
      readingData.utilityType,
      readingData.meterNumber,
      readingData.readingDate,
      readingData.readingValue,
      previousReading,
      readingData.notes
    ];

    const result = await client.query(insertQuery, values);
    
    await client.query('COMMIT');
    
    return mapDatabaseMeterReadingToMeterReading(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating meter reading:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Update meter reading
export async function updateMeterReading(id: string, readingData: Partial<CreateMeterReadingData>): Promise<UtilityMeterReading> {
  try {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    Object.entries(readingData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        const dbKey = key === 'buildingId' ? 'building_id' :
                     key === 'roomId' ? 'room_id' :
                     key === 'utilityType' ? 'utility_type' :
                     key === 'meterNumber' ? 'meter_number' :
                     key === 'readingDate' ? 'reading_date' :
                     key === 'readingValue' ? 'reading_value' :
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
      UPDATE utility_meter_readings 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Meter reading not found');
    }

    return mapDatabaseMeterReadingToMeterReading(result.rows[0]);
  } catch (error) {
    console.error('Error updating meter reading:', error);
    throw error;
  }
}

// Delete meter reading
export async function deleteMeterReading(id: string): Promise<boolean> {
  try {
    const result = await pool.query('DELETE FROM utility_meter_readings WHERE id = $1', [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting meter reading:', error);
    throw error;
  }
}

// Get meter reading statistics
export async function getMeterReadingStats(buildingId?: string, roomId?: string) {
  try {
    let query = `
      SELECT 
        utility_type,
        COUNT(*) as total_readings,
        COUNT(DISTINCT building_id) as buildings_count,
        COUNT(DISTINCT room_id) as rooms_count,
        COUNT(DISTINCT meter_number) as meters_count,
        AVG(usage_calculated) as average_usage,
        SUM(usage_calculated) as total_usage,
        MIN(reading_date) as first_reading_date,
        MAX(reading_date) as last_reading_date,
        AVG(reading_value) as average_reading_value
      FROM utility_meter_readings
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (buildingId) {
      query += ` AND building_id = $${paramIndex}`;
      params.push(buildingId);
      paramIndex++;
    }

    if (roomId) {
      query += ` AND room_id = $${paramIndex}`;
      params.push(roomId);
      paramIndex++;
    }

    query += ` GROUP BY utility_type ORDER BY total_usage DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching meter reading stats:', error);
    throw error;
  }
}

// Get consumption trends over time
export async function getConsumptionTrends(buildingId?: string, roomId?: string, months: number = 12) {
  try {
    let query = `
      SELECT 
        utility_type,
        DATE_TRUNC('month', reading_date) as month,
        COUNT(*) as readings_count,
        AVG(usage_calculated) as average_usage,
        SUM(usage_calculated) as total_usage,
        MIN(usage_calculated) as min_usage,
        MAX(usage_calculated) as max_usage,
        AVG(reading_value) as average_reading
      FROM utility_meter_readings
      WHERE reading_date >= CURRENT_DATE - INTERVAL '${months} months'
        AND usage_calculated > 0
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (buildingId) {
      query += ` AND building_id = $${paramIndex}`;
      params.push(buildingId);
      paramIndex++;
    }

    if (roomId) {
      query += ` AND room_id = $${paramIndex}`;
      params.push(roomId);
      paramIndex++;
    }

    query += `
      GROUP BY utility_type, DATE_TRUNC('month', reading_date)
      ORDER BY month DESC, utility_type ASC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching consumption trends:', error);
    throw error;
  }
}

// Get meters that need readings (based on schedule)
export async function getMetersNeedingReadings(daysFromLastReading: number = 30) {
  try {
    const query = `
      WITH latest_readings AS (
        SELECT DISTINCT ON (building_id, room_id, utility_type, meter_number)
          building_id,
          room_id,
          utility_type,
          meter_number,
          reading_date,
          reading_value
        FROM utility_meter_readings
        ORDER BY building_id, room_id, utility_type, meter_number, reading_date DESC
      )
      SELECT 
        lr.*,
        b.name as building_name,
        r.room_number,
        CURRENT_DATE - lr.reading_date as days_since_reading
      FROM latest_readings lr
      LEFT JOIN buildings b ON lr.building_id = b.id
      LEFT JOIN rooms r ON lr.room_id = r.id
      WHERE CURRENT_DATE - lr.reading_date >= $1
      ORDER BY days_since_reading DESC, b.name ASC, r.room_number ASC
    `;

    const result = await pool.query(query, [daysFromLastReading]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching meters needing readings:', error);
    throw error;
  }
}

// Get usage comparison between periods
export async function getUsageComparison(
  buildingId: string,
  currentStartDate: string,
  currentEndDate: string,
  previousStartDate: string,
  previousEndDate: string
) {
  try {
    const query = `
      WITH current_period AS (
        SELECT 
          utility_type,
          SUM(usage_calculated) as current_usage,
          COUNT(*) as current_readings,
          AVG(usage_calculated) as current_avg_usage
        FROM utility_meter_readings
        WHERE building_id = $1
          AND reading_date BETWEEN $2 AND $3
          AND usage_calculated > 0
        GROUP BY utility_type
      ),
      previous_period AS (
        SELECT 
          utility_type,
          SUM(usage_calculated) as previous_usage,
          COUNT(*) as previous_readings,
          AVG(usage_calculated) as previous_avg_usage
        FROM utility_meter_readings
        WHERE building_id = $1
          AND reading_date BETWEEN $4 AND $5
          AND usage_calculated > 0
        GROUP BY utility_type
      )
      SELECT 
        COALESCE(cp.utility_type, pp.utility_type) as utility_type,
        COALESCE(cp.current_usage, 0) as current_usage,
        COALESCE(pp.previous_usage, 0) as previous_usage,
        COALESCE(cp.current_readings, 0) as current_readings,
        COALESCE(pp.previous_readings, 0) as previous_readings,
        COALESCE(cp.current_avg_usage, 0) as current_avg_usage,
        COALESCE(pp.previous_avg_usage, 0) as previous_avg_usage,
        CASE 
          WHEN pp.previous_usage > 0 
          THEN ((cp.current_usage - pp.previous_usage) / pp.previous_usage) * 100
          ELSE NULL
        END as usage_change_percent
      FROM current_period cp
      FULL OUTER JOIN previous_period pp ON cp.utility_type = pp.utility_type
      ORDER BY current_usage DESC
    `;

    const result = await pool.query(query, [
      buildingId,
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    ]);

    return result.rows;
  } catch (error) {
    console.error('Error fetching usage comparison:', error);
    throw error;
  }
} 