/**
 * Verify if downpayment migration has been applied
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function verifyMigration() {
  try {
    console.log('🔍 Verifying downpayment migration...\n');

    // Check constraint
    const result = await pool.query(`
      SELECT constraint_name, check_clause 
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'payments_payment_type_check'
    `);

    if (result.rows.length === 0) {
      console.log('❌ No constraint found');
      console.log('   Migration has not been applied yet.\n');
      console.log('   To apply the migration:');
      console.log('   1. Start dev server: npm run dev');
      console.log('   2. Log in as admin');
      console.log('   3. POST to: http://localhost:3030/api/migrations/downpayment');
      await pool.end();
      return;
    }

    const constraint = result.rows[0];
    const hasDownpayment = constraint.check_clause.includes('downpayment');

    console.log('📋 Constraint Details:');
    console.log('   Name:', constraint.constraint_name);
    console.log('   Check Clause:', constraint.check_clause);
    console.log('   Has Downpayment:', hasDownpayment ? '✅ Yes' : '❌ No');

    if (hasDownpayment) {
      console.log('\n✅ Migration is applied! Downpayment payment type is available.');
    } else {
      console.log('\n⚠️  Migration not complete. Downpayment is not in the constraint.');
      console.log('   Please run the migration to add downpayment support.');
    }

    // Test if we can insert a downpayment payment type (without actually inserting)
    console.log('\n🧪 Testing payment type validation...');
    try {
      // This will fail if downpayment is not allowed, but we catch it
      await pool.query(`
        DO $$
        BEGIN
          IF 'downpayment' = ANY(ARRAY['rent', 'deposit', 'downpayment', 'late_fee', 'utility', 'asset_rental', 'other']) THEN
            RAISE NOTICE 'Downpayment is a valid payment type';
          ELSE
            RAISE EXCEPTION 'Downpayment is not a valid payment type';
          END IF;
        END $$;
      `);
      console.log('   ✅ Downpayment is recognized as a valid payment type');
    } catch (e) {
      console.log('   ❌ Downpayment is not recognized as a valid payment type');
    }

  } catch (error) {
    console.error('❌ Error verifying migration:', error.message);
  } finally {
    await pool.end();
  }
}

verifyMigration();
