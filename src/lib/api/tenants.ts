import pool from '@/lib/db';

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  tenantStatus: 'active' | 'pending' | 'inactive' | 'terminated';
  moveInDate?: Date;
  moveOutDate?: Date;
  previousAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  employmentStatus?: string;
  employerName?: string;
  monthlyIncome?: number;
  securityDeposit?: number;
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomAssignment {
  id: string;
  roomNumber: string;
  buildingName: string;
  monthlyRate: number;
  startDate: Date;
  endDate?: Date;
  assignmentStatus: 'active' | 'terminated' | 'pending';
  notes?: string;
}

export interface TenantWithAssignments extends Tenant {
  currentAssignment?: RoomAssignment;
  assignmentHistory: RoomAssignment[];
}

export interface TenantStats {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  averageIncome: number;
}

// Get all tenants
export async function getAllTenants(): Promise<Tenant[]> {
  const query = `
    SELECT * FROM tenants 
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query);
    return result.rows.map(mapRowToTenant);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    throw new Error(`Failed to fetch tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get tenant by ID with assignments
export async function getTenantById(id: string): Promise<TenantWithAssignments | null> {
  const tenantQuery = `SELECT * FROM tenants WHERE id = $1`;
  
  try {
    const tenantResult = await pool.query(tenantQuery, [id]);
    
    if (tenantResult.rows.length === 0) {
      return null;
    }

    const tenant = mapRowToTenant(tenantResult.rows[0]);

    // Get current assignment
    const currentAssignmentQuery = `
      SELECT 
        ra.*,
        r.room_number,
        b.name as building_name
      FROM tenant_room_assignments ra
      JOIN rooms r ON ra.room_id = r.id
      JOIN buildings b ON r.building_id = b.id
      WHERE ra.tenant_id = $1 AND ra.assignment_status = 'active'
      ORDER BY ra.start_date DESC
      LIMIT 1
    `;

    const currentResult = await pool.query(currentAssignmentQuery, [id]);
    const currentAssignment = currentResult.rows.length > 0 ? mapRowToAssignment(currentResult.rows[0]) : undefined;

    // Get assignment history
    const historyQuery = `
      SELECT 
        ra.*,
        r.room_number,
        b.name as building_name
      FROM tenant_room_assignments ra
      JOIN rooms r ON ra.room_id = r.id
      JOIN buildings b ON r.building_id = b.id
      WHERE ra.tenant_id = $1
      ORDER BY ra.start_date DESC
    `;

    const historyResult = await pool.query(historyQuery, [id]);
    const assignmentHistory = historyResult.rows.map(mapRowToAssignment);

    return {
      ...tenant,
      currentAssignment,
      assignmentHistory,
    };
  } catch (error) {
    console.error('Error fetching tenant:', error);
    throw new Error(`Failed to fetch tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get tenant statistics
export async function getTenantStats(): Promise<TenantStats> {
  const query = `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN tenant_status = 'active' THEN 1 END) as active,
      COUNT(CASE WHEN tenant_status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN tenant_status = 'inactive' THEN 1 END) as inactive,
      AVG(monthly_income) as average_income
    FROM tenants
  `;

  try {
    const result = await pool.query(query);
    const row = result.rows[0];

    return {
      total: parseInt(row.total),
      active: parseInt(row.active),
      pending: parseInt(row.pending),
      inactive: parseInt(row.inactive),
      averageIncome: parseFloat(row.average_income || 0),
    };
  } catch (error) {
    console.error('Error fetching tenant stats:', error);
    throw new Error(`Failed to fetch tenant stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to map database row to Tenant object
function mapRowToTenant(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    phone: row.phone as string,
    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth as string) : undefined,
    tenantStatus: row.tenant_status as 'active' | 'pending' | 'inactive' | 'terminated',
    moveInDate: row.move_in_date ? new Date(row.move_in_date as string) : undefined,
    moveOutDate: row.move_out_date ? new Date(row.move_out_date as string) : undefined,
    previousAddress: row.previous_address as string,
    emergencyContactName: row.emergency_contact_name as string,
    emergencyContactPhone: row.emergency_contact_phone as string,
    emergencyContactRelationship: row.emergency_contact_relationship as string,
    employmentStatus: row.employment_status as string,
    employerName: row.employer_name as string,
    monthlyIncome: row.monthly_income ? parseFloat(row.monthly_income as string) : undefined,
    securityDeposit: row.security_deposit ? parseFloat(row.security_deposit as string) : undefined,
    leaseStartDate: row.lease_start_date ? new Date(row.lease_start_date as string) : undefined,
    leaseEndDate: row.lease_end_date ? new Date(row.lease_end_date as string) : undefined,
    notes: row.notes as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// Helper function to map database row to RoomAssignment object
function mapRowToAssignment(row: Record<string, unknown>): RoomAssignment {
  return {
    id: row.id as string,
    roomNumber: row.room_number as string,
    buildingName: row.building_name as string,
    monthlyRate: parseFloat(row.monthly_rate as string),
    startDate: new Date(row.start_date as string),
    endDate: row.end_date ? new Date(row.end_date as string) : undefined,
    assignmentStatus: row.assignment_status as 'active' | 'terminated' | 'pending',
    notes: row.notes as string,
  };
}

// Update tenant
export async function updateTenant(id: string, updates: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tenantStatus: string;
  notes: string;
}>): Promise<boolean> {
  const setClause: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.firstName !== undefined) {
    setClause.push(`first_name = $${paramIndex}`);
    values.push(updates.firstName);
    paramIndex++;
  }

  if (updates.lastName !== undefined) {
    setClause.push(`last_name = $${paramIndex}`);
    values.push(updates.lastName);
    paramIndex++;
  }

  if (updates.email !== undefined) {
    setClause.push(`email = $${paramIndex}`);
    values.push(updates.email);
    paramIndex++;
  }

  if (updates.phone !== undefined) {
    setClause.push(`phone = $${paramIndex}`);
    values.push(updates.phone);
    paramIndex++;
  }

  if (updates.tenantStatus !== undefined) {
    setClause.push(`tenant_status = $${paramIndex}`);
    values.push(updates.tenantStatus);
    paramIndex++;
  }

  if (updates.notes !== undefined) {
    setClause.push(`notes = $${paramIndex}`);
    values.push(updates.notes);
    paramIndex++;
  }

  if (setClause.length === 0) {
    return true;
  }

  setClause.push(`updated_at = $${paramIndex}`);
  values.push(new Date());
  paramIndex++;

  const query = `
    UPDATE tenants 
    SET ${setClause.join(', ')}
    WHERE id = $${paramIndex}
  `;
  
  values.push(id);

  try {
    const result = await pool.query(query, values);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error updating tenant:', error);
    throw new Error(`Failed to update tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Delete tenant
export async function deleteTenant(id: string): Promise<boolean> {
  try {
    const result = await pool.query('DELETE FROM tenants WHERE id = $1', [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting tenant:', error);
    throw new Error(`Failed to delete tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Assign tenant to room
export async function assignTenantToRoom(tenantId: string, roomId: string, moveInDate: string): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // End any existing assignments for this tenant
    await client.query(
      'UPDATE tenant_room_assignments SET assignment_status = $1, end_date = CURRENT_DATE WHERE tenant_id = $2 AND assignment_status = $3',
      ['terminated', tenantId, 'active']
    );

    // Create new assignment
    await client.query(
      'INSERT INTO tenant_room_assignments (tenant_id, room_id, start_date, assignment_status) VALUES ($1, $2, $3, $4)',
      [tenantId, roomId, moveInDate, 'active']
    );

    // Update tenant status to active
    await client.query(
      'UPDATE tenants SET tenant_status = $1, move_in_date = $2 WHERE id = $3',
      ['active', moveInDate, tenantId]
    );

    // Update room status to occupied
    await client.query(
      'UPDATE rooms SET status = $1 WHERE id = $2',
      ['occupied', roomId]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning tenant to room:', error);
    throw new Error(`Failed to assign tenant to room: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

// End tenant assignment
export async function endTenantAssignment(tenantId: string, roomId: string, moveOutDate: string): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // End the assignment
    await client.query(
      'UPDATE tenant_room_assignments SET assignment_status = $1, end_date = $2 WHERE tenant_id = $3 AND room_id = $4 AND assignment_status = $5',
      ['terminated', moveOutDate, tenantId, roomId, 'active']
    );

    // Update tenant status to inactive
    await client.query(
      'UPDATE tenants SET tenant_status = $1, move_out_date = $2 WHERE id = $3',
      ['inactive', moveOutDate, tenantId]
    );

    // Update room status to available
    await client.query(
      'UPDATE rooms SET status = $1 WHERE id = $2',
      ['available', roomId]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error ending tenant assignment:', error);
    throw new Error(`Failed to end tenant assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
} 