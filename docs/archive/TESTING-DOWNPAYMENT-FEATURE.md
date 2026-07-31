# Testing Downpayment Feature - Manual Testing Guide

## ✅ Migration Status
- **Database Migration:** ✅ Completed
- **Downpayment Payment Type:** ✅ Added to database constraint
- **Code Implementation:** ✅ Complete

## 🧪 Testing Steps

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Test Tenant Portal - Deposit/Downpayment Feature

**Steps:**
1. Navigate to: `http://localhost:3030/auth/signin`
2. Log in as tenant (e.g., `tenant@parenta.com`)
3. Go to: `http://localhost:3030/tenant/payments`
4. Click on the **"Deposit"** tab
5. You should see two payment type buttons:
   - **Deposit** (green)
   - **Downpayment** (blue)
6. Click on **"Downpayment"** button
7. Enter an amount (e.g., 5000)
8. Select payment method
9. Click **"Record Downpayment"**
10. Verify success notification appears

**Expected Result:**
- ✅ Downpayment button is visible and clickable
- ✅ Form updates to show "Downpayment Amount" label
- ✅ Form shows blue styling for downpayment
- ✅ Payment is recorded successfully
- ✅ Success notification: "Downpayment payment has been recorded successfully"

### 3. Test Tenant Portal - Manual Payment Entry

**Steps:**
1. Still on `/tenant/payments`
2. Click on the **"Manual Entry"** tab (4th tab)
3. In the Payment Type dropdown, verify **"Downpayment"** is listed
4. Select **"Downpayment"** from dropdown
5. Enter amount, payment method, etc.
6. Click **"Record Payment"**
7. Verify success

**Expected Result:**
- ✅ "Downpayment" appears in payment type dropdown
- ✅ Can select and submit downpayment payment
- ✅ Payment is recorded successfully

### 4. Test Admin Portal - Payment Creation

**Steps:**
1. Log out and log in as admin
2. Navigate to: `http://localhost:3030/admin/financial/payments/new`
3. Select a tenant
4. In the **Payment Type** dropdown, verify **"Downpayment"** is listed
5. Select **"Downpayment"**
6. Enter amount and other details
7. Submit the payment
8. Verify payment is created

**Expected Result:**
- ✅ "Downpayment" appears in payment type dropdown
- ✅ Can create downpayment payment for any tenant
- ✅ Payment is saved successfully

### 5. Verify Payment History

**Steps:**
1. Go to: `http://localhost:3030/admin/financial/payments`
2. Look for payments with type "Downpayment"
3. Verify they display correctly

**Expected Result:**
- ✅ Downpayment payments appear in payment list
- ✅ Payment type shows as "Downpayment"
- ✅ All payment details are correct

## ✅ Verification Checklist

- [ ] Tenant Portal - Deposit tab shows Downpayment option
- [ ] Tenant Portal - Can record downpayment payment
- [ ] Tenant Portal - Manual Entry tab includes Downpayment
- [ ] Admin Portal - Payment form includes Downpayment
- [ ] Admin Portal - Can create downpayment payments
- [ ] Payment history shows downpayment payments correctly
- [ ] No console errors when using downpayment feature

## 🐛 Troubleshooting

**If downpayment option doesn't appear:**
1. Verify migration ran: `node scripts/verify-downpayment-migration.js`
2. Check browser console for errors
3. Restart dev server: `npm run dev`
4. Clear browser cache and reload

**If payment fails to save:**
1. Check browser console for API errors
2. Verify database connection
3. Check network tab for failed requests

## 📝 Test Results

After testing, document results:
- ✅ All features working
- ⚠️ Issues found (list them)
- ❌ Features not working (list them)
