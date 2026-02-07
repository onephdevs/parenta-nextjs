/**
 * Run maintenance_requests table migration
 * Ensures tenant-submitted maintenance requests appear in admin dashboard.
 * Usage: node scripts/run-maintenance-requests-migration.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('supabase') || dbUrl.includes('vercel') ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    const exists = await pool.query(`
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_requests'
    `);
    if (exists.rows.length > 0) {
      console.log('maintenance_requests table already exists. No migration needed.');
      pool.end();
      process.exit(0);
    }
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add-maintenance-requests-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('maintenance_requests table created successfully.');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    pool.end();
  }
}

main();
