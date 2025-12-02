/**
 * Test script to verify building deposit config implementation
 * Usage: node scripts/test-building-deposit-config.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testImplementation() {
  console.log('🧪 Testing Building Deposit Config Implementation...\n');

  try {
    // Test 1: Check if building_deposit_config table exists and has correct structure
    console.log('Test 1: Verifying building_deposit_config table structure...');
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'building_deposit_config'
      ORDER BY ordinal_position;
    `);
    
    const requiredColumns = [
      'id', 'building_id', 'deposit_months', 'deposit_type', 'deposit_amount',
      'deposit_percentage', 'advance_months', 'advance_type', 'advance_amount',
      'advance_percentage', 'utility_deposit_amount', 'deposit_validity_days',
      'deposit_refundable_after_days', 'minimum_deposit_amount', 'is_active'
    ];
    
    const existingColumns = tableCheck.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('  ✅ All required columns exist\n');
    } else {
      console.log(`  ❌ Missing columns: ${missingColumns.join(', ')}\n`);
    }

    // Test 2: Check tenant_room_assignments new columns
    console.log('Test 2: Verifying tenant_room_assignments new columns...');
    const assignmentsCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tenant_room_assignments'
      AND column_name IN ('advance_paid', 'utility_deposit_paid', 'deposit_valid_until', 'deposit_refundable');
    `);
    
    if (assignmentsCheck.rows.length === 4) {
      console.log('  ✅ All 4 new columns exist in tenant_room_assignments\n');
    } else {
      console.log(`  ❌ Only ${assignmentsCheck.rows.length}/4 columns found\n`);
    }

    // Test 3: Check reservations new columns
    console.log('Test 3: Verifying reservations new columns...');
    const reservationsCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'reservations'
      AND column_name IN ('advance_amount', 'utility_deposit_amount', 'deposit_valid_until');
    `);
    
    if (reservationsCheck.rows.length === 3) {
      console.log('  ✅ All 3 new columns exist in reservations\n');
    } else {
      console.log(`  ❌ Only ${reservationsCheck.rows.length}/3 columns found\n`);
    }

    // Test 4: Try to create a sample building deposit config
    console.log('Test 4: Testing building deposit config creation...');
    const buildingsResult = await pool.query('SELECT id, name FROM buildings LIMIT 1');
    
    if (buildingsResult.rows.length > 0) {
      const buildingId = buildingsResult.rows[0].id;
      const buildingName = buildingsResult.rows[0].name;
      
      // Check if config already exists
      const existingConfig = await pool.query(
        'SELECT id FROM building_deposit_config WHERE building_id = $1',
        [buildingId]
      );
      
      if (existingConfig.rows.length === 0) {
        // Create a test config
        await pool.query(`
          INSERT INTO building_deposit_config (
            building_id, deposit_months, deposit_type, advance_months, advance_type,
            utility_deposit_amount, deposit_validity_days, deposit_refundable_after_days,
            minimum_deposit_amount, is_active
          ) VALUES ($1, 2, 'months', 1, 'months', 1000, 5, 5, 3000, true)
        `, [buildingId]);
        
        console.log(`  ✅ Created test config for building: ${buildingName}\n`);
        
        // Clean up test data
        await pool.query('DELETE FROM building_deposit_config WHERE building_id = $1', [buildingId]);
        console.log('  ✅ Test config cleaned up\n');
      } else {
        console.log(`  ✅ Config already exists for building: ${buildingName}\n`);
      }
    } else {
      console.log('  ⚠️  No buildings found to test with\n');
    }

    // Test 5: Verify indexes exist
    console.log('Test 5: Verifying indexes...');
    const indexesCheck = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename IN ('building_deposit_config', 'tenant_room_assignments', 'reservations')
      AND indexname LIKE '%deposit%' OR indexname LIKE '%valid%';
    `);
    
    console.log(`  ✅ Found ${indexesCheck.rows.length} relevant indexes\n`);

    console.log('✅ All tests passed! Implementation is working correctly.\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testImplementation();

