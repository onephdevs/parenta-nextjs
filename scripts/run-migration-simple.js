/**
 * Run migration using the standard database connection
 * This uses the same connection pool as the application
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('supabase') || dbUrl.includes('vercel') 
    ? { rejectUnauthorized: false } 
    : false,
});

async function runMigration() {
  try {
    console.log('🚀 Starting migration: add-downpayment-payment-type\n');

    // Test connection
    console.log('🔗 Testing connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected\n');

    // Check current constraint
    console.log('📋 Checking current constraint...');
    const currentCheck = await pool.query(`
      SELECT constraint_name, check_clause 
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'payments_payment_type_check'
    `);

    if (currentCheck.rows.length > 0) {
      console.log('   Current constraint:', currentCheck.rows[0].check_clause);
      if (currentCheck.rows[0].check_clause.includes('downpayment')) {
        console.log('   ✅ Downpayment already included!');
        console.log('\n✅ Migration already applied - no changes needed!');
        process.exit(0);
      }
    } else {
      console.log('   No existing constraint found');
    }

    // Step 1: Drop existing constraint
    console.log('\n📝 Step 1: Dropping existing constraint...');
    await pool.query('ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check');
    console.log('✅ Constraint dropped');

    // Step 2: Add new constraint with downpayment
    console.log('\n📝 Step 2: Adding new constraint with downpayment...');
    await pool.query(`
      ALTER TABLE payments 
      ADD CONSTRAINT payments_payment_type_check 
      CHECK (payment_type IN ('rent', 'deposit', 'downpayment', 'late_fee', 'utility', 'asset_rental', 'other'))
    `);
    console.log('✅ New constraint added');

    // Step 3: Add comment
    console.log('\n📝 Step 3: Adding comment...');
    await pool.query(`
      COMMENT ON COLUMN payments.payment_type IS 'Payment type: rent, deposit, downpayment, late_fee, utility, asset_rental, or other'
    `);
    console.log('✅ Comment added');

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const result = await pool.query(`
      SELECT constraint_name, check_clause 
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'payments_payment_type_check'
    `);

    if (result.rows.length > 0) {
      const constraint = result.rows[0];
      const hasDownpayment = constraint.check_clause.includes('downpayment');

      console.log('\n✅ Migration completed successfully!');
      console.log('   Constraint Name:', constraint.constraint_name);
      console.log('   Check Clause:', constraint.check_clause);
      console.log('   Downpayment Included:', hasDownpayment ? '✅ Yes' : '❌ No');
    } else {
      console.log('\n⚠️  Warning: Constraint not found after migration');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

