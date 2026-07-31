# Quick Start Guide - Auto-Invoicing System

**5-Minute Setup & Testing Guide**

---

## ✅ Step 1: Run the Migration (1 minute)

```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs
psql $DATABASE_URL < migrations/add-auto-invoicing-tables.sql
```

**Verify it worked:**
```bash
psql $DATABASE_URL -c "\dt tenant_credits"
```
Should show the new table.

---

## ✅ Step 2: Start Development Server (if not running)

```bash
npm run dev
```

App should be at: http://localhost:3030

---

## ✅ Step 3: Quick Test via UI (3 minutes)

### Test 1: Auto-Generate Invoices

1. **Go to** http://localhost:3030/admin/rooms
2. **Find a vacant room** and click "Assign Tenant"
3. **Fill in the assignment form:**
   - Select a tenant
   - Start Date: December 1, 2025
   - End Date: November 30, 2026 (12 months)
   - Monthly Rate: 5000
   - Deposit: 10000
   - **Important**: Make sure invoice generation is enabled

4. **Submit the form**

5. **Check the database:**
```sql
SELECT COUNT(*) as invoice_count, 
       SUM(total_amount) as total_value
FROM invoices 
WHERE tenant_id = 'your-tenant-id';
```

**Expected**: 12 invoices totaling ₱60,000

### Test 2: Auto-Allocate Payment

1. **Go to** http://localhost:3030/admin/financial/payments/new
2. **Fill in payment form:**
   - Select the tenant from Test 1
   - Amount: 5000
   - Payment Type: rent
   - Payment Method: bank_transfer
   - Date: today

3. **Submit the form**

4. **Check the database:**
```sql
SELECT i.invoice_number, i.invoice_status, i.amount_paid
FROM invoices i
WHERE tenant_id = 'your-tenant-id'
ORDER BY due_date
LIMIT 1;
```

**Expected**: First invoice with `invoice_status = 'paid'` and `amount_paid = 5000`

---

## 📊 Step 4: View Results

### Check Tenant's Financial Status

```sql
-- Credit Balance
SELECT get_tenant_credit_balance('your-tenant-id');

-- Deposit Balance  
SELECT get_tenant_deposit_balance('your-tenant-id');

-- Unpaid Invoices
SELECT COUNT(*) 
FROM invoices 
WHERE tenant_id = 'your-tenant-id' 
AND invoice_status != 'paid';
```

### View Payment Allocations

```sql
SELECT 
  p.payment_date,
  p.amount as payment_amount,
  pa.allocated_amount,
  i.invoice_number,
  i.invoice_status
FROM payments p
JOIN payment_allocations pa ON p.id = pa.payment_id
JOIN invoices i ON pa.invoice_id = i.id
WHERE p.tenant_id = 'your-tenant-id'
ORDER BY p.payment_date DESC;
```

---

## 🧪 Advanced Testing (Optional)

### Test Overpayment → Credit

```bash
# Record a payment of ₱15,000 (covers 3 invoices)
curl -X POST http://localhost:3030/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "amount": 15000,
    "paymentType": "rent",
    "paymentMethod": "cash",
    "paymentDate": "2025-12-05"
  }'
```

**Check result:**
```sql
-- Should have 3 paid invoices
SELECT COUNT(*) FROM invoices 
WHERE tenant_id = 'your-tenant-id' 
AND invoice_status = 'paid';

-- If payment > 3 invoices, check for credit
SELECT * FROM tenant_credits 
WHERE tenant_id = 'your-tenant-id';
```

### Test Apply Deposit to Invoice

```bash
# Get an unpaid invoice ID first
psql $DATABASE_URL -c "
  SELECT id, invoice_number, balance_due 
  FROM invoices 
  WHERE tenant_id = 'your-tenant-id' 
  AND invoice_status = 'pending' 
  LIMIT 1;
"

# Apply ₱5,000 from deposit
curl -X POST http://localhost:3030/api/deposit-ledger \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "amount": 5000,
    "action": "apply",
    "invoiceId": "invoice-id-from-query-above",
    "description": "Apply deposit to rent"
  }'
```

**Check result:**
```sql
-- Deposit should decrease
SELECT get_tenant_deposit_balance('your-tenant-id');
-- Expected: 5000 (was 10000, applied 5000)

-- Invoice should be paid
SELECT invoice_status, amount_paid 
FROM invoices 
WHERE id = 'invoice-id-from-query-above';
-- Expected: status = 'paid', amount_paid = 5000
```

---

## 🎯 What You Should See

After running the quick tests:

✅ **12 invoices created** for the tenant  
✅ **Deposit of ₱10,000** recorded in deposit_ledger  
✅ **First payment allocated** to oldest invoice  
✅ **Invoice status updated** from pending to paid  
✅ **Payment allocation record** created  
✅ **Deposit can be applied** to pay invoices  

---

## 🔍 Troubleshooting

### "Migration failed"
- Check database connection: `psql $DATABASE_URL -c "SELECT 1"`
- Ensure you're in the correct directory
- Check for syntax errors in migration file

### "No invoices generated"
- Check if `generateInvoices` is true in request
- Verify `endDate` is provided and after `startDate`
- Check server logs for errors: `npm run dev`

### "Payment not allocating"
- Ensure payment `paymentType` is 'rent'
- Check if there are unpaid invoices
- Verify `autoAllocate` is not explicitly set to `false`

### "Can't apply deposit"
- Check deposit balance: `SELECT get_tenant_deposit_balance('tenant-id')`
- Ensure invoice is not already paid
- Verify you're authenticated as admin

---

## 📚 Next Steps

### For Testing
1. ✅ Run migration
2. ✅ Test auto-invoicing via UI or API
3. ✅ Test payment allocation
4. ✅ Test deposit operations
5. ✅ Verify all balances are correct

### For Development
1. Read `IMPLEMENTATION-REPORT.md` for complete details
2. Follow `test-auto-invoicing.md` for comprehensive testing
3. Review `AUTO-INVOICING-IMPLEMENTATION-SUMMARY.md` for features
4. Check `FEATURE-REQUEST-AUTO-INVOICING.md` for requirements

### For Production
1. Test with real data in development
2. Backup database before running migration
3. Run migration during low-traffic period
4. Monitor logs for any issues
5. Verify financial calculations are correct

---

## 🎉 Success Criteria

You'll know it's working when:

1. **New tenant assignment** → Invoices automatically created
2. **Record payment** → Payment automatically allocated to invoices
3. **Overpayment** → Excess saved as tenant credit
4. **Check balances** → All calculations are correct
5. **Apply deposit** → Deposit reduces and invoice is paid

---

## 💡 Pro Tips

1. **Always check balances after operations:**
   ```sql
   SELECT 
     get_tenant_credit_balance('tenant-id') as credit,
     get_tenant_deposit_balance('tenant-id') as deposit,
     COUNT(*) FILTER (WHERE invoice_status = 'paid') as paid_invoices,
     COUNT(*) FILTER (WHERE invoice_status != 'paid') as unpaid_invoices
   FROM invoices
   WHERE tenant_id = 'tenant-id';
   ```

2. **Use the helper functions:**
   - `get_tenant_credit_balance(tenant_id)`
   - `get_tenant_deposit_balance(tenant_id)`
   - `get_invoice_allocated_amount(invoice_id)`

3. **Check the audit trail:**
   - `payment_allocations` table shows how payments were distributed
   - `tenant_credits` table shows all credit transactions
   - `deposit_ledger` table shows all deposit transactions

4. **Monitor for edge cases:**
   - Payments that exactly match invoice amounts
   - Payments that exceed all unpaid invoices
   - Partial payments to multiple invoices
   - Applying deposits vs regular payments

---

## 📞 Need Help?

- **Full documentation**: See `IMPLEMENTATION-REPORT.md`
- **Testing guide**: See `test-auto-invoicing.md`
- **Feature list**: See `AUTO-INVOICING-IMPLEMENTATION-SUMMARY.md`
- **Requirements**: See `FEATURE-REQUEST-AUTO-INVOICING.md`

---

**Ready to go! Start with Step 1 above.** 🚀

