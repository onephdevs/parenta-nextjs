import pool from './db';
import type { CreateBuildingData, CreateTenantData } from '@/types/database';

// Sample data for testing
const sampleBuildings: CreateBuildingData[] = [
  {
    name: 'Sunset Apartments',
    addressLine1: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'USA',
    description: 'Modern apartment building in downtown SF',
    buildingType: 'residential',
    yearBuilt: 2015,
    totalFloors: 4,
    amenities: ['elevator', 'laundry', 'parking', 'gym']
  },
  {
    name: 'Oak Tree Residences',
    addressLine1: '456 Oak Avenue',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94103',
    country: 'USA',
    description: 'Quiet residential building with garden',
    buildingType: 'residential',
    yearBuilt: 2018,
    totalFloors: 3,
    amenities: ['garden', 'laundry', 'parking']
  }
];

const sampleRooms = [
  // Sunset Apartments rooms
  { roomNumber: '101', floorNumber: 1, roomType: 'studio', monthlyRate: 2500, depositAmount: 2500 },
  { roomNumber: '102', floorNumber: 1, roomType: 'one_bedroom', monthlyRate: 3200, depositAmount: 3200 },
  { roomNumber: '201', floorNumber: 2, roomType: 'one_bedroom', monthlyRate: 3400, depositAmount: 3400 },
  { roomNumber: '202', floorNumber: 2, roomType: 'two_bedroom', monthlyRate: 4500, depositAmount: 4500 },
  { roomNumber: '301', floorNumber: 3, roomType: 'two_bedroom', monthlyRate: 4800, depositAmount: 4800 },
  
  // Oak Tree Residences rooms  
  { roomNumber: 'A1', floorNumber: 1, roomType: 'studio', monthlyRate: 2200, depositAmount: 2200 },
  { roomNumber: 'A2', floorNumber: 1, roomType: 'one_bedroom', monthlyRate: 2800, depositAmount: 2800 },
  { roomNumber: 'B1', floorNumber: 2, roomType: 'one_bedroom', monthlyRate: 3000, depositAmount: 3000 },
  { roomNumber: 'B2', floorNumber: 2, roomType: 'two_bedroom', monthlyRate: 3800, depositAmount: 3800 },
  { roomNumber: 'C1', floorNumber: 3, roomType: 'two_bedroom', monthlyRate: 4000, depositAmount: 4000 }
];

const sampleTenants: CreateTenantData[] = [
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '(555) 123-4567',
    emergencyContactName: 'Jane Smith',
    emergencyContactPhone: '(555) 987-6543',
    emergencyContactRelationship: 'Spouse',
    employmentStatus: 'employed',
    employerName: 'Tech Corp',
    monthlyIncome: 8000,
    securityDeposit: 3200
  },
  {
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@example.com',
    phone: '(555) 234-5678',
    emergencyContactName: 'Carlos Garcia',
    emergencyContactPhone: '(555) 876-5432',
    emergencyContactRelationship: 'Brother',
    employmentStatus: 'employed',
    employerName: 'Design Studio',
    monthlyIncome: 6500,
    securityDeposit: 2500
  },
  {
    firstName: 'David',
    lastName: 'Chen',
    email: 'david.chen@example.com',
    phone: '(555) 345-6789',
    emergencyContactName: 'Lisa Chen',
    emergencyContactPhone: '(555) 765-4321',
    emergencyContactRelationship: 'Sister',
    employmentStatus: 'employed',
    employerName: 'StartUp Inc',
    monthlyIncome: 7500,
    securityDeposit: 4500
  }
];

const sampleDocumentCategories = [
  { name: 'Leases', description: 'Rental lease agreements' },
  { name: 'Invoices', description: 'Billing and invoice documents' },
  { name: 'Receipts', description: 'Payment receipts' },
  { name: 'Maintenance', description: 'Maintenance and repair records' },
  { name: 'Legal', description: 'Legal documents and contracts' },
  { name: 'Photos', description: 'Property and unit photos' }
];

export async function seedDatabase(): Promise<void> {
  try {
    console.log('Starting database seeding...');
    
    // Start transaction
    await pool.query('BEGIN');
    
    // Seed document categories first
    console.log('Seeding document categories...');
    for (const category of sampleDocumentCategories) {
      await pool.query(
        'INSERT INTO document_categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [category.name, category.description]
      );
    }
    
    // Seed buildings
    console.log('Seeding buildings...');
    const buildingIds: string[] = [];
    for (const building of sampleBuildings) {
      const result = await pool.query(`
        INSERT INTO buildings (name, address_line1, city, state, postal_code, country, description, building_type, year_built, total_floors, amenities)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        building.name,
        building.addressLine1,
        building.city,
        building.state,
        building.postalCode,
        building.country,
        building.description,
        building.buildingType,
        building.yearBuilt,
        building.totalFloors,
        building.amenities
      ]);
      
      if (result.rows.length > 0) {
        buildingIds.push(result.rows[0].id);
      }
    }
    
    // Seed rooms
    console.log('Seeding rooms...');
    if (buildingIds.length >= 2) {
      // First 5 rooms for first building
      for (let i = 0; i < 5; i++) {
        const room = sampleRooms[i];
        await pool.query(`
          INSERT INTO rooms (building_id, room_number, floor_number, room_type, monthly_rate, deposit_amount)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (building_id, room_number) DO NOTHING
        `, [
          buildingIds[0],
          room.roomNumber,
          room.floorNumber,
          room.roomType,
          room.monthlyRate,
          room.depositAmount
        ]);
      }
      
      // Next 5 rooms for second building
      for (let i = 5; i < 10; i++) {
        const room = sampleRooms[i];
        await pool.query(`
          INSERT INTO rooms (building_id, room_number, floor_number, room_type, monthly_rate, deposit_amount)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (building_id, room_number) DO NOTHING
        `, [
          buildingIds[1],
          room.roomNumber,
          room.floorNumber,
          room.roomType,
          room.monthlyRate,
          room.depositAmount
        ]);
      }
    }
    
    // Seed tenants
    console.log('Seeding tenants...');
    const tenantIds: string[] = [];
    for (const tenant of sampleTenants) {
      const result = await pool.query(`
        INSERT INTO tenants (first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, employment_status, employer_name, monthly_income, security_deposit)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        tenant.firstName,
        tenant.lastName,
        tenant.email,
        tenant.phone,
        tenant.emergencyContactName,
        tenant.emergencyContactPhone,
        tenant.emergencyContactRelationship,
        tenant.employmentStatus,
        tenant.employerName,
        tenant.monthlyIncome,
        tenant.securityDeposit
      ]);
      
      if (result.rows.length > 0) {
        tenantIds.push(result.rows[0].id);
      }
    }
    
    // Get some room IDs for assignments
    const roomsResult = await pool.query('SELECT id FROM rooms LIMIT 3');
    const roomIds = roomsResult.rows.map(row => row.id);
    
    // Create some tenant room assignments
    console.log('Creating tenant room assignments...');
    if (tenantIds.length > 0 && roomIds.length > 0) {
      for (let i = 0; i < Math.min(tenantIds.length, roomIds.length); i++) {
        await pool.query(`
          INSERT INTO tenant_room_assignments (tenant_id, room_id, start_date, monthly_rate, assignment_status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [
          tenantIds[i],
          roomIds[i],
          new Date('2024-01-01'),
          sampleRooms[i].monthlyRate,
          'active'
        ]);
        
        // Update room status to occupied
        await pool.query(
          'UPDATE rooms SET room_status = $1 WHERE id = $2',
          ['occupied', roomIds[i]]
        );
      }
    }
    
    // Update building total_units
    console.log('Updating building unit counts...');
    await pool.query(`
      UPDATE buildings 
      SET total_units = (
        SELECT COUNT(*) 
        FROM rooms 
        WHERE rooms.building_id = buildings.id 
        AND rooms.is_active = true
      )
    `);
    
    // Commit transaction
    await pool.query('COMMIT');
    
    console.log('Database seeding completed successfully!');
    console.log(`- Created ${sampleBuildings.length} buildings`);
    console.log(`- Created ${sampleRooms.length} rooms`);
    console.log(`- Created ${sampleTenants.length} tenants`);
    console.log(`- Created ${sampleDocumentCategories.length} document categories`);
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Function to clear all data (for testing)
export async function clearDatabase(): Promise<void> {
  try {
    console.log('Clearing database...');
    
    await pool.query('BEGIN');
    
    // Clear in reverse dependency order
    await pool.query('DELETE FROM tenant_room_assignments');
    await pool.query('DELETE FROM tenants');
    await pool.query('DELETE FROM rooms');
    await pool.query('DELETE FROM buildings');
    await pool.query('DELETE FROM document_categories');
    
    await pool.query('COMMIT');
    
    console.log('Database cleared successfully!');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error clearing database:', error);
    throw error;
  }
} 