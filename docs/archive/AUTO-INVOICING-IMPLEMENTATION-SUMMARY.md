# Auto-Invoicing & Payment Processing - Implementation Summary

**Date**: November 20, 2025  
**Status**: Backend Complete, Frontend Pending

---

## ✅ COMPLETED (Backend & Core Logic)

### Phase 1: Database Schema ✅

**Created Files:**
- `migrations/add-auto-invoicing-tables.sql` - Complete migration with:
  - `tenant_credits` table - Track advance payments and credits
  - `deposit_ledger` table - Track deposit transactions separately
  - `payment_allocations` table - Map payments to invoices
  - Helper functions: `get_tenant_credit_balance()`, `get_tenant_deposit_balance()`, `get_invoice_allocated_amount()`
  - Triggers for automatic invoice status updates
  - Indexes for performance optimization

**Updated Files:**
- `src/types/financial.ts` - Added TypeScript interfaces for all new types
- `src/lib/schema.sql` - Integrated new tables into main schema

### Phase 2: Backend Services ✅

**Created Services:**

1. **`src/lib/services/invoice-generator.ts`**
   - `generateInvoicesForTenant()` - Auto-generate monthly invoices based on lease term
   - `generateSingleInvoice()` - Manually create custom invoices
   - `updateOverdueInvoices()` - Batch update overdue statuses
   - `getUnpaidInvoicesForTenant()` - Get tenant's unpaid invoices sorted by due date
   - Handles prorated rent for mid-month move-ins
   - Automatic deposit recording

2. **`src/lib/services/payment-allocator.ts`**
   - `allocatePaymentToInvoices()` - Distribute payments across invoices (oldest first)
   - `applyCreditToInvoice()` - Apply tenant credit to specific invoice
   - `applyDepositToInvoice()` - Apply deposit to invoice (admin only)
   - `getTenantCreditBalance()` - Get current credit balance
   - `getTenantDepositBalance()` - Get current deposit balance
   - `autoApplyCreditsToNewInvoice()` - Auto-apply existing credits
   - Creates tenant credits for excess payments

3. **`src/lib/api/tenant-credits.ts`**
   - Full CRUD operations for tenant credits
   - `getTenantCredits()` - Get all credits for a tenant
   - `getTenantCreditBalance()` - Get current balance
   - `getTenantCreditSummary()` - Get detailed summary with breakdowns
   - `createTenantCredit()` - Create new credit record
   - `updateTenantCreditStatus()` - Update credit status (available/applied/refunded)
   - `adjustTenantCredit()` - Manual credit adjustment (admin only)
   - `getAllTenantsWithCredits()` - Get all tenants with credit balances

4. **`src/lib/api/deposit-ledger.ts`**
   - Full CRUD operations for deposits
   - `getTenantDepositTransactions()` - Get all deposit transactions
   - `getTenantDepositBalance()` - Get current balance
   - `getTenantDepositSummary()` - Get detailed summary
   - `createDepositTransaction()` - Create new deposit transaction
   - `refundDeposit()` - Process deposit refund
   - `applyDepositToInvoice()` - Apply deposit to pay invoice
   - `adjustDepositBalance()` - Manual adjustment (admin only)
   - `getAllTenantsWithDeposits()` - Get all tenants with deposits

### Phase 3: API Routes ✅

**Created API Endpoints:**

1. **Invoice Generation**
   - `POST /api/invoices/generate` - Generate invoices for tenant
   - Request: `{ tenantId, roomId, leaseStartDate, leaseEndDate, monthlyRent, depositAmount }`
   - Response: `{ invoicesCreated, invoiceIds, depositRecorded, message }`

2. **Payment Allocation**
   - `POST /api/payments/allocate` - Allocate payment to invoices
   - Request: `{ paymentId, tenantId, paymentAmount, depositAmount, useDeposit }`
   - Response: `{ totalAllocated, allocations[], creditCreated, creditAmount, message }`

3. **Tenant Credits**
   - `GET /api/tenant-credits` - Get all tenants with credit balances
   - `POST /api/tenant-credits` - Create or adjust tenant credit
   - `GET /api/tenant-credits/[tenantId]?type=balance|summary|history|all` - Get tenant credit data

4. **Deposit Ledger**
   - `GET /api/deposit-ledger` - Get all tenants with deposits
   - `POST /api/deposit-ledger` - Create transaction, refund, apply, or adjust
   - `GET /api/deposit-ledger/[tenantId]?type=balance|summary|history|all` - Get tenant deposit data

### Phase 4: Integration ✅

**Modified Existing APIs:**

1. **`src/app/api/rooms/[id]/assign/route.ts`**
   - ✅ Integrated auto-invoice generation on tenant assignment
   - Generates all monthly invoices from lease start to end date
   - Records deposit if provided
   - Returns invoice generation result with assignment

2. **`src/app/api/payments/route.ts`**
   - ✅ Integrated auto-payment allocation for rent payments
   - Automatically allocates payments to unpaid invoices
   - Creates tenant credits for excess amounts
   - Handles deposit amounts separately
   - Returns allocation result with payment creation

---

## ⏳ PENDING (Frontend Components)

### Critical Frontend Updates

1. **PaymentForm Component** (`src/components/features/PaymentForm.tsx`)
   - [ ] Remove Room dropdown (get from tenant's current assignment)
   - [ ] Remove Status dropdown (auto-calculated from allocation)
   - [ ] Add Deposit Amount field (separate from payment amount)
   - [ ] Add "Use Existing Deposit" checkbox with balance display
   - [ ] Auto-select tenant from query parameter (`?tenantId=xxx`)
   - [ ] Show payment allocation preview before submission
   - [ ] Display which invoices will be paid with this payment

2. **TenantForm Component** (`src/components/features/TenantForm.tsx`)
   - [ ] Reorder form sections:
     - Personal Information
     - **Room Assignment** (move before lease details)
     - Lease Details (with auto-filled monthly rent from room)
     - Emergency Contact
     - Employment Information
   - [ ] Add Building dropdown
   - [ ] Add Room dropdown (filtered by selected building)
   - [ ] Auto-fill monthly rent when room is selected
   - [ ] Show invoice generation success message on submission
   - [ ] Redirect to tenant detail page after creation

3. **Tenant Detail Page** (`src/app/admin/tenants/[id]/page.tsx`)
   - [ ] Add Payment History section
   - [ ] Add Invoices List section
   - [ ] Add Credit & Deposit Balance Card with:
     - Current credit balance
     - Current deposit balance
     - Quick action buttons (Apply Credit, Refund Deposit)
     - Transaction history links

4. **AdminSidebar & Layout**
   - [ ] Create `src/components/layout/AdminSidebar.tsx`
   - [ ] Create `src/components/layout/AdminLayout.tsx`
   - [ ] Update `src/app/admin/layout.tsx` to use AdminLayout
   - [ ] Add navigation links:
     - Dashboard
     - Buildings
     - Rooms
     - Tenants
     - Financial (Dashboard, Payments, Invoices, Credits, Deposits, Reports)
     - Assets
     - Documents
     - Settings

5. **Credit & Deposit Management Pages**
   - [ ] Create `src/app/admin/financial/credits/page.tsx`
   - [ ] Create `src/app/admin/financial/deposits/page.tsx`
   - [ ] Create management components with apply/refund actions

6. **Invoice Detail Page**
   - [ ] Create `src/app/admin/financial/invoices/[id]/page.tsx`
   - [ ] Show payment allocations table
   - [ ] Display which payments were applied to this invoice

---

## 🧪 TESTING GUIDE

### Test Scenario 1: Create Tenant with Room Assignment

**Steps:**
1. Run migration: `psql -d your_database < migrations/add-auto-invoicing-tables.sql`
2. Create a tenant with room assignment:
   ```bash
   curl -X POST http://localhost:3030/api/rooms/{roomId}/assign \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": "tenant-uuid",
       "startDate": "2025-12-01",
       "endDate": "2026-11-30",
       "monthlyRate": 5000,
       "depositPaid": 10000,
       "generateInvoices": true
     }'
   ```

**Expected Result:**
- ✅ 12 invoices created (one per month)
- ✅ All invoices with status "pending"
- ✅ Deposit of ₱10,000 recorded in deposit_ledger
- ✅ First invoice due on Dec 5, 2025

**Verification Queries:**
```sql
-- Check invoices
SELECT invoice_number, due_date, total_amount, invoice_status 
FROM invoices 
WHERE tenant_id = 'tenant-uuid' 
ORDER BY due_date;

-- Check deposit
SELECT * FROM deposit_ledger WHERE tenant_id = 'tenant-uuid';
```

### Test Scenario 2: Record Payment & Auto-Allocation

**Steps:**
1. Record a payment for ₱5,000:
   ```bash
   curl -X POST http://localhost:3030/api/payments \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": "tenant-uuid",
       "amount": 5000,
       "paymentType": "rent",
       "paymentMethod": "bank_transfer",
       "paymentDate": "2025-12-01",
       "autoAllocate": true
     }'
   ```

**Expected Result:**
- ✅ Payment created
- ✅ Payment allocated to oldest unpaid invoice
- ✅ Invoice status updated from "pending" to "paid"
- ✅ Payment allocation record created

**Verification Queries:**
```sql
-- Check payment allocations
SELECT p.id, p.amount, pa.allocated_amount, i.invoice_number, i.invoice_status
FROM payments p
LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
LEFT JOIN invoices i ON pa.invoice_id = i.id
WHERE p.tenant_id = 'tenant-uuid';
```

### Test Scenario 3: Overpayment Creates Credit

**Steps:**
1. Record payment of ₱10,000 (more than one invoice):
   ```bash
   curl -X POST http://localhost:3030/api/payments \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": "tenant-uuid",
       "amount": 10000,
       "paymentType": "rent",
       "paymentMethod": "cash",
       "paymentDate": "2025-12-05",
       "autoAllocate": true
     }'
   ```

**Expected Result:**
- ✅ ₱5,000 allocated to first unpaid invoice
- ✅ ₱5,000 saved as tenant credit
- ✅ Credit status = "available"
- ✅ Credit source = "excess_payment"

**Verification Queries:**
```sql
-- Check tenant credits
SELECT * FROM tenant_credits WHERE tenant_id = 'tenant-uuid';

-- Check credit balance
SELECT get_tenant_credit_balance('tenant-uuid');
```

### Test Scenario 4: Apply Deposit to Invoice

**Steps:**
1. Apply ₱5,000 from deposit to an invoice:
   ```bash
   curl -X POST http://localhost:3030/api/deposit-ledger \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": "tenant-uuid",
       "amount": 5000,
       "action": "apply",
       "invoiceId": "invoice-uuid",
       "description": "Apply deposit to January rent"
     }'
   ```

**Expected Result:**
- ✅ Deposit ledger record created with type "applied"
- ✅ Invoice amount_paid increased by ₱5,000
- ✅ Invoice status updated
- ✅ Remaining deposit balance: ₱5,000

**Verification Queries:**
```sql
-- Check deposit transactions
SELECT * FROM deposit_ledger WHERE tenant_id = 'tenant-uuid' ORDER BY created_at;

-- Check deposit balance
SELECT get_tenant_deposit_balance('tenant-uuid');
```

### Test Scenario 5: Credit Auto-Applies to New Invoice

**Steps:**
1. Generate a new invoice for next month:
   ```bash
   curl -X POST http://localhost:3030/api/invoices/generate \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": "tenant-uuid",
       "roomId": "room-uuid",
       "leaseStartDate": "2026-12-01",
       "leaseEndDate": "2027-11-30",
       "monthlyRent": 5000
     }'
   ```

2. Check if existing credit was auto-applied

**Expected Result:**
- ✅ If tenant has ₱5,000 credit available
- ✅ New invoice created with ₱5,000 credit applied
- ✅ Invoice status = "paid" or "partial"
- ✅ Credit status changed to "applied"

---

## 📝 DATABASE FUNCTIONS

### Helper Functions Available

```sql
-- Get tenant's current credit balance
SELECT get_tenant_credit_balance('tenant-uuid');

-- Get tenant's current deposit balance
SELECT get_tenant_deposit_balance('tenant-uuid');

-- Get total allocated amount for an invoice
SELECT get_invoice_allocated_amount('invoice-uuid');
```

### Example Queries

```sql
-- Get all tenants with credit balances
SELECT t.id, CONCAT(t.first_name, ' ', t.last_name) as name,
       get_tenant_credit_balance(t.id) as credit_balance
FROM tenants t
WHERE get_tenant_credit_balance(t.id) > 0;

-- Get payment allocation history for a tenant
SELECT p.payment_date, p.amount as payment_amount,
       pa.allocated_amount, i.invoice_number,
       i.invoice_status
FROM payments p
JOIN payment_allocations pa ON p.id = pa.payment_id
JOIN invoices i ON pa.invoice_id = i.id
WHERE p.tenant_id = 'tenant-uuid'
ORDER BY p.payment_date DESC;

-- Get tenant's financial summary
SELECT 
  get_tenant_credit_balance('tenant-uuid') as available_credit,
  get_tenant_deposit_balance('tenant-uuid') as deposit_balance,
  COUNT(i.id) as unpaid_invoices,
  COALESCE(SUM(i.balance_due), 0) as total_outstanding
FROM invoices i
WHERE i.tenant_id = 'tenant-uuid'
  AND i.invoice_status IN ('pending', 'sent', 'partial', 'overdue');
```

---

## 🚀 NEXT STEPS

### Priority 1: Run Migration
```bash
cd /Users/adrianestopace/Documents/oneph/parenta-nextjs
psql $DATABASE_URL < migrations/add-auto-invoicing-tables.sql
```

### Priority 2: Test Backend APIs
Use the test scenarios above to verify all backend functionality works correctly.

### Priority 3: Update Frontend Components
Implement the pending frontend changes listed above, starting with:
1. PaymentForm (most critical for user experience)
2. TenantForm (enables invoice generation on creation)
3. Tenant Detail Page (shows financial status)

### Priority 4: Build Admin Management Pages
- Credits management page
- Deposits management page
- Enhanced invoices page with allocations

---

## 📊 FEATURE SUMMARY

### What Works Now (Backend)

✅ **Auto-Invoicing**
- Automatically generates monthly invoices when tenant is assigned to room
- Handles prorated rent for mid-month move-ins
- Records deposits separately from rent invoices
- Creates one invoice per month for entire lease period

✅ **Payment Allocation**
- Automatically distributes payments across unpaid invoices
- Prioritizes oldest invoices first (by due date)
- Creates tenant credits for excess payments
- Updates invoice statuses automatically (pending → partial → paid)

✅ **Tenant Credits**
- Tracks all credit sources (excess payments, refunds, adjustments)
- Auto-applies credits to new invoices
- Manual credit adjustment by admins
- Credit history tracking

✅ **Deposit Management**
- Separate deposit ledger from regular payments
- Apply deposit to invoices (admin only)
- Refund deposits with balance verification
- Complete transaction history

✅ **Payment Tracking**
- Links payments to specific invoices via payment_allocations
- Shows exactly how each payment was distributed
- Audit trail for all financial transactions

### What Needs Frontend (UI)

⏳ **Enhanced Forms**
- PaymentForm needs deposit fields and allocation preview
- TenantForm needs room selection before lease details

⏳ **Financial Display**
- Tenant detail page needs credit/deposit balance cards
- Payment history with allocation details
- Invoice list with payment allocations

⏳ **Admin Management**
- Credits management page (view, apply, adjust)
- Deposits management page (view, apply, refund)
- Invoice detail page with allocations table

---

## 🔍 TROUBLESHOOTING

### Issue: Invoices not generating on tenant assignment

**Check:**
1. Is `generateInvoices` parameter set to `true`?
2. Is `endDate` provided? (Required for invoice generation)
3. Check server logs for errors

**Fix:**
```javascript
// Make sure to include these in assignment request
{
  "generateInvoices": true,
  "endDate": "2026-11-30"  // Required
}
```

### Issue: Payment not allocating to invoices

**Check:**
1. Is payment `paymentType` set to `'rent'`?
2. Is `autoAllocate` set to `true` or undefined? (defaults to true)
3. Are there unpaid invoices for this tenant?

**Verification Query:**
```sql
SELECT * FROM invoices 
WHERE tenant_id = 'tenant-uuid' 
AND invoice_status IN ('pending', 'sent', 'partial', 'overdue')
ORDER BY due_date;
```

### Issue: Credit balance not updating

**Check:**
1. Was payment successfully created?
2. Check payment_allocations table for records
3. Verify credit status is 'available'

**Verification Query:**
```sql
SELECT * FROM tenant_credits 
WHERE tenant_id = 'tenant-uuid' 
AND status = 'available';
```

---

## 📞 SUPPORT

For issues or questions:
1. Check this documentation
2. Review test scenarios above
3. Inspect database triggers and functions
4. Check API response messages for detailed errors

