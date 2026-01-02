# Quick Test Guide - Downpayment Feature

## ✅ Pre-Testing Checklist

1. **Database Migration:** ✅ Already applied (verified)
2. **Code Deployed:** ✅ Committed and pushed to Vercel
3. **Dev Server:** ✅ Running on http://localhost:3030

---

## 🧪 Test 1: Tenant Portal - Deposit/Downpayment Tab

### Steps:
1. **Navigate to:** http://localhost:3030/auth/signin
2. **Login as tenant:**
   - Role: Tenant
   - Email: `tenant@parenta.com`
   - Password: `tenant123`
3. **Go to Payments:** http://localhost:3030/tenant/payments
4. **Click "Deposit" tab** (2nd tab)
5. **Verify:**
   - ✅ Two buttons appear: "Deposit" (green) and "Downpayment" (blue)
   - ✅ Click "Downpayment" button
   - ✅ Form label changes to "Downpayment Amount"
   - ✅ Form styling changes to blue
   - ✅ Enter amount (e.g., 5000)
   - ✅ Select payment method
   - ✅ Click "Record Downpayment"
   - ✅ Success notification appears

### Expected Result:
- ✅ Downpayment button is visible and functional
- ✅ Form updates correctly when switching between Deposit/Downpayment
- ✅ Payment is recorded successfully
- ✅ Success message: "Downpayment payment has been recorded successfully"

---

## 🧪 Test 2: Tenant Portal - Manual Payment Entry

### Steps:
1. **Still on:** http://localhost:3030/tenant/payments
2. **Click "Manual Entry" tab** (4th tab - last one)
3. **Verify:**
   - ✅ "Downpayment" appears in Payment Type dropdown
   - ✅ Select "Downpayment" from dropdown
   - ✅ Enter amount, payment method, etc.
   - ✅ Click "Record Payment"
   - ✅ Success notification appears

### Expected Result:
- ✅ "Downpayment" option available in dropdown
- ✅ Can create downpayment payment manually
- ✅ Payment recorded successfully

---

## 🧪 Test 3: Admin Portal - New Payment

### Steps:
1. **Logout and login as admin:**
   - Navigate to: http://localhost:3030/auth/signin
   - Role: Admin
   - Email: `admin@parenta.com` (or your admin email)
   - Password: (your admin password)
2. **Go to:** http://localhost:3030/admin/financial/payments/new
3. **Verify:**
   - ✅ Select a tenant from dropdown
   - ✅ "Downpayment" appears in Payment Type dropdown
   - ✅ Select "Downpayment"
   - ✅ Enter payment details
   - ✅ Submit payment
   - ✅ Payment appears in payment list

### Expected Result:
- ✅ "Downpayment" option in Payment Type dropdown
- ✅ Can create downpayment payment for any tenant
- ✅ Payment saved successfully

---

## 🧪 Test 4: Verify Payment History

### Steps:
1. **Go to:** http://localhost:3030/admin/financial/payments
2. **Look for:**
   - ✅ Payments with type "Downpayment"
   - ✅ Payment details display correctly
   - ✅ Payment type badge shows "Downpayment"

### Expected Result:
- ✅ Downpayment payments appear in list
- ✅ Payment type is correctly labeled
- ✅ All payment details are accurate

---

## 🔍 Quick Verification Commands

### Check Database:
```bash
node scripts/verify-downpayment-migration.js
```

### Check Build:
```bash
npm run build
```

---

## ✅ Success Criteria

All tests pass if:
- [x] Database migration applied (already verified)
- [ ] Tenant can see Downpayment button in Deposit tab
- [ ] Tenant can record downpayment payment
- [ ] Tenant can use Manual Entry with Downpayment option
- [ ] Admin can create downpayment payments
- [ ] Downpayment payments appear in payment history
- [ ] No console errors
- [ ] No runtime errors

---

## 🐛 Troubleshooting

**If Downpayment button doesn't appear:**
- Clear browser cache
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors

**If payment fails:**
- Check browser console for API errors
- Verify database connection
- Check network tab for failed requests

**If migration not applied:**
- Run: `node scripts/run-migration-simple.js`
- Or use Supabase SQL Editor to run migration manually

