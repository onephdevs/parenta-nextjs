# 🧪 Manual API Testing Guide for Phase 2

This guide helps you manually test all Phase 2 APIs using your browser's Developer Tools.

## Prerequisites

1. **Development server must be running**: `npm run dev`
2. **You must be logged in** to the application
3. **Database migrations must be run** (see below)

---

## 🗄️ Step 1: Run Database Migrations

```bash
# Run these migrations first
psql $DATABASE_URL < migrations/add-late-fees-system.sql
psql $DATABASE_URL < migrations/add-notifications-system.sql
psql $DATABASE_URL < migrations/add-lease-management.sql
```

---

## 🔧 Step 2: Open Browser Developer Tools

1. Open your browser (Chrome/Firefox/Edge)
2. Go to `http://localhost:3030`
3. Login to the application
4. Press `F12` to open Developer Tools
5. Go to the **Console** tab

---

## 📝 Testing Instructions

Copy and paste each test into the browser console while logged in.

---

## 1️⃣ Late Fees API Tests

### Test 1.1: Get Late Fee Settings
```javascript
fetch('/api/late-fees/settings')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Late Fee Settings:', data);
    if (data.success) console.log(`Found ${data.count || 0} settings`);
  })
  .catch(e => console.error('❌ Error:', e));
```

### Test 1.2: Create Late Fee Setting
```javascript
fetch('/api/late-fees/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test Late Fee - 5%',
    description: '5% late fee after 5 days grace period',
    fee_type: 'percentage',
    percentage_amount: 5,
    grace_period_days: 5,
    apply_after_days: 5,
    is_active: true,
    auto_apply: false,
    send_notification: true
  })
})
  .then(r => r.json())
  .then(data => {
    console.log('✅ Create Late Fee Setting:', data);
    if (data.success) console.log('Setting created:', data.setting.id);
  })
  .catch(e => console.error('❌ Error:', e));
```

### Test 1.3: Calculate Late Fees (Dry Run)
```javascript
fetch('/api/late-fees/calculate')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Calculate Late Fees:', data);
    if (data.success) console.log(`${data.invoices_count} invoices eligible for fees`);
  })
  .catch(e => console.error('❌ Error:', e));
```

### Test 1.4: Apply Late Fees (Dry Run)
```javascript
fetch('/api/late-fees/apply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dry_run: true })
})
  .then(r => r.json())
  .then(data => {
    console.log('✅ Apply Late Fees (Dry Run):', data);
    if (data.success) console.log(`Would apply ${data.fees_applied} late fees`);
  })
  .catch(e => console.error('❌ Error:', e));
```

---

## 2️⃣ Bulk Operations API Tests

### Test 2.1: Generate Monthly Invoices
```javascript
fetch('/api/bulk/invoices/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ month: '2025-12' })
})
  .then(r => r.json())
  .then(data => {
    console.log('✅ Generate Bulk Invoices:', data);
    if (data.success || data.partial_success) {
      console.log(`Generated ${data.successful} invoices, ${data.failed} failed`);
    }
  })
  .catch(e => console.error('❌ Error:', e));
```

### Test 2.2: Test CSV Payment Import (Empty)
```javascript
fetch('/api/bulk/payments/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ payments: [] })
})
  .then(r => r.json())
  .then(data => {
    console.log('✅ Bulk Payment Import:', data);
  })
  .catch(e => console.error('❌ Error:', e));
```

---

## 3️⃣ Notifications API Tests

### Test 3.1: Generate Payment Reminders
```javascript
fetch('/api/notifications/reminders/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
  .then(r => r.json())
  .then(data => {
    console.log('✅ Generate Reminders:', data);
    if (data.success) {
      console.log(`Created ${data.reminders_created} reminders`);
      console.log(`Processed ${data.reminders_processed} reminders`);
    }
  })
  .catch(e => console.error('❌ Error:', e));
```

### Test 3.2: Process Notification Queue
```javascript
fetch('/api/notifications/queue/process')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Process Queue:', data);
    if (data.success) {
      console.log(`Processed ${data.processed}: ${data.sent} sent, ${data.failed} failed`);
    }
  })
  .catch(e => console.error('❌ Error:', e));
```

---

## 4️⃣ Lease Management API Tests

### Test 4.1: Generate Lease Expiration Alerts
```javascript
fetch('/api/lease/alerts/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
  .then(r => r.json())
  .then(data => {
    console.log('✅ Generate Lease Alerts:', data);
    if (data.success) console.log(`Generated ${data.alerts_generated} alerts`);
  })
  .catch(e => console.error('❌ Error:', e));
```

### Test 4.2: Get Lease Expiration Alerts
```javascript
fetch('/api/lease/alerts')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Lease Alerts:', data);
    if (data.success) console.log(`Found ${data.alerts.length} pending alerts`);
  })
  .catch(e => console.error('❌ Error:', e));
```

### Test 4.3: Get Lease Renewal Requests
```javascript
fetch('/api/lease/renewals')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Renewal Requests:', data);
    if (data.success) console.log(`Found ${data.renewals.length} renewal requests`);
  })
  .catch(e => console.error('❌ Error:', e));
```

### Test 4.4: Get Move-Out Records
```javascript
fetch('/api/lease/moveouts')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Move-Out Records:', data);
    if (data.success) console.log(`Found ${data.moveouts.length} move-out records`);
  })
  .catch(e => console.error('❌ Error:', e));
```

---

## 5️⃣ Dashboard API Tests (Phase 1)

### Test 5.1: Get Dashboard Metrics
```javascript
fetch('/api/dashboard/metrics')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Dashboard Metrics:', data);
    if (data.success) {
      console.log('Monthly Revenue:', data.revenue.monthly_revenue);
      console.log('Outstanding:', data.invoices.outstanding_total);
    }
  })
  .catch(e => console.error('❌ Error:', e));
```

### Test 5.2: Get Revenue Data
```javascript
fetch('/api/dashboard/revenue')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Revenue Data:', data);
    if (data.success) console.log(`${data.revenue_data.length} data points`);
  })
  .catch(e => console.error('❌ Error:', e));
```

### Test 5.3: Get Occupancy Rate
```javascript
fetch('/api/dashboard/occupancy')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Occupancy Rate:', data);
    if (data.success) console.log(`Occupancy: ${data.occupancy_rate}%`);
  })
  .catch(e => console.error('❌ Error:', e));
```

---

## 🔄 Run All Tests at Once

Copy and paste this to run all tests sequentially:

```javascript
async function runAllTests() {
  console.log('🧪 Running Phase 2 API Test Suite...\n');
  
  const tests = [
    { name: 'Late Fee Settings', url: '/api/late-fees/settings' },
    { name: 'Calculate Late Fees', url: '/api/late-fees/calculate' },
    { name: 'Generate Reminders', url: '/api/notifications/reminders/generate', method: 'POST' },
    { name: 'Process Queue', url: '/api/notifications/queue/process' },
    { name: 'Generate Lease Alerts', url: '/api/lease/alerts/generate', method: 'POST' },
    { name: 'Get Lease Alerts', url: '/api/lease/alerts' },
    { name: 'Get Renewals', url: '/api/lease/renewals' },
    { name: 'Get Move-Outs', url: '/api/lease/moveouts' },
    { name: 'Dashboard Metrics', url: '/api/dashboard/metrics' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const response = await fetch(test.url, {
        method: test.method || 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${test.name}: PASS`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAIL (${response.status})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR (${error.message})`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(`Success Rate: ${(passed / tests.length * 100).toFixed(1)}%`);
}

runAllTests();
```

---

## ✅ Expected Results

If everything is working correctly, you should see:

- ✅ All GET requests return data successfully
- ✅ POST requests create/generate records as expected
- ✅ No authentication errors (401)
- ✅ No server errors (500)

---

## 🐛 Common Issues

### Issue 1: "Unauthorized" (401 error)
**Solution**: Make sure you're logged in. Refresh the page and try again.

### Issue 2: "relation does not exist" database error
**Solution**: Run the database migrations (see Step 1).

### Issue 3: "No data found" but no error
**Solution**: This is expected! The system is empty. Add some test data first.

---

## 📱 Test the UI Pages

After API testing, verify the UI works:

1. **Late Fees**: http://localhost:3030/admin/financial/late-fees/settings
2. **Bulk Operations**: http://localhost:3030/admin/bulk-operations
3. **Notifications**: http://localhost:3030/admin/notifications
4. **Lease Management**: http://localhost:3030/admin/lease-management
5. **Dashboard**: http://localhost:3030/admin/financial/dashboard

---

## 🎉 Success Criteria

Your Phase 2 implementation is successful if:

- ✅ All API endpoints return valid responses (no 500 errors)
- ✅ UI pages load without errors
- ✅ You can create late fee settings
- ✅ You can generate invoices in bulk
- ✅ Notifications queue properly
- ✅ Lease alerts are generated

---

**Happy Testing!** 🚀

If you encounter any issues, check the server logs in your terminal where `npm run dev` is running.

