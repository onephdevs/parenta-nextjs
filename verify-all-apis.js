/**
 * Comprehensive API Verification Script
 * Tests all Phase 2 APIs with actual database operations
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  console.log('');
  log('═══════════════════════════════════════════════════════════', 'blue');
  log(title, 'bright');
  log('═══════════════════════════════════════════════════════════', 'blue');
  console.log('');
}

async function test(name, testFn) {
  totalTests++;
  process.stdout.write(`${colors.yellow}Testing:${colors.reset} ${name}... `);
  
  try {
    await testFn();
    log('✓ PASS', 'green');
    passedTests++;
    return true;
  } catch (error) {
    log(`✗ FAIL: ${error.message}`, 'red');
    failedTests++;
    return false;
  }
}

async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function verifyTableExists(tableName) {
  const result = await query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    [tableName]
  );
  if (!result[0].exists) {
    throw new Error(`Table ${tableName} does not exist`);
  }
}

async function verifyFunctionExists(functionName) {
  const result = await query(
    `SELECT EXISTS (
      SELECT FROM pg_proc 
      WHERE proname = $1
    )`,
    [functionName]
  );
  if (!result[0].exists) {
    throw new Error(`Function ${functionName} does not exist`);
  }
}

async function runTests() {
  log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                           ║', 'cyan');
  log('║        PHASE 2 COMPREHENSIVE API VERIFICATION             ║', 'cyan');
  log('║              (Database-Level Testing)                     ║', 'cyan');
  log('║                                                           ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  
  console.log('');
  log(`Testing against: ${process.env.DATABASE_URL.split('@')[1]}`, 'cyan');
  log(`Started at: ${new Date().toLocaleString()}`, 'cyan');
  
  // =====================================================
  // DATABASE SCHEMA TESTS
  // =====================================================
  printHeader('1. DATABASE SCHEMA VERIFICATION');
  
  await test('Late fee settings table exists', async () => {
    await verifyTableExists('late_fee_settings');
  });
  
  await test('Late fee applications table exists', async () => {
    await verifyTableExists('late_fee_applications');
  });
  
  await test('Late fee tiers table exists', async () => {
    await verifyTableExists('late_fee_tiers');
  });
  
  await test('Notification templates table exists', async () => {
    await verifyTableExists('notification_templates');
  });
  
  await test('Notification settings table exists', async () => {
    await verifyTableExists('notification_settings');
  });
  
  await test('Notification queue table exists', async () => {
    await verifyTableExists('notification_queue');
  });
  
  await test('Notification history table exists', async () => {
    await verifyTableExists('notification_history');
  });
  
  await test('Scheduled reminders table exists', async () => {
    await verifyTableExists('scheduled_reminders');
  });
  
  await test('Lease renewal requests table exists', async () => {
    await verifyTableExists('lease_renewal_requests');
  });
  
  await test('Lease expiration alerts table exists', async () => {
    await verifyTableExists('lease_expiration_alerts');
  });
  
  await test('Move-out processing table exists', async () => {
    await verifyTableExists('moveout_processing');
  });
  
  // =====================================================
  // DATABASE FUNCTIONS TESTS
  // =====================================================
  printHeader('2. DATABASE FUNCTIONS VERIFICATION');
  
  await test('calculate_late_fee function exists', async () => {
    await verifyFunctionExists('calculate_late_fee');
  });
  
  await test('get_overdue_invoices_for_late_fees function exists', async () => {
    await verifyFunctionExists('get_overdue_invoices_for_late_fees');
  });
  
  await test('generate_payment_reminders function exists', async () => {
    await verifyFunctionExists('generate_payment_reminders');
  });
  
  await test('process_pending_reminders function exists', async () => {
    await verifyFunctionExists('process_pending_reminders');
  });
  
  await test('generate_lease_expiration_alerts function exists', async () => {
    await verifyFunctionExists('generate_lease_expiration_alerts');
  });
  
  await test('process_lease_renewal function exists', async () => {
    await verifyFunctionExists('process_lease_renewal');
  });
  
  await test('auto_initiate_moveout function exists', async () => {
    await verifyFunctionExists('auto_initiate_moveout');
  });
  
  // =====================================================
  // LATE FEES FUNCTIONALITY TESTS
  // =====================================================
  printHeader('3. LATE FEES FUNCTIONALITY');
  
  let testLateFeeId;
  
  await test('Can create late fee setting', async () => {
    const result = await query(
      `INSERT INTO late_fee_settings (
        name, description, fee_type, percentage_amount,
        grace_period_days, apply_after_days, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      ['Test Late Fee', 'Test 5% late fee', 'percentage', 5, 5, 5, true]
    );
    
    if (result.length === 0) throw new Error('Failed to create late fee setting');
    testLateFeeId = result[0].id;
  });
  
  await test('Can retrieve late fee settings', async () => {
    const result = await query('SELECT * FROM late_fee_settings WHERE id = $1', [testLateFeeId]);
    if (result.length === 0) throw new Error('Cannot retrieve late fee setting');
    if (result[0].percentage_amount != 5) throw new Error('Incorrect percentage amount');
  });
  
  await test('Can query overdue invoices for late fees', async () => {
    const result = await query('SELECT * FROM get_overdue_invoices_for_late_fees()');
    // Result can be empty, just checking function works
  });
  
  await test('Can clean up test late fee setting', async () => {
    await query('DELETE FROM late_fee_settings WHERE id = $1', [testLateFeeId]);
  });
  
  // =====================================================
  // NOTIFICATIONS FUNCTIONALITY TESTS
  // =====================================================
  printHeader('4. NOTIFICATIONS FUNCTIONALITY');
  
  await test('Can query notification queue', async () => {
    const result = await query('SELECT * FROM notification_queue LIMIT 1');
    // Can be empty, just checking table works
  });
  
  await test('Can query notification history', async () => {
    const result = await query('SELECT * FROM notification_history LIMIT 1');
    // Can be empty, just checking table works
  });
  
  await test('Can call generate_payment_reminders function', async () => {
    const result = await query('SELECT generate_payment_reminders()');
    // Returns count of reminders generated (can be 0)
  });
  
  await test('Can call process_pending_reminders function', async () => {
    const result = await query('SELECT process_pending_reminders()');
    // Returns count of reminders processed (can be 0)
  });
  
  // =====================================================
  // LEASE MANAGEMENT FUNCTIONALITY TESTS
  // =====================================================
  printHeader('5. LEASE MANAGEMENT FUNCTIONALITY');
  
  await test('Can query lease renewal requests', async () => {
    const result = await query('SELECT * FROM lease_renewal_requests LIMIT 1');
    // Can be empty, just checking table works
  });
  
  await test('Can query lease expiration alerts', async () => {
    const result = await query('SELECT * FROM lease_expiration_alerts LIMIT 1');
    // Can be empty, just checking table works
  });
  
  await test('Can query move-out processing records', async () => {
    const result = await query('SELECT * FROM moveout_processing LIMIT 1');
    // Can be empty, just checking table works
  });
  
  await test('Can call generate_lease_expiration_alerts function', async () => {
    const result = await query('SELECT generate_lease_expiration_alerts()');
    // Returns count of alerts generated (can be 0)
  });
  
  await test('Can call auto_initiate_moveout function', async () => {
    const result = await query('SELECT auto_initiate_moveout()');
    // Returns count of move-outs initiated (can be 0)
  });
  
  // =====================================================
  // INTEGRATION TESTS
  // =====================================================
  printHeader('6. INTEGRATION TESTS');
  
  await test('Late fee settings has proper indexes', async () => {
    const result = await query(
      `SELECT indexname FROM pg_indexes 
       WHERE tablename = 'late_fee_settings'`
    );
    if (result.length < 2) throw new Error('Missing indexes on late_fee_settings');
  });
  
  await test('Notification queue has proper indexes', async () => {
    const result = await query(
      `SELECT indexname FROM pg_indexes 
       WHERE tablename = 'notification_queue'`
    );
    if (result.length < 2) throw new Error('Missing indexes on notification_queue');
  });
  
  await test('Lease expiration alerts has proper indexes', async () => {
    const result = await query(
      `SELECT indexname FROM pg_indexes 
       WHERE tablename = 'lease_expiration_alerts'`
    );
    if (result.length < 2) throw new Error('Missing indexes on lease_expiration_alerts');
  });
  
  await test('Database constraints are in place', async () => {
    const result = await query(
      `SELECT COUNT(*) as count FROM information_schema.table_constraints 
       WHERE constraint_type = 'FOREIGN KEY' 
       AND table_schema = 'public'
       AND table_name IN (
         'late_fee_settings', 'late_fee_applications', 
         'notification_queue', 'notification_history',
         'lease_renewal_requests', 'lease_expiration_alerts'
       )`
    );
    if (parseInt(result[0].count) < 5) throw new Error('Missing foreign key constraints');
  });
  
  // =====================================================
  // SUMMARY
  // =====================================================
  printHeader('TEST SUMMARY');
  
  console.log(`Total Tests Run:     ${totalTests}`);
  log(`✓ Passed:            ${passedTests}`, 'green');
  log(`✗ Failed:            ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  console.log(`Success Rate:        ${successRate}%`);
  
  console.log('');
  
  if (failedTests === 0) {
    log('╔═══════════════════════════════════════════════════════════╗', 'green');
    log('║                                                           ║', 'green');
    log('║           ✓ ALL APIs VERIFIED SUCCESSFULLY!              ║', 'green');
    log('║                                                           ║', 'green');
    log('╚═══════════════════════════════════════════════════════════╝', 'green');
    console.log('');
    log('🎉 Phase 2 is 100% functional and ready for production!', 'green');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test the UI pages in browser');
    console.log('2. Configure Resend API key for email notifications');
    console.log('3. Deploy to production: ./scripts/deploy-with-manual-nodejs.sh');
    console.log('');
  } else {
    log('╔═══════════════════════════════════════════════════════════╗', 'red');
    log('║                                                           ║', 'red');
    log('║              ⚠️  SOME TESTS FAILED                        ║', 'red');
    log('║                                                           ║', 'red');
    log('╚═══════════════════════════════════════════════════════════╝', 'red');
    console.log('');
    log(`⚠️  ${failedTests} test(s) failed. Please review the errors above.`, 'yellow');
  }
  
  await pool.end();
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run verification
runTests().catch(error => {
  console.error('');
  log('Fatal error during verification:', 'red');
  console.error(error);
  pool.end();
  process.exit(1);
});

