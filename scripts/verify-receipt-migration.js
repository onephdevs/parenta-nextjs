/**
 * Verify receipt fields migration
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verify() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name LIKE 'receipt%' 
      ORDER BY column_name
    `);

    console.log('\n📋 Receipt columns in payments table:');
    if (result.rows.length === 0) {
      console.log('  ❌ No receipt columns found');
    } else {
      result.rows.forEach(row => {
        console.log(`  ✅ ${row.column_name} (${row.data_type})`);
      });
      console.log(`\n✅ Found ${result.rows.length} receipt-related columns\n`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verify();
