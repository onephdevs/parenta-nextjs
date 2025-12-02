/**
 * Building Deposit Configuration API
 * Handles building-specific deposit, advance, and utility deposit rules
 */

import pool from '@/lib/db';

export interface BuildingDepositConfig {
  id: string;
  buildingId: string;
  depositMonths: number;
  depositType: 'fixed' | 'percentage' | 'months';
  depositAmount?: number;
  depositPercentage?: number;
  advanceMonths: number;
  advanceType: 'fixed' | 'percentage' | 'months';
  advanceAmount?: number;
  advancePercentage?: number;
  utilityDepositAmount: number;
  depositValidityDays: number;
  depositRefundableAfterDays: number;
  minimumDepositAmount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseBuildingDepositConfig {
  id: string;
  building_id: string;
  deposit_months: number;
  deposit_type: 'fixed' | 'percentage' | 'months';
  deposit_amount?: number;
  deposit_percentage?: number;
  advance_months: number;
  advance_type: 'fixed' | 'percentage' | 'months';
  advance_amount?: number;
  advance_percentage?: number;
  utility_deposit_amount: number;
  deposit_validity_days: number;
  deposit_refundable_after_days: number;
  minimum_deposit_amount: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBuildingDepositConfigData {
  buildingId: string;
  depositMonths?: number;
  depositType?: 'fixed' | 'percentage' | 'months';
  depositAmount?: number;
  depositPercentage?: number;
  advanceMonths?: number;
  advanceType?: 'fixed' | 'percentage' | 'months';
  advanceAmount?: number;
  advancePercentage?: number;
  utilityDepositAmount?: number;
  depositValidityDays?: number;
  depositRefundableAfterDays?: number;
  minimumDepositAmount?: number;
  isActive?: boolean;
}

// Helper function to map database row to BuildingDepositConfig
function mapDatabaseConfigToConfig(row: DatabaseBuildingDepositConfig): BuildingDepositConfig {
  return {
    id: row.id,
    buildingId: row.building_id,
    depositMonths: parseFloat(row.deposit_months.toString()),
    depositType: row.deposit_type,
    depositAmount: row.deposit_amount ? parseFloat(row.deposit_amount.toString()) : undefined,
    depositPercentage: row.deposit_percentage ? parseFloat(row.deposit_percentage.toString()) : undefined,
    advanceMonths: parseFloat(row.advance_months.toString()),
    advanceType: row.advance_type,
    advanceAmount: row.advance_amount ? parseFloat(row.advance_amount.toString()) : undefined,
    advancePercentage: row.advance_percentage ? parseFloat(row.advance_percentage.toString()) : undefined,
    utilityDepositAmount: parseFloat(row.utility_deposit_amount.toString()),
    depositValidityDays: row.deposit_validity_days,
    depositRefundableAfterDays: row.deposit_refundable_after_days,
    minimumDepositAmount: parseFloat(row.minimum_deposit_amount.toString()),
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get deposit configuration for a building
 */
export async function getBuildingDepositConfig(buildingId: string): Promise<BuildingDepositConfig | null> {
  try {
    const query = `
      SELECT * FROM building_deposit_config
      WHERE building_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [buildingId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return mapDatabaseConfigToConfig(result.rows[0]);
  } catch (error) {
    console.error('Error fetching building deposit config:', error);
    throw error;
  }
}

/**
 * Create or update building deposit configuration
 */
export async function createBuildingDepositConfig(
  buildingId: string,
  config: CreateBuildingDepositConfigData
): Promise<BuildingDepositConfig> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if building exists
    const buildingCheck = await client.query('SELECT id FROM buildings WHERE id = $1', [buildingId]);
    if (buildingCheck.rows.length === 0) {
      throw new Error('Building not found');
    }
    
    // Check if config already exists
    const existingConfig = await client.query(
      'SELECT id FROM building_deposit_config WHERE building_id = $1',
      [buildingId]
    );
    
    if (existingConfig.rows.length > 0) {
      // Update existing config
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 0;
      
      if (config.depositMonths !== undefined) {
        paramCount++;
        updateFields.push(`deposit_months = $${paramCount}`);
        values.push(config.depositMonths);
      }
      
      if (config.depositType !== undefined) {
        paramCount++;
        updateFields.push(`deposit_type = $${paramCount}`);
        values.push(config.depositType);
      }
      
      if (config.depositAmount !== undefined) {
        paramCount++;
        updateFields.push(`deposit_amount = $${paramCount}`);
        values.push(config.depositAmount);
      }
      
      if (config.depositPercentage !== undefined) {
        paramCount++;
        updateFields.push(`deposit_percentage = $${paramCount}`);
        values.push(config.depositPercentage);
      }
      
      if (config.advanceMonths !== undefined) {
        paramCount++;
        updateFields.push(`advance_months = $${paramCount}`);
        values.push(config.advanceMonths);
      }
      
      if (config.advanceType !== undefined) {
        paramCount++;
        updateFields.push(`advance_type = $${paramCount}`);
        values.push(config.advanceType);
      }
      
      if (config.advanceAmount !== undefined) {
        paramCount++;
        updateFields.push(`advance_amount = $${paramCount}`);
        values.push(config.advanceAmount);
      }
      
      if (config.advancePercentage !== undefined) {
        paramCount++;
        updateFields.push(`advance_percentage = $${paramCount}`);
        values.push(config.advancePercentage);
      }
      
      if (config.utilityDepositAmount !== undefined) {
        paramCount++;
        updateFields.push(`utility_deposit_amount = $${paramCount}`);
        values.push(config.utilityDepositAmount);
      }
      
      if (config.depositValidityDays !== undefined) {
        paramCount++;
        updateFields.push(`deposit_validity_days = $${paramCount}`);
        values.push(config.depositValidityDays);
      }
      
      if (config.depositRefundableAfterDays !== undefined) {
        paramCount++;
        updateFields.push(`deposit_refundable_after_days = $${paramCount}`);
        values.push(config.depositRefundableAfterDays);
      }
      
      if (config.minimumDepositAmount !== undefined) {
        paramCount++;
        updateFields.push(`minimum_deposit_amount = $${paramCount}`);
        values.push(config.minimumDepositAmount);
      }
      
      if (config.isActive !== undefined) {
        paramCount++;
        updateFields.push(`is_active = $${paramCount}`);
        values.push(config.isActive);
      }
      
      paramCount++;
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(existingConfig.rows[0].id);
      
      const updateQuery = `
        UPDATE building_deposit_config
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, values);
      await client.query('COMMIT');
      
      return mapDatabaseConfigToConfig(updateResult.rows[0]);
    } else {
      // Create new config
      const insertQuery = `
        INSERT INTO building_deposit_config (
          building_id, deposit_months, deposit_type, deposit_amount, deposit_percentage,
          advance_months, advance_type, advance_amount, advance_percentage,
          utility_deposit_amount, deposit_validity_days, deposit_refundable_after_days,
          minimum_deposit_amount, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const insertResult = await client.query(insertQuery, [
        buildingId,
        config.depositMonths ?? 1,
        config.depositType ?? 'months',
        config.depositAmount ?? null,
        config.depositPercentage ?? null,
        config.advanceMonths ?? 1,
        config.advanceType ?? 'months',
        config.advanceAmount ?? null,
        config.advancePercentage ?? null,
        config.utilityDepositAmount ?? 0,
        config.depositValidityDays ?? 5,
        config.depositRefundableAfterDays ?? 5,
        config.minimumDepositAmount ?? 3000,
        config.isActive ?? true,
      ]);
      
      await client.query('COMMIT');
      return mapDatabaseConfigToConfig(insertResult.rows[0]);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating/updating building deposit config:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate required deposit based on building configuration and monthly rate
 */
export async function calculateRequiredDeposit(
  buildingId: string,
  monthlyRate: number
): Promise<number> {
  const config = await getBuildingDepositConfig(buildingId);
  
  if (!config) {
    // No building config, return minimum deposit
    return 3000; // Default minimum
  }
  
  switch (config.depositType) {
    case 'fixed':
      return config.depositAmount || config.minimumDepositAmount;
    
    case 'percentage':
      if (config.depositPercentage) {
        const calculated = (monthlyRate * config.depositPercentage) / 100;
        return Math.max(calculated, config.minimumDepositAmount);
      }
      return config.minimumDepositAmount;
    
    case 'months':
      const calculated = monthlyRate * config.depositMonths;
      return Math.max(calculated, config.minimumDepositAmount);
    
    default:
      return config.minimumDepositAmount;
  }
}

/**
 * Calculate required advance payment based on building configuration and monthly rate
 */
export async function calculateRequiredAdvance(
  buildingId: string,
  monthlyRate: number
): Promise<number> {
  const config = await getBuildingDepositConfig(buildingId);
  
  if (!config) {
    return 0; // No advance required if no config
  }
  
  switch (config.advanceType) {
    case 'fixed':
      return config.advanceAmount || 0;
    
    case 'percentage':
      if (config.advancePercentage) {
        return (monthlyRate * config.advancePercentage) / 100;
      }
      return 0;
    
    case 'months':
      return monthlyRate * config.advanceMonths;
    
    default:
      return 0;
  }
}

/**
 * Get utility deposit amount for a building
 */
export async function getUtilityDeposit(buildingId: string): Promise<number> {
  const config = await getBuildingDepositConfig(buildingId);
  return config?.utilityDepositAmount || 0;
}

/**
 * Validate deposit amount meets building requirements
 */
export async function validateDepositAmount(
  buildingId: string,
  monthlyRate: number,
  depositAmount: number
): Promise<{ valid: boolean; required: number; message?: string }> {
  const required = await calculateRequiredDeposit(buildingId, monthlyRate);
  
  if (depositAmount < required) {
    return {
      valid: false,
      required,
      message: `Deposit must be at least ${required.toLocaleString()}. Provided: ${depositAmount.toLocaleString()}`,
    };
  }
  
  return {
    valid: true,
    required,
  };
}

/**
 * Get deposit validity date (current date + validity days)
 */
export async function getDepositValidityDate(buildingId: string, startDate?: Date): Promise<Date> {
  const config = await getBuildingDepositConfig(buildingId);
  const validityDays = config?.depositValidityDays || 5;
  
  const baseDate = startDate || new Date();
  const validityDate = new Date(baseDate);
  validityDate.setDate(validityDate.getDate() + validityDays);
  
  return validityDate;
}

/**
 * Check if deposit is refundable based on validity period
 */
export async function isDepositRefundable(
  buildingId: string,
  depositValidUntil: Date
): Promise<boolean> {
  const config = await getBuildingDepositConfig(buildingId);
  const refundableAfterDays = config?.depositRefundableAfterDays || 5;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const validUntil = new Date(depositValidUntil);
  validUntil.setHours(0, 0, 0, 0);
  
  // If today is after the validity date + refundable period, deposit is non-refundable
  const cutoffDate = new Date(validUntil);
  cutoffDate.setDate(cutoffDate.getDate() + refundableAfterDays);
  
  return today <= cutoffDate;
}

