const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database successfully\n');

    // Migration 1: App Settings
    console.log('📋 Running Migration 1: App Settings Table...');
    const appSettingsSql = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', 'add-app-settings.sql'),
      'utf8'
    );
    
    await pool.query(appSettingsSql);
    console.log('✅ App Settings table created and seeded\n');

    // Migration 2: Room Deposit Configuration
    console.log('📋 Running Migration 2: Room Deposit Configuration...');
    const depositConfigSql = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', 'add-room-deposit-config.sql'),
      'utf8'
    );
    
    await pool.query(depositConfigSql);
    console.log('✅ Room deposit configuration columns added\n');

    // Verify migrations
    console.log('🔍 Verifying migrations...');
    
    // Check app_settings table
    const settingsCheck = await pool.query(`
      SELECT COUNT(*) as count FROM app_settings WHERE key = 'currency'
    `);
    console.log(`   ✓ App settings table: ${settingsCheck.rows[0].count} currency record found`);

    // Check rooms table columns
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' 
        AND column_name IN ('deposit_required', 'deposit_type', 'deposit_amount', 'deposit_percentage')
      ORDER BY column_name
    `);
    console.log(`   ✓ Rooms table: ${columnsCheck.rows.length}/4 deposit columns added`);
    columnsCheck.rows.forEach(row => {
      console.log(`     - ${row.column_name}`);
    });

    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   • App settings table created with currency configuration (PHP default)');
    console.log('   • Room deposit configuration columns added');
    console.log('   • Existing rooms set to require one month deposit by default');
    console.log('\n✨ Your application is now ready to use the new features!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();

