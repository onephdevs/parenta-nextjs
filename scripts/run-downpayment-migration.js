/**
 * Run migration to add downpayment payment type
 * Usage: node scripts/run-downpayment-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.DATABASE_URL?.includes('vercel') 
    ? { rejectUnauthorized: false } 
    : false
});

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Please ensure .env.local file exists with DATABASE_URL');
    process.exit(1);
  }

  console.log('🚀 Starting migration: add-downpayment-payment-type\n');
  console.log(`📊 Database: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  try {
    // Test connection first
    console.log('🔗 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add-downpayment-payment-type.sql');
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Running migration SQL...\n');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      console.log(`   Step ${i + 1}/${statements.length}: ${statement.substring(0, 60)}...`);
      try {
        await pool.query(statement);
        console.log(`   ✅ Step ${i + 1} completed\n`);
      } catch (error) {
        // Check if it's a "constraint already exists" or similar non-critical error
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('does not exist')) {
          console.log(`   ⚠️  Step ${i + 1}: ${error.message.split('\n')[0]}\n`);
        } else {
          throw error;
        }
      }
    }

    // Verify migration
    console.log('🔍 Verifying migration...\n');
    const result = await pool.query(`
      SELECT constraint_name, check_clause 
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'payments_payment_type_check'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Migration completed successfully!\n');
      console.log('   Constraint Name:', result.rows[0].constraint_name);
      console.log('   Check Clause:', result.rows[0].check_clause);
      
      // Check if downpayment is in the constraint
      if (result.rows[0].check_clause.includes('downpayment')) {
        console.log('\n✅ Downpayment payment type is now available!');
      } else {
        console.log('\n⚠️  Warning: Downpayment not found in constraint');
      }
    } else {
      console.log('⚠️  Warning: Constraint not found after migration');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   Error code:', error.code);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
