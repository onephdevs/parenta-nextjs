const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
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

    // Run Reservations Migration
    console.log('📋 Running Migration: Reservations Table...');
    const migrationSql = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', 'add-reservations-table.sql'),
      'utf8'
    );
    
    await pool.query(migrationSql);
    console.log('✅ Reservations table created with indexes\n');

    // Verify migration
    console.log('🔍 Verifying migration...');
    
    const tableCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'reservations'
    `);
    console.log(`   ✓ Reservations table exists: ${tableCheck.rows[0].count > 0 ? 'Yes' : 'No'}`);

    const indexesCheck = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'reservations'
      ORDER BY indexname
    `);
    console.log(`   ✓ Indexes created: ${indexesCheck.rows.length} indexes`);
    indexesCheck.rows.forEach(row => {
      console.log(`      - ${row.indexname}`);
    });

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Check if it's an "already exists" error
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Table or indexes already exist - this is OK');
    } else {
      console.error('Error details:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();

