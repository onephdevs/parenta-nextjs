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
  profilePictureUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomAssignment {
  id: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  monthlyRate: number;
  startDate: Date;
  endDate?: Date;
  assignmentStatus: 'active' | 'terminated' | 'pending';
  depositPaid?: number;
  advancePaid?: number;
  utilityDepositPaid?: number;
  depositValidUntil?: Date;
  depositRefundable?: boolean;
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

export interface PaginatedTenantsResponse {
  tenants: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Get all tenants with pagination
export async function getAllTenants(options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<PaginatedTenantsResponse> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = '';
    const values: unknown[] = [];
    let paramCount = 0;

    if (options?.status) {
      paramCount++;
      whereClause += ` WHERE t.tenant_status = $${paramCount}`;
      values.push(options.status);
    }

    if (options?.search) {
      paramCount++;
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` (
        COALESCE(t.first_name, '') ILIKE $${paramCount}
        OR COALESCE(t.last_name, '') ILIKE $${paramCount}
        OR COALESCE(t.email, '') ILIKE $${paramCount}
        OR COALESCE(t.phone, '') ILIKE $${paramCount}
        OR COALESCE(b.name, '') ILIKE $${paramCount}
        OR COALESCE(r.room_number, '') ILIKE $${paramCount}
      )`;
      values.push(`%${options.search}%`);
    }

    // Get total count — join rooms/buildings when search may reference them
    const needsPropertyJoin = Boolean(options?.search);
    const countFrom = needsPropertyJoin
      ? ` FROM tenants t
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id
        AND tra.assignment_status = 'active'
        AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
      LEFT JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id`
      : ' FROM tenants t';
    const countQuery = `SELECT COUNT(DISTINCT t.id)${countFrom}${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated tenants with current monthly rent from active assignment
    const query = `
      SELECT 
        t.*,
        tra.monthly_rate as current_monthly_rent,
        r.room_number as current_room_number,
        b.id as current_building_id,
        b.name as current_building_name
      FROM tenants t
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id 
        AND tra.assignment_status = 'active'
        AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
      LEFT JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      ${whereClause}
      ORDER BY COALESCE(t.last_name, ''), COALESCE(t.first_name, ''), t.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    values.push(limit, offset);
    const result = await pool.query(query, values);
    const tenants = result.rows.map(mapRowToTenant);

    const totalPages = Math.ceil(total / limit);

    return {
      tenants,
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
    console.error('Error fetching tenants:', error);
    throw new Error(`Failed to fetch tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get tenant by ID with assignments
export async function getTenantById(id: string): Promise<TenantWithAssignments & { agreementDocumentId?: string | null; agreementDocumentName?: string | null; agreementDocumentUrl?: string | null } | null> {
  // First, check if tenant_agreement_document_id column exists
  let hasAgreementColumn = false;
  try {
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'tenant_agreement_document_id'
    `);
    hasAgreementColumn = columnCheck.rows.length > 0;
  } catch (error) {
    // If check fails, assume column doesn't exist
    hasAgreementColumn = false;
  }

  // Build query based on whether column exists
  let tenantQuery: string;
  if (hasAgreementColumn) {
    tenantQuery = `
      SELECT t.*, 
             d.id as agreement_document_id,
             d.document_name as agreement_document_name,
             d.file_path as agreement_document_url
      FROM tenants t
      LEFT JOIN documents d ON t.tenant_agreement_document_id = d.id
      WHERE t.id = $1
    `;
  } else {
    tenantQuery = `SELECT * FROM tenants WHERE id = $1`;
  }
  
  try {
    const tenantResult = await pool.query(tenantQuery, [id]);
    
    if (tenantResult.rows.length === 0) {
      return null;
    }

    const row = tenantResult.rows[0];
    const tenant = mapRowToTenant(row);

    // Get current assignment
    const currentAssignmentQuery = `
      SELECT 
        ra.*,
        r.id as room_id,
        r.room_number,
        b.name as building_name
      FROM tenant_room_assignments ra
      JOIN rooms r ON ra.room_id = r.id
      JOIN buildings b ON r.building_id = b.id
      WHERE ra.tenant_id = $1
        AND ra.assignment_status = 'active'
        AND (ra.end_date IS NULL OR ra.end_date::date >= CURRENT_DATE)
      ORDER BY ra.start_date DESC
      LIMIT 1
    `;

    const currentResult = await pool.query(currentAssignmentQuery, [id]);
    const currentAssignment = currentResult.rows.length > 0 ? mapRowToAssignment(currentResult.rows[0]) : undefined;

    // Get assignment history
    const historyQuery = `
      SELECT 
        ra.*,
        r.id as room_id,
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
      agreementDocumentId: hasAgreementColumn ? (row.agreement_document_id as string | null | undefined) : undefined,
      agreementDocumentName: hasAgreementColumn ? (row.agreement_document_name as string | null | undefined) : undefined,
      agreementDocumentUrl: hasAgreementColumn ? (row.agreement_document_url as string | null | undefined) : undefined,
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

// Create tenant
export async function createTenant(tenantData: Partial<Tenant>): Promise<Tenant> {
  const query = `
    INSERT INTO tenants (
      first_name, last_name, email, phone, date_of_birth,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      employment_status, employer_name, monthly_income, previous_address,
      security_deposit, tenant_status, lease_start_date, lease_end_date, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `;

  const values = [
    tenantData.firstName,
    tenantData.lastName,
    tenantData.email,
    tenantData.phone || null,
    tenantData.dateOfBirth || null,
    tenantData.emergencyContactName || null,
    tenantData.emergencyContactPhone || null,
    tenantData.emergencyContactRelationship || null,
    tenantData.employmentStatus || null,
    tenantData.employerName || null,
    tenantData.monthlyIncome || null,
    tenantData.previousAddress || null,
    tenantData.securityDeposit || null,
    tenantData.tenantStatus || 'pending',
    tenantData.leaseStartDate || null,
    tenantData.leaseEndDate || null,
    tenantData.notes || null,
  ];

  try {
    const result = await pool.query(query, values);
    return mapRowToTenant(result.rows[0]);
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw new Error(`Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to map database row to Tenant object
function mapRowToTenant(row: Record<string, unknown>): Tenant & { 
  profilePictureUrl?: string | null;
  currentMonthlyRent?: number;
  currentRoomNumber?: string;
  currentBuildingName?: string;
} {
  return {
    id: row.id as string,
    firstName: (row.first_name as string) || '',
    lastName: (row.last_name as string) || '',
    email: (row.email as string) || '',
    phone: (row.phone as string) || undefined,
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
    profilePictureUrl: row.profile_picture_url as string | null | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    // Add current monthly rent from active assignment
    currentMonthlyRent: row.current_monthly_rent ? parseFloat(row.current_monthly_rent as string) : undefined,
    currentRoomNumber: row.current_room_number as string | undefined,
    currentBuildingId: row.current_building_id as string | undefined,
    currentBuildingName: row.current_building_name as string | undefined,
  };
}

// Helper function to map database row to RoomAssignment object
function mapRowToAssignment(row: Record<string, unknown>): RoomAssignment {
  return {
    id: row.id as string,
    roomId: row.room_id as string,
    roomNumber: row.room_number as string,
    buildingName: row.building_name as string,
    monthlyRate: parseFloat(row.monthly_rate as string),
    startDate: new Date(row.start_date as string),
    endDate: row.end_date ? new Date(row.end_date as string) : undefined,
    assignmentStatus: row.assignment_status as 'active' | 'terminated' | 'pending',
    depositPaid: row.deposit_paid ? parseFloat(row.deposit_paid as string) : undefined,
    advancePaid: row.advance_paid ? parseFloat(row.advance_paid as string) : undefined,
    utilityDepositPaid: row.utility_deposit_paid ? parseFloat(row.utility_deposit_paid as string) : undefined,
    depositValidUntil: row.deposit_valid_until ? new Date(row.deposit_valid_until as string) : undefined,
    depositRefundable: row.deposit_refundable !== undefined ? (row.deposit_refundable as boolean) : undefined,
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