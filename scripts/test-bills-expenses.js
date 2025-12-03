/**
 * Test Script for Bills and Expenses Features
 * Tests API endpoints and verifies functionality
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3030';
const API_BASE = `${BASE_URL}/api`;

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: [],
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test function
function test(name, testFn) {
  return async () => {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      await testFn();
      results.passed++;
      console.log(`✅ PASSED: ${name}`);
    } catch (error) {
      results.failed++;
      results.errors.push({ name, error: error.message });
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
    }
  };
}

// Test Suite
async function runTests() {
  console.log('🚀 Starting Bills and Expenses API Tests\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const tests = [
    // Test 1: Room Utility Bills API - GET (should require auth)
    test('Room Utility Bills API - GET (Unauthorized)', async () => {
    const response = await makeRequest(`${API_BASE}/utility-bills/room`);
    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
    }
    }),

    // Test 2: Room Utility Bills API - POST (should require auth)
    test('Room Utility Bills API - POST (Unauthorized)', async () => {
    const response = await makeRequest(`${API_BASE}/utility-bills/room`, {
      method: 'POST',
      body: {
        roomId: 'test-room-id',
        utilityType: 'electricity',
        amount: 100,
        billingPeriodStart: '2024-01-01',
        billingPeriodEnd: '2024-01-31',
        dueDate: '2024-02-05',
        providerName: 'Test Provider',
      },
    });
    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
    }
    }),

    // Test 3: Expense Reports API - GET (should require auth)
    test('Expense Reports API - GET (Unauthorized)', async () => {
    const response = await makeRequest(
      `${API_BASE}/reports/expenses?startDate=2024-01-01&endDate=2024-12-31&periodType=monthly`
    );
    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
    }
    }),

    // Test 4: Expense Reports API - Missing Parameters
    test('Expense Reports API - Missing Parameters (Unauthorized)', async () => {
    const response = await makeRequest(`${API_BASE}/reports/expenses`);
    // Should return 401 (unauthorized) or 400 (bad request)
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400, got ${response.status}`);
    }
    }),

    // Test 5: Export Excel API - POST (should require auth)
    test('Export Excel API - POST (Unauthorized)', async () => {
    const response = await makeRequest(`${API_BASE}/reports/export/excel`, {
      method: 'POST',
      body: {
        reportType: 'expenses',
        data: { summary: { totalExpenses: 1000 } },
      },
    });
    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
    }
    }),

    // Test 6: Export PDF API - POST (should require auth)
    test('Export PDF API - POST (Unauthorized)', async () => {
    const response = await makeRequest(`${API_BASE}/reports/export/pdf`, {
      method: 'POST',
      body: {
        reportType: 'expenses',
        data: { summary: { totalExpenses: 1000 } },
      },
    });
    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
    }
    }),

    // Test 7: Verify Bills & Expenses Pages Exist (should redirect to login)
    test('Bills & Expenses Dashboard Page', async () => {
    const response = await makeRequest(`${BASE_URL}/admin/bills-expenses`);
    // Should redirect (307) or show login (401/403)
    if (response.status !== 307 && response.status !== 401 && response.status !== 403) {
      throw new Error(`Expected redirect or auth error, got ${response.status}`);
    }
    }),

    test('Room Utility Bills Page', async () => {
    const response = await makeRequest(`${BASE_URL}/admin/bills-expenses/utility-bills`);
    if (response.status !== 307 && response.status !== 401 && response.status !== 403) {
      throw new Error(`Expected redirect or auth error, got ${response.status}`);
    }
    }),

    test('New Room Utility Bill Page', async () => {
    const response = await makeRequest(`${BASE_URL}/admin/bills-expenses/utility-bills/new`);
    if (response.status !== 307 && response.status !== 401 && response.status !== 403) {
      throw new Error(`Expected redirect or auth error, got ${response.status}`);
    }
    }),

    test('Expense Reports Page', async () => {
    const response = await makeRequest(`${BASE_URL}/admin/bills-expenses/reports`);
    if (response.status !== 307 && response.status !== 401 && response.status !== 403) {
      throw new Error(`Expected redirect or auth error, got ${response.status}`);
    }
    }),

    // Test 8: Verify API routes are registered
    test('Verify API Routes Registered', async () => {
    const routes = [
      '/api/utility-bills/room',
      '/api/reports/expenses',
      '/api/reports/export/excel',
      '/api/reports/export/pdf',
    ];

    for (const route of routes) {
      const response = await makeRequest(`${BASE_URL}${route}`);
      // Should not return 404 (route exists)
      if (response.status === 404) {
        throw new Error(`Route ${route} not found (404)`);
      }
    }
    }),

    // Test 9: Verify Expense Form Categories
    test('Verify Expense Categories in Form', async () => {
    // This is a code check - verify the form has all required categories
    const fs = require('fs');
    const formContent = fs.readFileSync(
      'src/components/features/ExpenseForm.tsx',
      'utf8'
    );
    
    const requiredCategories = [
      'cleaning',
      'maintenance',
      'repair',
      'upgrade',
      'garbage_collection',
    ];

    for (const category of requiredCategories) {
      if (!formContent.includes(`value="${category}"`)) {
        throw new Error(`Missing category: ${category}`);
      }
    }
    }),

    // Test 10: Verify Migration File Exists
    test('Verify Migration File Exists', async () => {
    const fs = require('fs');
    const migrationPath = 'migrations/add-room-support-to-utility-bills.sql';
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    if (!migrationContent.includes('room_id')) {
      throw new Error('Migration file does not contain room_id column');
    }
    if (!migrationContent.includes('ALTER TABLE utility_bills')) {
      throw new Error('Migration file does not contain ALTER TABLE statement');
    }
    }),

    // Test 11: Verify TypeScript Types Updated
    test('Verify TypeScript Types Updated', async () => {
    const fs = require('fs');
    const typesContent = fs.readFileSync('src/types/database.ts', 'utf8');
    
    // Check UtilityBill interface
    if (!typesContent.includes('roomId?: string')) {
      throw new Error('UtilityBill interface missing roomId field');
    }
    if (!typesContent.includes('buildingId?: string')) {
      throw new Error('UtilityBill interface buildingId should be optional');
    }
    
    // Check DatabaseUtilityBill interface
    if (!typesContent.includes('room_id?: string')) {
      throw new Error('DatabaseUtilityBill interface missing room_id field');
    }
    }),

    // Test 12: Verify Navigation Menu Updated
    test('Verify Navigation Menu Updated', async () => {
    const fs = require('fs');
    const sidebarContent = fs.readFileSync('src/components/layout/AdminSidebar.tsx', 'utf8');
    
    if (!sidebarContent.includes('Bills & Expenses')) {
      throw new Error('Sidebar missing "Bills & Expenses" menu item');
    }
    if (!sidebarContent.includes('/admin/bills-expenses')) {
      throw new Error('Sidebar missing bills-expenses route');
    }
    }),

    // Test 13: Verify Reports Service Function Exists
    test('Verify Reports Service Function', async () => {
    const fs = require('fs');
    const serviceContent = fs.readFileSync('src/lib/services/reports-service.ts', 'utf8');
    
    if (!serviceContent.includes('generateExpenseReportByPeriod')) {
      throw new Error('Missing generateExpenseReportByPeriod function');
    }
    if (!serviceContent.includes('monthly') || !serviceContent.includes('quarterly')) {
      throw new Error('Missing period type support');
    }
    }),

    // Test 14: Verify Export Services Updated
    test('Verify Export Services Updated', async () => {
    const fs = require('fs');
    
    // Check Excel export
    const excelContent = fs.readFileSync('src/lib/services/excel-export-service.ts', 'utf8');
    if (!excelContent.includes('generateExpenseReportExcel')) {
      throw new Error('Missing generateExpenseReportExcel function');
    }
    
    // Check PDF export
    const pdfContent = fs.readFileSync('src/lib/services/pdf-export-service.tsx', 'utf8');
    if (!pdfContent.includes('generateExpenseReportPDF')) {
      throw new Error('Missing generateExpenseReportPDF function');
    }
    if (!pdfContent.includes('ExpenseReportPDF')) {
      throw new Error('Missing ExpenseReportPDF component');
    }
    }),
  ];

  // Run all tests
  for (const testFn of tests) {
    await testFn();
  }

  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
