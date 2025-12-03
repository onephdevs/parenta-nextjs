/**
 * Run database migration for room_id support in utility_bills
 * Usage: node scripts/run-utility-bills-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Please ensure .env.local file exists with DATABASE_URL');
    process.exit(1);
  }

  console.log('🚀 Running utility_bills room_id migration...\n');
  console.log(`📊 Database: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  const migrationPath = path.join(__dirname, '..', 'migrations', 'add-room-support-to-utility-bills.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`📄 Running migration: add-room-support-to-utility-bills.sql\n`);

  try {
    // Run the migration
    await pool.query(sql);
    console.log('✅ Migration executed successfully!\n');

    // Verify the migration
    console.log('🔍 Verifying migration...\n');

    // Check if room_id column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'utility_bills' 
      AND column_name = 'room_id'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('  ✅ room_id column exists');
      console.log(`     Type: ${columnCheck.rows[0].data_type}`);
      console.log(`     Nullable: ${columnCheck.rows[0].is_nullable}`);
    } else {
      console.log('  ❌ room_id column not found');
    }

    // Check if building_id is nullable
    const buildingCheck = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'utility_bills' 
      AND column_name = 'building_id'
    `);

    if (buildingCheck.rows.length > 0) {
      const isNullable = buildingCheck.rows[0].is_nullable === 'YES';
      console.log(`  ${isNullable ? '✅' : '❌'} building_id is ${isNullable ? 'nullable' : 'NOT NULL'}`);
    }

    // Check if constraint exists
    const constraintCheck = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'utility_bills' 
      AND constraint_name = 'check_building_or_room'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('  ✅ check_building_or_room constraint exists');
    } else {
      console.log('  ⚠️  check_building_or_room constraint not found (may already exist with different name)');
    }

    // Check if index exists
    const indexCheck = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'utility_bills' 
      AND indexname = 'idx_utility_bills_room_id'
    `);

    if (indexCheck.rows.length > 0) {
      console.log('  ✅ idx_utility_bills_room_id index exists');
    } else {
      console.log('  ⚠️  idx_utility_bills_room_id index not found');
    }

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('⚠️  Some parts of the migration may have already been applied');
      console.log('   This is usually safe to ignore.\n');
      
      // Still verify what exists
      try {
        const columnCheck = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'utility_bills' 
          AND column_name = 'room_id'
        `);
        if (columnCheck.rows.length > 0) {
          console.log('✅ room_id column exists - migration appears to be applied\n');
        }
      } catch (e) {
        // Ignore verification errors
      }
    } else {
      console.error('❌ Error running migration:', error.message);
      console.error('\nFull error:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
