/**
 * Run database migrations for building deposit config
 * Usage: node scripts/run-migrations.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n📄 Running migration: ${path.basename(filePath)}`);
  
  try {
    await pool.query(sql);
    console.log(`✅ Successfully ran: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log(`⚠️  Migration already applied (skipping): ${path.basename(filePath)}`);
      return true;
    }
    console.error(`❌ Error running ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying migrations...\n');
  
  const checks = [
    {
      name: 'building_deposit_config table',
      query: `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'building_deposit_config'
      );`
    },
    {
      name: 'tenant_room_assignments new columns',
      query: `SELECT COUNT(*) as count FROM information_schema.columns 
        WHERE table_name = 'tenant_room_assignments' 
        AND column_name IN ('advance_paid', 'utility_deposit_paid', 'deposit_valid_until', 'deposit_refundable');`
    },
    {
      name: 'reservations new columns',
      query: `SELECT COUNT(*) as count FROM information_schema.columns 
        WHERE table_name = 'reservations' 
        AND column_name IN ('advance_amount', 'utility_deposit_amount', 'deposit_valid_until');`
    }
  ];

  for (const check of checks) {
    try {
      const result = await pool.query(check.query);
      if (check.name.includes('table')) {
        console.log(`  ${check.name}: ${result.rows[0].exists ? '✅ Exists' : '❌ Missing'}`);
      } else {
        const count = parseInt(result.rows[0].count);
        const expected = check.name.includes('assignments') ? 4 : 3;
        console.log(`  ${check.name}: ${count === expected ? `✅ All ${expected} columns exist` : `❌ Only ${count}/${expected} columns found`}`);
      }
    } catch (error) {
      console.log(`  ${check.name}: ❌ Error - ${error.message}`);
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Please ensure .env.local file exists with DATABASE_URL');
    process.exit(1);
  }

  console.log('🚀 Starting database migrations...\n');
  console.log(`📊 Database: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

  const migrations = [
    path.join(__dirname, '..', 'migrations', 'add-building-deposit-config.sql'),
    path.join(__dirname, '..', 'migrations', 'add-advance-utility-deposit-to-assignments.sql'),
    path.join(__dirname, '..', 'migrations', 'add-advance-utility-to-reservations.sql'),
  ];

  let allSuccess = true;
  for (const migration of migrations) {
    if (!fs.existsSync(migration)) {
      console.error(`❌ Migration file not found: ${migration}`);
      allSuccess = false;
      continue;
    }
    const success = await runMigration(migration);
    if (!success) allSuccess = false;
  }

  if (allSuccess) {
    await verifyTables();
    console.log('\n✅ All migrations completed successfully!\n');
  } else {
    console.log('\n⚠️  Some migrations had issues. Please review the errors above.\n');
    process.exit(1);
  }

  await pool.end();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

