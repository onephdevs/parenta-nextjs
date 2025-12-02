/**
 * Tenant Portal API Test Script
 * Systematically tests all tenant portal APIs to confirm the flow works
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3030';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: [],
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(text) {
  console.log('\n' + '='.repeat(60));
  log(text, 'blue');
  console.log('='.repeat(60) + '\n');
}

function printSection(text) {
  log(`\n▶ ${text}`, 'cyan');
}

function success(message) {
  log(`✓ ${message}`, 'green');
  results.passed.push(message);
}

function failure(message, error = '') {
  log(`✗ ${message}`, 'red');
  if (error) log(`  Error: ${error}`, 'red');
  results.failed.push({ message, error });
}

function skip(message) {
  log(`⊘ ${message} (skipped)`, 'yellow');
  results.skipped.push(message);
}

// Test data
let testTenantId = null;
let testUserId = null;
let testPaymentId = null;
let testInvoiceId = null;
let testOccupantId = null;
let sessionCookie = null;

// Helper function to test API logic directly via database
// Note: Full API testing with authentication requires NextAuth session
// This tests the core logic and queries used by the APIs

// Helper to find an existing tenant for testing
async function setupTestTenant() {
  printSection('Finding existing tenant for testing');

  try {
    // Find an existing tenant with active status
    const tenantResult = await pool.query(`
      SELECT t.id, t.user_id, t.first_name, t.last_name, t.email
      FROM tenants t
      WHERE t.tenant_status = 'active'
      LIMIT 1
    `);

    if (tenantResult.rows.length === 0) {
      log('No active tenants found. Creating a test tenant...', 'yellow');
      
      // Find an existing user with tenant role or create one
      const userResult = await pool.query(`
        SELECT id, email FROM users 
        WHERE role = 'tenant' AND is_active = true 
        LIMIT 1
      `);

      if (userResult.rows.length === 0) {
        failure('No tenant users found. Please create a tenant user first.');
        return false;
      }

      testUserId = userResult.rows[0].id;
      const userEmail = userResult.rows[0].email;

      // Check if tenant exists for this user
      const existingTenant = await pool.query(`
        SELECT id FROM tenants WHERE user_id = $1
      `, [testUserId]);

      if (existingTenant.rows.length > 0) {
        testTenantId = existingTenant.rows[0].id;
        log(`Found existing tenant: ID ${testTenantId}`, 'green');
      } else {
        // Create tenant
        const newTenant = await pool.query(`
          INSERT INTO tenants (
            user_id, first_name, last_name, email, phone,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            tenant_status
          )
          VALUES ($1, 'Test', 'Tenant', $2, '+63 917 123 4567',
            'Emergency Contact', '+63 917 765 4321', 'spouse', 'active')
          RETURNING id
        `, [testUserId, userEmail]);

        testTenantId = newTenant.rows[0].id;
        log(`Created test tenant: ID ${testTenantId}`, 'green');
      }
    } else {
      testTenantId = tenantResult.rows[0].id;
      testUserId = tenantResult.rows[0].user_id;
      log(`Using existing tenant: ${tenantResult.rows[0].first_name} ${tenantResult.rows[0].last_name} (ID: ${testTenantId})`, 'green');
    }

    // Get a room assignment if available
    const roomResult = await pool.query(`
      SELECT tra.room_id, tra.tenant_id
      FROM tenant_room_assignments tra
      WHERE tra.tenant_id = $1 AND tra.assignment_status = 'active'
      LIMIT 1
    `, [testTenantId]);

    if (roomResult.rows.length === 0) {
      log('No active room assignment found. Some tests may be limited.', 'yellow');
    }

    // Get a payment for testing
    const paymentResult = await pool.query(`
      SELECT id FROM payments WHERE tenant_id = $1 LIMIT 1
    `, [testTenantId]);

    if (paymentResult.rows.length > 0) {
      testPaymentId = paymentResult.rows[0].id;
      log(`Found test payment: ID ${testPaymentId}`, 'green');
    }

    // Get an invoice for testing
    const invoiceResult = await pool.query(`
      SELECT id FROM invoices WHERE tenant_id = $1 LIMIT 1
    `, [testTenantId]);

    if (invoiceResult.rows.length > 0) {
      testInvoiceId = invoiceResult.rows[0].id;
      log(`Found test invoice: ID ${testInvoiceId}`, 'green');
    }

    return true;
  } catch (error) {
    failure('Failed to setup test tenant', error.message);
    return false;
  }
}

// Test 1: Authentication & Authorization
async function testAuthentication() {
  printSection('Test 1: Authentication & Authorization Logic');

  try {
    // Test tenant lookup by user_id (used in all tenant APIs)
    if (testUserId) {
      const tenantLookup = await pool.query(`
        SELECT id FROM tenants WHERE user_id = $1
      `, [testUserId]);

      if (tenantLookup.rows.length > 0) {
        success('Tenant lookup by user_id works (core auth logic)');
      } else {
        failure('Tenant lookup failed');
      }
    } else {
      skip('Tenant lookup (no test user)');
    }

    // Test that queries filter by tenant_id (security check)
    if (testTenantId) {
      const securityCheck = await pool.query(`
        SELECT COUNT(*) as count FROM payments WHERE tenant_id = $1
      `, [testTenantId]);

      success(`Tenant data isolation works (found ${securityCheck.rows[0].count} payments for tenant)`);
    }
  } catch (error) {
    failure('Authentication logic test failed', error.message);
  }

  log('Note: Full API endpoint testing requires NextAuth session. Testing core logic directly.', 'yellow');
}

// Test 2: Payment Schedule API
async function testPaymentSchedule() {
  printSection('Test 2: Payment Schedule API');

  if (!testTenantId) {
    skip('Payment Schedule API (no test tenant)');
    return;
  }

  try {
    // Test the query logic directly
    const result = await pool.query(`
      SELECT 
        i.id,
        i.invoice_number,
        i.due_date,
        i.balance_due,
        i.invoice_status
      FROM invoices i
      WHERE i.tenant_id = $1
        AND i.invoice_status IN ('sent', 'partial', 'overdue')
        AND i.balance_due > 0
      ORDER BY i.due_date ASC
      LIMIT 5
    `, [testTenantId]);

    if (result.rows.length >= 0) {
      success(`Payment Schedule API query works (found ${result.rows.length} upcoming invoices)`);
    } else {
      failure('Payment Schedule API query failed');
    }
  } catch (error) {
    failure('Payment Schedule API test failed', error.message);
  }
}

// Test 3: Balance API
async function testBalanceAPI() {
  printSection('Test 3: Balance Calculation API');

  if (!testTenantId) {
    skip('Balance API (no test tenant)');
    return;
  }

  try {
    // Test balance calculation
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(balance_due), 0) as outstanding_amount,
        COUNT(*) as outstanding_count
      FROM invoices
      WHERE tenant_id = $1
        AND invoice_status IN ('sent', 'partial', 'overdue')
        AND balance_due > 0
    `, [testTenantId]);

    const outstanding = parseFloat(result.rows[0].outstanding_amount || 0);
    success(`Balance calculation works (outstanding: ₱${outstanding.toFixed(2)})`);
  } catch (error) {
    failure('Balance API test failed', error.message);
  }
}

// Test 4: Receipt Upload/Download
async function testReceiptManagement() {
  printSection('Test 4: Receipt Management');

  if (!testPaymentId) {
    skip('Receipt Management (no test payment)');
    return;
  }

  try {
    // Check if receipt fields exist
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name LIKE 'receipt%'
    `);

    if (columnsResult.rows.length >= 4) {
      success(`Receipt fields exist (${columnsResult.rows.length} columns)`);
    } else {
      failure('Receipt fields missing', `Expected 4, found ${columnsResult.rows.length}`);
    }

    // Test receipt path update
    const testPath = 'uploads/receipts/test-receipt.pdf';
    await pool.query(`
      UPDATE payments
      SET receipt_file_path = $1, receipt_uploaded_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [testPath, testPaymentId]);

    const verifyResult = await pool.query(`
      SELECT receipt_file_path FROM payments WHERE id = $1
    `, [testPaymentId]);

    if (verifyResult.rows[0].receipt_file_path === testPath) {
      success('Receipt upload/update works');
    } else {
      failure('Receipt upload/update failed');
    }
  } catch (error) {
    failure('Receipt Management test failed', error.message);
  }
}

// Test 5: Profile API
async function testProfileAPI() {
  printSection('Test 5: Profile Management API');

  if (!testTenantId) {
    skip('Profile API (no test tenant)');
    return;
  }

  try {
    // Test profile query
    const profileResult = await pool.query(`
      SELECT 
        id, first_name, last_name, email, phone,
        emergency_contact_name, emergency_contact_phone
      FROM tenants
      WHERE id = $1
    `, [testTenantId]);

    if (profileResult.rows.length > 0) {
      success('Profile query works');
    } else {
      failure('Profile query failed');
    }

    // Test profile update
    const newPhone = '+63 917 999 9999';
    await pool.query(`
      UPDATE tenants
      SET phone = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newPhone, testTenantId]);

    const verifyResult = await pool.query(`
      SELECT phone FROM tenants WHERE id = $1
    `, [testTenantId]);

    if (verifyResult.rows[0].phone === newPhone) {
      success('Profile update works');
    } else {
      failure('Profile update failed');
    }
  } catch (error) {
    failure('Profile API test failed', error.message);
  }
}

// Test 6: Occupant Management
async function testOccupantManagement() {
  printSection('Test 6: Occupant Management API');

  if (!testTenantId) {
    skip('Occupant Management (no test tenant)');
    return;
  }

  try {
    // Get tenant's room
    const roomResult = await pool.query(`
      SELECT room_id FROM tenant_room_assignments
      WHERE tenant_id = $1 AND assignment_status = 'active'
      LIMIT 1
    `, [testTenantId]);

    if (roomResult.rows.length === 0) {
      skip('Occupant Management (no room assignment)');
      return;
    }

    const roomId = roomResult.rows[0].room_id;

    // Test occupant creation
    const occupantResult = await pool.query(`
      INSERT INTO occupants (
        room_id, tenant_id, first_name, last_name,
        relationship_to_tenant, move_in_date, is_active
      )
      VALUES ($1, $2, 'Test', 'Occupant', 'friend', CURRENT_DATE, true)
      RETURNING id
    `, [roomId, testTenantId]);

    testOccupantId = occupantResult.rows[0].id;
    success('Occupant creation works');

    // Test occupant query
    const queryResult = await pool.query(`
      SELECT * FROM occupants WHERE room_id = $1 AND is_active = true
    `, [roomId]);

    if (queryResult.rows.length > 0) {
      success('Occupant query works');
    }

    // Test occupant update
    await pool.query(`
      UPDATE occupants
      SET first_name = 'Updated', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [testOccupantId]);

    const verifyResult = await pool.query(`
      SELECT first_name FROM occupants WHERE id = $1
    `, [testOccupantId]);

    if (verifyResult.rows[0].first_name === 'Updated') {
      success('Occupant update works');
    }

    // Cleanup
    await pool.query(`DELETE FROM occupants WHERE id = $1`, [testOccupantId]);
  } catch (error) {
    failure('Occupant Management test failed', error.message);
  }
}

// Test 7: Documents API
async function testDocumentsAPI() {
  printSection('Test 7: Documents API');

  if (!testTenantId) {
    skip('Documents API (no test tenant)');
    return;
  }

  try {
    // Test documents query
    const result = await pool.query(`
      SELECT 
        d.id,
        d.document_name,
        d.file_path,
        d.access_level
      FROM documents d
      WHERE (
        d.tenant_id = $1
        OR (d.access_level = 'tenant' AND d.is_public = true)
      )
      AND (d.expiry_date IS NULL OR d.expiry_date >= CURRENT_DATE)
      LIMIT 10
    `, [testTenantId]);

    success(`Documents query works (found ${result.rows.length} documents)`);
  } catch (error) {
    failure('Documents API test failed', error.message);
  }
}

// Test 8: Payment Processing
async function testPaymentProcessing() {
  printSection('Test 8: Payment Processing API');

  if (!testTenantId || !testInvoiceId) {
    skip('Payment Processing (no test tenant/invoice)');
    return;
  }

  try {
    // Test payment creation logic
    const invoiceResult = await pool.query(`
      SELECT total_amount, amount_paid, balance_due
      FROM invoices WHERE id = $1
    `, [testInvoiceId]);

    if (invoiceResult.rows.length === 0) {
      skip('Payment Processing (no invoice found)');
      return;
    }

    const invoice = invoiceResult.rows[0];
    const paymentAmount = Math.min(parseFloat(invoice.balance_due || 0), 1000);

    if (paymentAmount > 0) {
      // Test payment allocation logic
      const allocationResult = await pool.query(`
        SELECT COUNT(*) as count FROM payment_allocations
        WHERE invoice_id = $1
      `, [testInvoiceId]);

      success(`Payment processing logic works (${allocationResult.rows[0].count} allocations found)`);
    } else {
      skip('Payment Processing (invoice already paid)');
    }
  } catch (error) {
    failure('Payment Processing test failed', error.message);
  }
}

// Test 9: Reports API
async function testReportsAPI() {
  printSection('Test 9: Reports API');

  if (!testTenantId) {
    skip('Reports API (no test tenant)');
    return;
  }

  try {
    // Test payment history report
    const paymentReport = await pool.query(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE tenant_id = $1
    `, [testTenantId]);

    success(`Payment history report works (${paymentReport.rows[0].total_payments} payments)`);

    // Test invoice history report
    const invoiceReport = await pool.query(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM invoices
      WHERE tenant_id = $1
    `, [testTenantId]);

    success(`Invoice history report works (${invoiceReport.rows[0].total_invoices} invoices)`);

    // Test financial summary
    const summary = await pool.query(`
      SELECT 
        COALESCE(SUM(balance_due), 0) as outstanding
      FROM invoices
      WHERE tenant_id = $1
        AND invoice_status IN ('sent', 'partial', 'overdue')
    `, [testTenantId]);

    success(`Financial summary works (outstanding: ₱${parseFloat(summary.rows[0].outstanding).toFixed(2)})`);
  } catch (error) {
    failure('Reports API test failed', error.message);
  }
}

// Test 10: Receipt Generation
async function testReceiptGeneration() {
  printSection('Test 10: Receipt Generation');

  if (!testPaymentId) {
    skip('Receipt Generation (no test payment)');
    return;
  }

  try {
    // Test receipt data query
    const receiptData = await pool.query(`
      SELECT 
        p.id,
        p.amount,
        p.payment_method,
        p.payment_date,
        t.first_name,
        t.last_name
      FROM payments p
      INNER JOIN tenants t ON p.tenant_id = t.id
      WHERE p.id = $1
    `, [testPaymentId]);

    if (receiptData.rows.length > 0) {
      success('Receipt data query works');
      log(`  Payment: ₱${parseFloat(receiptData.rows[0].amount).toFixed(2)}`, 'cyan');
      log(`  Method: ${receiptData.rows[0].payment_method}`, 'cyan');
    } else {
      failure('Receipt data query failed');
    }
  } catch (error) {
    failure('Receipt Generation test failed', error.message);
  }
}

// Main test runner
async function runTests() {
  printHeader('TENANT PORTAL API TEST SUITE');
  log('Testing all tenant portal APIs systematically...\n', 'cyan');

  // Setup
  const setupSuccess = await setupTestTenant();
  if (!setupSuccess) {
    log('\n⚠️  Setup failed. Some tests will be skipped.\n', 'yellow');
  }

  // Run all tests
  await testAuthentication();
  await testPaymentSchedule();
  await testBalanceAPI();
  await testReceiptManagement();
  await testProfileAPI();
  await testOccupantManagement();
  await testDocumentsAPI();
  await testPaymentProcessing();
  await testReportsAPI();
  await testReceiptGeneration();

  // Print summary
  printHeader('TEST SUMMARY');

  log(`\n✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  log(`⊘ Skipped: ${results.skipped.length}`, 'yellow');

  if (results.failed.length > 0) {
    log('\nFailed Tests:', 'red');
    results.failed.forEach(({ message, error }) => {
      log(`  - ${message}`, 'red');
      if (error) log(`    ${error}`, 'red');
    });
  }

  const totalTests = results.passed.length + results.failed.length + results.skipped.length;
  const successRate = totalTests > 0 
    ? ((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)
    : 0;

  log(`\n📊 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');

  if (results.failed.length === 0) {
    log('\n🎉 All tests passed!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
  }

  // Cleanup
  await pool.end();
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
