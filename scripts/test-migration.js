/**
 * Test the migration via API endpoint
 * This requires the dev server to be running
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3030,
  path: '/api/migrations/downpayment',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('🚀 Testing migration via API endpoint...');
console.log('⚠️  Note: This requires the dev server to be running and you to be logged in as admin');
console.log('   Make sure to run: npm run dev\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.success) {
        console.log('✅ Migration completed successfully!');
        console.log('\nDetails:');
        console.log('  Constraint Name:', result.data.constraintName);
        console.log('  Downpayment Included:', result.data.downpaymentIncluded ? '✅ Yes' : '❌ No');
        console.log('  Check Clause:', result.data.checkClause);
      } else {
        console.log('❌ Migration failed:', result.error);
        if (result.details) {
          console.log('   Details:', result.details);
        }
        if (res.statusCode === 401) {
          console.log('\n⚠️  You need to be logged in as admin to run this migration.');
          console.log('   Please log in at http://localhost:3030/auth/signin');
        }
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  console.error('   Make sure the dev server is running: npm run dev');
});

req.end();
