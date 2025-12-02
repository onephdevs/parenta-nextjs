/**
 * Tenant Portal Endpoint Test Script
 * Tests actual HTTP endpoints (requires server to be running)
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3030';

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: [],
};

// Colors
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

function failure(message, details = '') {
  log(`✗ ${message}`, 'red');
  if (details) log(`  ${details}`, 'red');
  results.failed.push({ message, details });
}

function skip(message) {
  log(`⊘ ${message} (skipped)`, 'yellow');
  results.skipped.push(message);
}

// HTTP request helper
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = { raw: data };
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test endpoint availability
async function testEndpoint(method, path, expectedStatus, description) {
  try {
    const response = await httpRequest(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === expectedStatus) {
      success(`${description} (${response.status})`);
      return { success: true, response };
    } else {
      failure(`${description}`, `Expected ${expectedStatus}, got ${response.status}`);
      return { success: false, response };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      skip(`${description} (server not running)`);
      return { success: false, error: 'SERVER_NOT_RUNNING' };
    }
    failure(`${description}`, error.message);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runTests() {
  printHeader('TENANT PORTAL ENDPOINT TEST');
  log('Testing HTTP endpoints (server must be running at ' + BASE_URL + ')\n', 'cyan');

  // Test 1: Unauthorized access (should return 401)
  printSection('Test 1: Authentication & Authorization');
  await testEndpoint('GET', '/api/tenant/payments', 401, 'Payment API blocks unauthorized access');
  await testEndpoint('GET', '/api/tenant/balance', 401, 'Balance API blocks unauthorized access');
  await testEndpoint('GET', '/api/tenant/profile', 401, 'Profile API blocks unauthorized access');
  await testEndpoint('GET', '/api/tenant/documents', 401, 'Documents API blocks unauthorized access');
  await testEndpoint('GET', '/api/tenant/reports', 401, 'Reports API blocks unauthorized access');

  // Test 2: Endpoint existence
  printSection('Test 2: Endpoint Existence');
  await testEndpoint('GET', '/api/tenant/payments', 401, 'Payment schedule endpoint exists');
  await testEndpoint('GET', '/api/tenant/balance', 401, 'Balance endpoint exists');
  await testEndpoint('GET', '/api/tenant/profile', 401, 'Profile endpoint exists');
  await testEndpoint('PUT', '/api/tenant/profile', 401, 'Profile update endpoint exists');
  await testEndpoint('GET', '/api/tenant/occupants', 401, 'Occupants endpoint exists');
  await testEndpoint('POST', '/api/tenant/occupants', 401, 'Occupant create endpoint exists');
  await testEndpoint('GET', '/api/tenant/documents', 401, 'Documents endpoint exists');
  await testEndpoint('GET', '/api/tenant/reports', 401, 'Reports endpoint exists');
  await testEndpoint('POST', '/api/tenant/reports/export', 401, 'Report export endpoint exists');
  await testEndpoint('POST', '/api/tenant/payments/process', 401, 'Payment process endpoint exists');

  // Test 3: Receipt endpoints
  printSection('Test 3: Receipt Management Endpoints');
  await testEndpoint('GET', '/api/tenant/payments/test-id/receipt', 401, 'Receipt download endpoint exists');
  await testEndpoint('POST', '/api/tenant/payments/test-id/receipt', 401, 'Receipt upload endpoint exists');
  await testEndpoint('GET', '/api/tenant/payments/test-id/print', 401, 'Receipt print endpoint exists');

  // Test 4: Method validation
  printSection('Test 4: HTTP Method Validation');
  
  // Test that POST to GET-only endpoints returns 405 or 401
  const postToGet = await testEndpoint('POST', '/api/tenant/payments', 405, 'Payment API rejects POST');
  if (!postToGet.success && postToGet.response?.status !== 405 && postToGet.response?.status !== 401) {
    // If not 405, it might be 401 which is also acceptable
    if (postToGet.response?.status === 401) {
      success('Payment API method validation (401 is acceptable)');
    }
  }

  // Summary
  printHeader('TEST SUMMARY');

  log(`\n✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  log(`⊘ Skipped: ${results.skipped.length}`, 'yellow');

  if (results.failed.length > 0) {
    log('\nFailed Tests:', 'red');
    results.failed.forEach(({ message, details }) => {
      log(`  - ${message}`, 'red');
      if (details) log(`    ${details}`, 'red');
    });
  }

  const totalTests = results.passed.length + results.failed.length + results.skipped.length;
  const successRate = totalTests > 0 
    ? ((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)
    : 0;

  log(`\n📊 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');

  if (results.failed.length === 0 && results.skipped.length === 0) {
    log('\n🎉 All tests passed!', 'green');
  } else if (results.failed.length === 0) {
    log('\n✅ All available tests passed!', 'green');
    log('Some tests were skipped (server may not be running)', 'yellow');
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
  }

  // Check if server is running
  const serverCheck = await httpRequest(`${BASE_URL}/api/tenant/payments`).catch(() => null);
  if (!serverCheck || serverCheck.error === 'SERVER_NOT_RUNNING') {
    log('\n💡 Tip: Start the server with "npm run dev" to test authenticated endpoints', 'cyan');
  }
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
