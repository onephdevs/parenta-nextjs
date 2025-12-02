#!/usr/bin/env node

/**
 * Test Script for Admin Dashboard Report Pages
 * Tests all new report page APIs and UI integration
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASSED' : '❌ FAILED';
  console.log(`${status}: ${name}${message ? ` - ${message}` : ''}`);
  testResults.push({ name, passed, message });
  if (passed) testsPassed++;
  else testsFailed++;
}

async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    logTest('Database Connection', true, 'Connected successfully');
    return true;
  } catch (error) {
    logTest('Database Connection', false, error.message);
    return false;
  }
}

async function testTenantListReportAPI() {
  try {
    // Test with no filters
    const response1 = await fetch('http://localhost:3030/api/reports/tenant-list');
    const data1 = await response1.json();
    
    if (data1.success && Array.isArray(data1.data.tenants)) {
      logTest('Tenant List Report API (no filters)', true, `Found ${data1.data.tenants.length} tenants`);
    } else {
      logTest('Tenant List Report API (no filters)', false, 'Invalid response structure');
    }

    // Test with status filter
    const response2 = await fetch('http://localhost:3030/api/reports/tenant-list?status=active');
    const data2 = await response2.json();
    
    if (data2.success) {
      logTest('Tenant List Report API (with status filter)', true);
    } else {
      logTest('Tenant List Report API (with status filter)', false, data2.error);
    }
  } catch (error) {
    logTest('Tenant List Report API', false, error.message);
  }
}

async function testCollectedAmountReportAPI() {
  try {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    
    const startDate = lastMonth.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    const response = await fetch(
      `http://localhost:3030/api/reports/collected-amount?startDate=${startDate}&endDate=${endDate}&periodType=monthly`
    );
    const data = await response.json();
    
    if (data.success && data.data.summary) {
      logTest('Collected Amount Report API', true, `Total: ${data.data.summary.totalCollected || 0}`);
    } else {
      logTest('Collected Amount Report API', false, data.error || 'Invalid response');
    }
  } catch (error) {
    logTest('Collected Amount Report API', false, error.message);
  }
}

async function testDepositReportAPI() {
  try {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    
    const startDate = lastMonth.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    const response = await fetch(
      `http://localhost:3030/api/reports/deposits?startDate=${startDate}&endDate=${endDate}&periodType=monthly`
    );
    const data = await response.json();
    
    if (data.success && data.data.summary) {
      logTest('Deposit Report API', true, `Total Deposits: ${data.data.summary.totalDepositsReceived || 0}`);
    } else {
      logTest('Deposit Report API', false, data.error || 'Invalid response');
    }
  } catch (error) {
    logTest('Deposit Report API', false, error.message);
  }
}

async function testVacantRoomsReportAPI() {
  try {
    const response = await fetch('http://localhost:3030/api/reports/vacant-rooms');
    const data = await response.json();
    
    if (data.success && Array.isArray(data.data.rooms)) {
      logTest('Vacant Rooms Report API', true, `Found ${data.data.rooms.length} vacant rooms`);
    } else {
      logTest('Vacant Rooms Report API', false, data.error || 'Invalid response');
    }
  } catch (error) {
    logTest('Vacant Rooms Report API', false, error.message);
  }
}

async function testExportAPIs() {
  try {
    // Test Excel export for tenant-list
    const response1 = await fetch('http://localhost:3030/api/reports/export/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType: 'tenant-list',
        data: { tenants: [], summary: {} },
        filename: 'test-tenant-list'
      })
    });
    
    if (response1.ok && response1.headers.get('content-type')?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      logTest('Excel Export API (tenant-list)', true);
    } else {
      logTest('Excel Export API (tenant-list)', false, `Status: ${response1.status}`);
    }

    // Test PDF export for tenant-list
    const response2 = await fetch('http://localhost:3030/api/reports/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType: 'tenant-list',
        data: { tenants: [], summary: {} },
        filename: 'test-tenant-list'
      })
    });
    
    if (response2.ok && response2.headers.get('content-type')?.includes('application/pdf')) {
      logTest('PDF Export API (tenant-list)', true);
    } else {
      logTest('PDF Export API (tenant-list)', false, `Status: ${response2.status}`);
    }
  } catch (error) {
    logTest('Export APIs', false, error.message);
  }
}

async function testReportPagesExist() {
  const pages = [
    '/admin/reports/tenant-list',
    '/admin/reports/collected-amount',
    '/admin/reports/deposits',
    '/admin/reports/vacant-rooms',
    '/admin/reports'
  ];

  for (const page of pages) {
    try {
      const response = await fetch(`http://localhost:3030${page}`, {
        method: 'HEAD',
        redirect: 'manual'
      });
      
      // Accept 200, 302 (redirect), or 307 (temporary redirect) as valid
      if (response.status === 200 || response.status === 302 || response.status === 307) {
        logTest(`Report Page Exists: ${page}`, true);
      } else {
        logTest(`Report Page Exists: ${page}`, false, `Status: ${response.status}`);
      }
    } catch (error) {
      logTest(`Report Page Exists: ${page}`, false, error.message);
    }
  }
}

async function testReportsPageIntegration() {
  try {
    const response = await fetch('http://localhost:3030/admin/reports');
    const html = await response.text();
    
    const checks = [
      { name: 'Tenant List Report link', pattern: /tenant-list/i },
      { name: 'Collected Amount Report link', pattern: /collected-amount/i },
      { name: 'Deposit Report link', pattern: /deposits/i },
      { name: 'Vacant Rooms Report link', pattern: /vacant-rooms/i }
    ];

    checks.forEach(check => {
      if (check.pattern.test(html)) {
        logTest(`Reports Page Integration: ${check.name}`, true);
      } else {
        logTest(`Reports Page Integration: ${check.name}`, false, 'Link not found in HTML');
      }
    });
  } catch (error) {
    logTest('Reports Page Integration', false, error.message);
  }
}

async function testDatabaseQueries() {
  try {
    // Test tenant list query
    const tenantQuery = await pool.query(`
      SELECT 
        t.id,
        t.first_name,
        t.last_name,
        COALESCE(SUM(i.balance_due), 0) as balance,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.invoice_status != 'paid' THEN i.balance_due ELSE 0 END), 0) as past_due_amount,
        MAX(CASE WHEN i.due_date < CURRENT_DATE AND i.invoice_status != 'paid' THEN (CURRENT_DATE - i.due_date) ELSE 0 END) as days_past_due
      FROM tenants t
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.status = 'active'
      LEFT JOIN invoices i ON t.id = i.tenant_id
      WHERE t.status = 'active'
      GROUP BY t.id, t.first_name, t.last_name
      LIMIT 5
    `);
    
    logTest('Database Query: Tenant List', true, `Found ${tenantQuery.rows.length} tenants`);

    // Test vacant rooms query
    const vacantQuery = await pool.query(`
      SELECT 
        r.id,
        r.room_number,
        r.monthly_rate,
        b.name as building_name,
        (CURRENT_DATE - COALESCE(MAX(tra.end_date), r.created_at)) as days_vacant
      FROM rooms r
      INNER JOIN buildings b ON r.building_id = b.id
      LEFT JOIN tenant_room_assignments tra ON r.id = tra.room_id AND tra.status = 'active'
      WHERE r.status = 'vacant'
      GROUP BY r.id, r.room_number, r.monthly_rate, b.name, r.created_at
      LIMIT 5
    `);
    
    logTest('Database Query: Vacant Rooms', true, `Found ${vacantQuery.rows.length} vacant rooms`);
  } catch (error) {
    logTest('Database Queries', false, error.message);
  }
}

async function runAllTests() {
  console.log('\n🧪 Starting Report Pages Test Suite...\n');
  console.log('='.repeat(60));
  
  // Test database connection first
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('\n❌ Database connection failed. Exiting tests.');
    process.exit(1);
  }
  
  console.log('\n📊 Testing API Endpoints...\n');
  await testTenantListReportAPI();
  await testCollectedAmountReportAPI();
  await testDepositReportAPI();
  await testVacantRoomsReportAPI();
  
  console.log('\n📤 Testing Export Functionality...\n');
  await testExportAPIs();
  
  console.log('\n🗄️ Testing Database Queries...\n');
  await testDatabaseQueries();
  
  console.log('\n🌐 Testing Page Accessibility...\n');
  await testReportPagesExist();
  
  console.log('\n🔗 Testing Reports Page Integration...\n');
  await testReportsPageIntegration();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total: ${testsPassed + testsFailed}`);
  console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}).finally(() => {
  pool.end();
});
