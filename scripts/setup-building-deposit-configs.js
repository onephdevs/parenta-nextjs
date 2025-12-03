/**
 * Setup Building Deposit Configurations
 * 
 * This script sets up building-specific deposit, advance, and utility deposit requirements:
 * 
 * - Balibago: 2 months deposit (9,600) + 1 month advance (4,800) + Utility deposit (1k)
 * - Villasol: 1 month deposit (6k) + 1 month advance (6k) + Utility deposit (3k)
 * 
 * Usage: node scripts/setup-building-deposit-configs.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupBuildingConfigs() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get building IDs by name
    const buildingsResult = await client.query(`
      SELECT id, name FROM buildings 
      WHERE is_active = true 
      AND (name ILIKE '%Balibago%' OR name ILIKE '%Villasol%')
    `);

    const buildings = {};
    buildingsResult.rows.forEach(row => {
      if (row.name.includes('Balibago')) {
        buildings.balibago = row.id;
      }
      if (row.name.includes('Villasol')) {
        buildings.villasol = row.id;
      }
    });

    console.log('Found buildings:');
    console.log('Balibago:', buildings.balibago);
    console.log('Villasol:', buildings.villasol);

    // Setup Balibago: 2 months deposit (9,600) + 1 month advance (4,800) + Utility deposit (1k)
    if (buildings.balibago) {
      // Assuming monthly rate is 4,800 (2 months = 9,600, 1 month = 4,800)
      const monthlyRate = 4800;
      const depositMonths = 2; // 2 months = 9,600
      const advanceMonths = 1; // 1 month = 4,800
      const utilityDeposit = 1000;

      await client.query(`
        INSERT INTO building_deposit_config (
          building_id,
          deposit_months,
          deposit_type,
          advance_months,
          advance_type,
          utility_deposit_amount,
          deposit_validity_days,
          deposit_refundable_after_days,
          minimum_deposit_amount,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (building_id) 
        DO UPDATE SET
          deposit_months = EXCLUDED.deposit_months,
          deposit_type = EXCLUDED.deposit_type,
          advance_months = EXCLUDED.advance_months,
          advance_type = EXCLUDED.advance_type,
          utility_deposit_amount = EXCLUDED.utility_deposit_amount,
          deposit_validity_days = EXCLUDED.deposit_validity_days,
          deposit_refundable_after_days = EXCLUDED.deposit_refundable_after_days,
          minimum_deposit_amount = EXCLUDED.minimum_deposit_amount,
          updated_at = CURRENT_TIMESTAMP
      `, [
        buildings.balibago,
        depositMonths,
        'months',
        advanceMonths,
        'months',
        utilityDeposit,
        5, // 5 days validity
        5, // non-refundable after 5 days
        3000, // minimum deposit
        true
      ]);

      console.log(`✅ Configured Balibago building:`);
      console.log(`   - Deposit: ${depositMonths} months (${monthlyRate * depositMonths})`);
      console.log(`   - Advance: ${advanceMonths} month (${monthlyRate * advanceMonths})`);
      console.log(`   - Utility Deposit: ${utilityDeposit}`);
    } else {
      console.log('⚠️  Balibago building not found');
    }

    // Setup Villasol: 1 month deposit (6k) + 1 month advance (6k) + Utility deposit (3k)
    if (buildings.villasol) {
      // Assuming monthly rate is 6,000 (1 month = 6,000)
      const monthlyRate = 6000;
      const depositMonths = 1; // 1 month = 6,000
      const advanceMonths = 1; // 1 month = 6,000
      const utilityDeposit = 3000;

      await client.query(`
        INSERT INTO building_deposit_config (
          building_id,
          deposit_months,
          deposit_type,
          advance_months,
          advance_type,
          utility_deposit_amount,
          deposit_validity_days,
          deposit_refundable_after_days,
          minimum_deposit_amount,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (building_id) 
        DO UPDATE SET
          deposit_months = EXCLUDED.deposit_months,
          deposit_type = EXCLUDED.deposit_type,
          advance_months = EXCLUDED.advance_months,
          advance_type = EXCLUDED.advance_type,
          utility_deposit_amount = EXCLUDED.utility_deposit_amount,
          deposit_validity_days = EXCLUDED.deposit_validity_days,
          deposit_refundable_after_days = EXCLUDED.deposit_refundable_after_days,
          minimum_deposit_amount = EXCLUDED.minimum_deposit_amount,
          updated_at = CURRENT_TIMESTAMP
      `, [
        buildings.villasol,
        depositMonths,
        'months',
        advanceMonths,
        'months',
        utilityDeposit,
        5, // 5 days validity
        5, // non-refundable after 5 days
        3000, // minimum deposit
        true
      ]);

      console.log(`✅ Configured Villasol building:`);
      console.log(`   - Deposit: ${depositMonths} month (${monthlyRate * depositMonths})`);
      console.log(`   - Advance: ${advanceMonths} month (${monthlyRate * advanceMonths})`);
      console.log(`   - Utility Deposit: ${utilityDeposit}`);
    } else {
      console.log('⚠️  Villasol building not found');
    }

    await client.query('COMMIT');
    console.log('\n✅ Building deposit configurations setup complete!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up building configs:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupBuildingConfigs()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
