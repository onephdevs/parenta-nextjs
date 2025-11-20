/**
 * Database Migration Runner
 * Runs all Phase 2 migrations
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migrations = [
  {
    name: 'Late Fees System',
    file: 'migrations/add-late-fees-system.sql'
  },
  {
    name: 'Notifications System',
    file: 'migrations/add-notifications-system.sql'
  },
  {
    name: 'Lease Management',
    file: 'migrations/add-lease-management.sql'
  },
  {
    name: 'Dashboard Reports',
    file: 'migrations/add-dashboard-reports.sql'
  }
];

async function runMigrations() {
  console.log('🗄️  Starting Phase 2 Database Migrations...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of migrations) {
    try {
      console.log(`📝 Running: ${migration.name}...`);
      
      // Check if file exists
      if (!fs.existsSync(migration.file)) {
        console.log(`   ⚠️  File not found: ${migration.file}`);
        console.log(`   ⏭️  Skipping...\n`);
        continue;
      }
      
      // Read SQL file
      const sql = fs.readFileSync(migration.file, 'utf8');
      
      // Execute migration
      await pool.query(sql);
      
      console.log(`   ✅ Success!\n`);
      successCount++;
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      
      // Check if it's a "already exists" error
      if (error.message.includes('already exists')) {
        console.log(`   ℹ️  Tables already exist - this is OK\n`);
        successCount++;
      } else {
        failCount++;
        console.log(`   Error details: ${error.message.split('\n')[0]}\n`);
      }
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Migration Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total migrations: ${migrations.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the APIs: ./test-endpoints-exist.sh');
    console.log('2. Test manually in browser: See MANUAL-API-TESTING-GUIDE.md');
    console.log('3. Deploy to production: ./scripts/deploy-with-manual-nodejs.sh');
  } else {
    console.log('\n⚠️  Some migrations failed. Please review the errors above.');
  }
  
  await pool.end();
  process.exit(failCount > 0 ? 1 : 0);
}

// Run migrations
runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

