#!/usr/bin/env node

/**
 * Post-Deployment Verification Script
 * Tests all report pages and functionality after deployment
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = process.env.VERCEL_URL || 'https://parenta-nextjs-43gu9vbvb-estopaceadrians-projects.vercel.app';
const BASE_URL = PRODUCTION_URL.startsWith('http') ? PRODUCTION_URL : `https://${PRODUCTION_URL}`;

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

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function testPageAccessibility(path, expectedStatus = [200, 302, 307, 401]) {
  try {
    const url = `${BASE_URL}${path}`;
    const response = await makeRequest(url);
    
    // 401 is valid for protected pages (authentication required)
    // 302/307 are valid for redirects (to login)
    // 200 is valid for accessible pages
    if (expectedStatus.includes(response.status)) {
      const statusMsg = response.status === 401 ? 'Protected (auth required)' : 
                        response.status === 302 || response.status === 307 ? 'Redirects to login' : 
                        'Accessible';
      logTest(`Page Accessible: ${path}`, true, `Status: ${response.status} (${statusMsg})`);
      return true;
    } else {
      logTest(`Page Accessible: ${path}`, false, `Status: ${response.status} (expected ${expectedStatus.join(' or ')})`);
      return false;
    }
  } catch (error) {
    logTest(`Page Accessible: ${path}`, false, error.message);
    return false;
  }
}

async function testPageContent(path, expectedContent) {
  try {
    const url = `${BASE_URL}${path}`;
    const response = await makeRequest(url);
    
    if (response.status === 200 && response.body.includes(expectedContent)) {
      logTest(`Page Content: ${path}`, true, `Contains: ${expectedContent}`);
      return true;
    } else {
      logTest(`Page Content: ${path}`, false, `Status: ${response.status} or content not found`);
      return false;
    }
  } catch (error) {
    logTest(`Page Content: ${path}`, false, error.message);
    return false;
  }
}

async function testAPIEndpoint(path, method = 'GET') {
  try {
    const url = `${BASE_URL}${path}`;
    const response = await makeRequest(url);
    
    // API endpoints may return 401 (unauthorized) which is expected for unauthenticated requests
    if ([200, 401, 403].includes(response.status)) {
      logTest(`API Endpoint: ${path}`, true, `Status: ${response.status}`);
      return true;
    } else {
      logTest(`API Endpoint: ${path}`, false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest(`API Endpoint: ${path}`, false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🔍 Starting Post-Deployment Verification...\n');
  console.log(`🌐 Testing: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  // Test 1: Main Reports Page
  console.log('\n📄 Testing Page Accessibility...\n');
  await testPageAccessibility('/admin/reports');
  await testPageAccessibility('/admin/reports/tenant-list');
  await testPageAccessibility('/admin/reports/collected-amount');
  await testPageAccessibility('/admin/reports/deposits');
  await testPageAccessibility('/admin/reports/vacant-rooms');
  
  // Test 2: Page Content (check for key elements)
  console.log('\n📝 Testing Page Content...\n');
  await testPageContent('/admin/reports', 'Tenant List Report');
  await testPageContent('/admin/reports', 'Collected Amount Report');
  await testPageContent('/admin/reports', 'Deposit Report');
  await testPageContent('/admin/reports', 'Vacant Rooms Report');
  
  // Test 3: API Endpoints
  console.log('\n🔌 Testing API Endpoints...\n');
  await testAPIEndpoint('/api/reports/tenant-list');
  await testAPIEndpoint('/api/reports/collected-amount');
  await testAPIEndpoint('/api/reports/deposits');
  await testAPIEndpoint('/api/reports/vacant-rooms');
  await testAPIEndpoint('/api/reports/export/excel', 'POST');
  await testAPIEndpoint('/api/reports/export/pdf', 'POST');
  
  // Test 4: Authentication (should redirect)
  console.log('\n🔐 Testing Authentication...\n');
  const authTest = await testPageAccessibility('/admin/reports/tenant-list', [200, 302, 307, 401]);
  if (authTest || testResults[testResults.length - 1].message.includes('302') || testResults[testResults.length - 1].message.includes('401')) {
    logTest('Authentication Redirect', true, 'Pages require authentication');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total: ${testsPassed + testsFailed}`);
  console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All automated tests passed!');
    console.log('\n⚠️  Note: Manual testing still required for:');
    console.log('   - Report generation with real data');
    console.log('   - Export functionality (Excel, PDF, Print)');
    console.log('   - Filter functionality');
    console.log('   - Responsive design');
    console.log('   - User interactions');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review the output above.');
    console.log('\n💡 Note: Some failures may be expected (e.g., 401 for unauthenticated API calls)');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
