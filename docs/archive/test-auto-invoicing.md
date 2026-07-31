# Auto-Invoicing System - Test Script

This document provides step-by-step testing instructions for the auto-invoicing and payment processing system.

## Prerequisites

1. **Run the migration:**
   ```bash
   psql $DATABASE_URL < migrations/add-auto-invoicing-tables.sql
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Ensure you have test data:**
   - At least one building
   - At least one room in that building
   - At least one tenant (can be created during testing)

---

## Test 1: Auto-Invoice Generation on Tenant Assignment

### Setup
- Building ID: `{building-uuid}`
- Room ID: `{room-uuid}`
- Tenant will be assigned from Dec 1, 2025 to Nov 30, 2026 (12 months)

### Test Steps

1. **Assign tenant to room with auto-invoice generation:**

```bash
curl -X POST http://localhost:3030/api/rooms/{room-uuid}/assign \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "tenantId": "{tenant-uuid}",
    "startDate": "2025-12-01",
    "endDate": "2026-11-30",
    "monthlyRate": 5000,
    "depositPaid": 10000,
    "notes": "Test assignment with auto-invoicing",
    "generateInvoices": true
  }'
```

2. **Expected Response:**
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": "...",
      "tenant_id": "...",
      "room_id": "...",
      "assignment_status": "active"
    },
    "invoices": {
      "success": true,
      "invoicesCreated": 12,
      "invoiceIds": ["...", "..."],
      "depositRecorded": true,
      "depositAmount": 10000,
      "message": "Successfully generated 12 invoice(s) for ... and recorded deposit of ₱10000"
    }
  },
  "message": "Tenant assigned successfully. 12 invoice(s) generated."
}
```

3. **Verify in Database:**

```sql
-- Check invoices were created
SELECT 
  invoice_number,
  due_date,
  total_amount,
  invoice_status,
  balance_due
FROM invoices 
WHERE tenant_id = '{tenant-uuid}'
ORDER BY due_date;

-- Expected: 12 rows, all with status 'pending'

-- Check deposit was recorded
SELECT * FROM deposit_ledger 
WHERE tenant_id = '{tenant-uuid}';

-- Expected: 1 row, transaction_type = 'deposit', amount = 10000

-- Check deposit balance
SELECT get_tenant_deposit_balance('{tenant-uuid}');

-- Expected: 10000.00
```

**✅ Test Passes If:**
- API returns success: true
- 12 invoices created (one per month)
- All invoices have status 'pending'
- Deposit of ₱10,000 recorded
- Deposit balance is ₱10,000

---

## Test 2: Payment Allocation to Oldest Invoice

### Setup
- Use tenant from Test 1 with 12 unpaid invoices
- Record a payment of ₱5,000

### Test Steps

1. **Record a payment:**

```bash
curl -X POST http://localhost:3030/api/payments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "tenantId": "{tenant-uuid}",
    "roomAssignmentId": "{assignment-uuid}",
    "amount": 5000,
    "paymentType": "rent",
    "paymentMethod": "bank_transfer",
    "paymentDate": "2025-12-05",
    "referenceNumber": "TEST-001",
    "autoAllocate": true
  }'
```

2. **Expected Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "...",
      "amount": 5000,
      "payment_status": "paid"
    },
    "allocation": {
      "success": true,
      "totalAllocated": 5000,
      "allocations": [
        {
          "invoiceId": "...",
          "invoiceNumber": "INV-...",
          "amountAllocated": 5000,
          "invoiceStatus": "paid"
        }
      ],
      "creditCreated": false,
      "creditAmount": 0,
      "message": "Payment allocated to 1 invoice(s): ₱5000.00 to INV-..."
    }
  },
  "message": "Payment allocated to 1 invoice(s): ₱5000.00 to INV-..."
}
```

3. **Verify in Database:**

```sql
-- Check payment allocation
SELECT 
  p.id as payment_id,
  p.amount as payment_amount,
  pa.allocated_amount,
  i.invoice_number,
  i.invoice_status
FROM payments p
LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
LEFT JOIN invoices i ON pa.invoice_id = i.id
WHERE p.tenant_id = '{tenant-uuid}'
ORDER BY p.created_at DESC
LIMIT 1;

-- Expected: Payment of 5000 allocated to oldest invoice, invoice status = 'paid'

-- Check invoice was updated
SELECT * FROM invoices 
WHERE tenant_id = '{tenant-uuid}' 
ORDER BY due_date 
LIMIT 1;

-- Expected: amount_paid = 5000, invoice_status = 'paid', balance_due = 0
```

**✅ Test Passes If:**
- Payment created successfully
- ₱5,000 allocated to oldest unpaid invoice
- Invoice status changed from 'pending' to 'paid'
- Payment allocation record created
- No credit created (payment exactly matched invoice)

---

## Test 3: Overpayment Creates Tenant Credit

### Setup
- Use tenant from previous tests
- Record a payment of ₱15,000 (covers 3 invoices with ₱0 remaining)

### Test Steps

1. **Record an overpayment:**

```bash
curl -X POST http://localhost:3030/api/payments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "tenantId": "{tenant-uuid}",
    "roomAssignmentId": "{assignment-uuid}",
    "amount": 15000,
    "paymentType": "rent",
    "paymentMethod": "cash",
    "paymentDate": "2025-12-10",
    "referenceNumber": "TEST-002",
    "autoAllocate": true
  }'
```

2. **Expected Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "...",
      "amount": 15000
    },
    "allocation": {
      "success": true,
      "totalAllocated": 15000,
      "allocations": [
        {
          "invoiceId": "...",
          "invoiceNumber": "INV-...",
          "amountAllocated": 5000,
          "invoiceStatus": "paid"
        },
        {
          "invoiceId": "...",
          "invoiceNumber": "INV-...",
          "amountAllocated": 5000,
          "invoiceStatus": "paid"
        },
        {
          "invoiceId": "...",
          "invoiceNumber": "INV-...",
          "amountAllocated": 5000,
          "invoiceStatus": "paid"
        }
      ],
      "creditCreated": false,
      "creditAmount": 0,
      "message": "Payment allocated to 3 invoice(s): ₱5000.00 to INV-..., ₱5000.00 to INV-..., ₱5000.00 to INV-..."
    }
  }
}
```

3. **Verify in Database:**

```sql
-- Check payment allocations
SELECT COUNT(*) as allocation_count
FROM payment_allocations
WHERE payment_id = (
  SELECT id FROM payments 
  WHERE tenant_id = '{tenant-uuid}' 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Expected: 3 allocations

-- Check paid invoices count
SELECT COUNT(*) as paid_count
FROM invoices
WHERE tenant_id = '{tenant-uuid}' 
AND invoice_status = 'paid';

-- Expected: 4 invoices paid (1 from Test 2 + 3 from this test)
```

**✅ Test Passes If:**
- Payment of ₱15,000 created
- 3 invoices marked as paid
- All allocations sum to ₱15,000
- No excess credit (payment exactly covered 3 invoices)

---

## Test 4: Apply Deposit to Invoice

### Setup
- Use tenant from Test 1 with ₱10,000 deposit
- Apply ₱5,000 from deposit to next unpaid invoice

### Test Steps

1. **Get next unpaid invoice ID:**

```sql
SELECT id, invoice_number, balance_due
FROM invoices
WHERE tenant_id = '{tenant-uuid}'
AND invoice_status IN ('pending', 'partial')
ORDER BY due_date
LIMIT 1;
```

2. **Apply deposit to invoice:**

```bash
curl -X POST http://localhost:3030/api/deposit-ledger \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "tenantId": "{tenant-uuid}",
    "amount": 5000,
    "action": "apply",
    "invoiceId": "{invoice-uuid}",
    "description": "Apply deposit to rent invoice"
  }'
```

3. **Expected Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "...",
      "transaction_type": "applied",
      "amount": 5000,
      "applied_to_invoice_id": "..."
    },
    "invoiceStatus": "paid",
    "remainingBalance": 5000
  }
}
```

4. **Verify in Database:**

```sql
-- Check deposit transactions
SELECT 
  transaction_type,
  amount,
  description,
  transaction_date
FROM deposit_ledger
WHERE tenant_id = '{tenant-uuid}'
ORDER BY created_at;

-- Expected: 2 rows (1 deposit, 1 applied)

-- Check deposit balance
SELECT get_tenant_deposit_balance('{tenant-uuid}');

-- Expected: 5000.00 (10000 - 5000)

-- Check invoice was paid from deposit
SELECT * FROM invoices WHERE id = '{invoice-uuid}';

-- Expected: amount_paid = 5000, invoice_status = 'paid'
```

**✅ Test Passes If:**
- Deposit ledger transaction created with type 'applied'
- Invoice paid from deposit
- Remaining deposit balance is ₱5,000
- No payment record created (this was from deposit, not payment)

---

## Test 5: Get Tenant Financial Summary

### Setup
- Use tenant from previous tests

### Test Steps

1. **Get credit balance:**

```bash
curl http://localhost:3030/api/tenant-credits/{tenant-uuid}?type=balance \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

2. **Get credit summary:**

```bash
curl http://localhost:3030/api/tenant-credits/{tenant-uuid}?type=summary \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

3. **Get deposit balance:**

```bash
curl http://localhost:3030/api/deposit-ledger/{tenant-uuid}?type=balance \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

4. **Get deposit summary:**

```bash
curl http://localhost:3030/api/deposit-ledger/{tenant-uuid}?type=summary \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

5. **Expected Responses:**

**Credit Balance:**
```json
{
  "success": true,
  "data": 0  // No credit if all payments matched invoices
}
```

**Deposit Balance:**
```json
{
  "success": true,
  "data": 5000  // ₱10,000 deposit - ₱5,000 applied
}
```

**✅ Test Passes If:**
- All API endpoints return success
- Balances match expected values
- Summaries show correct breakdowns

---

## Test 6: Refund Deposit

### Setup
- Use tenant from previous tests with ₱5,000 deposit balance

### Test Steps

1. **Refund ₱5,000 deposit:**

```bash
curl -X POST http://localhost:3030/api/deposit-ledger \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "tenantId": "{tenant-uuid}",
    "amount": 5000,
    "action": "refund",
    "description": "Full deposit refund on move-out"
  }'
```

2. **Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "transaction_type": "refund",
    "amount": 5000,
    "description": "Full deposit refund on move-out"
  }
}
```

3. **Verify in Database:**

```sql
-- Check deposit balance
SELECT get_tenant_deposit_balance('{tenant-uuid}');

-- Expected: 0.00

-- Check deposit transactions
SELECT 
  transaction_type,
  amount,
  description
FROM deposit_ledger
WHERE tenant_id = '{tenant-uuid}'
ORDER BY created_at;

-- Expected: 3 rows (deposit, applied, refund)
```

**✅ Test Passes If:**
- Refund transaction created
- Deposit balance is ₱0
- All deposit transactions are tracked

---

## Summary Verification

After all tests, verify the complete state:

```sql
-- Tenant Financial Summary
SELECT 
  'Credit Balance' as metric,
  get_tenant_credit_balance('{tenant-uuid}') as amount
UNION ALL
SELECT 
  'Deposit Balance',
  get_tenant_deposit_balance('{tenant-uuid}')
UNION ALL
SELECT 
  'Unpaid Invoices Count',
  COUNT(*)::numeric
FROM invoices
WHERE tenant_id = '{tenant-uuid}' 
AND invoice_status IN ('pending', 'partial', 'overdue')
UNION ALL
SELECT 
  'Total Outstanding',
  COALESCE(SUM(balance_due), 0)
FROM invoices
WHERE tenant_id = '{tenant-uuid}' 
AND invoice_status IN ('pending', 'partial', 'overdue');
```

**Expected Results:**
- Credit Balance: 0 or positive number if overpaid
- Deposit Balance: 0 (after refund)
- Unpaid Invoices: Remaining invoices from lease
- Total Outstanding: Sum of unpaid invoice balances

---

## Troubleshooting

### Issue: 401 Unauthorized

**Solution:** You need to be authenticated as an admin. Get your session token:
1. Log in to the app at http://localhost:3030
2. Open browser DevTools → Application → Cookies
3. Copy the `next-auth.session-token` value
4. Use it in curl: `-H "Cookie: next-auth.session-token=YOUR_TOKEN"`

### Issue: 404 Not Found

**Solution:** Check that all UUIDs are correct:
```sql
-- Get tenant UUID
SELECT id, first_name, last_name FROM tenants;

-- Get room UUID
SELECT id, room_number FROM rooms;

-- Get invoice UUIDs
SELECT id, invoice_number FROM invoices WHERE tenant_id = '{tenant-uuid}';
```

### Issue: No invoices generated

**Solution:** Check the request includes:
- `generateInvoices: true`
- `endDate`: Must be provided for invoice generation
- `monthlyRate`: Must be a positive number

---

## Automated Test Script

Save this as `test-auto-invoicing.sh`:

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:3030"
TENANT_ID="your-tenant-uuid"
ROOM_ID="your-room-uuid"
SESSION_TOKEN="your-session-token"

echo "🧪 Testing Auto-Invoicing System"
echo "================================="

# Test 1: Assign tenant with auto-invoicing
echo ""
echo "Test 1: Auto-Invoice Generation..."
curl -s -X POST "$API_URL/api/rooms/$ROOM_ID/assign" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -d '{
    "tenantId": "'$TENANT_ID'",
    "startDate": "2025-12-01",
    "endDate": "2026-11-30",
    "monthlyRate": 5000,
    "depositPaid": 10000,
    "generateInvoices": true
  }' | jq '.'

# Test 2: Record payment with auto-allocation
echo ""
echo "Test 2: Payment Allocation..."
curl -s -X POST "$API_URL/api/payments" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -d '{
    "tenantId": "'$TENANT_ID'",
    "amount": 5000,
    "paymentType": "rent",
    "paymentMethod": "bank_transfer",
    "paymentDate": "2025-12-05",
    "autoAllocate": true
  }' | jq '.'

# Test 3: Get financial summary
echo ""
echo "Test 3: Financial Summary..."
echo "Credit Balance:"
curl -s "$API_URL/api/tenant-credits/$TENANT_ID?type=balance" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" | jq '.'

echo ""
echo "Deposit Balance:"
curl -s "$API_URL/api/deposit-ledger/$TENANT_ID?type=balance" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" | jq '.'

echo ""
echo "✅ All tests completed!"
```

Make it executable and run:
```bash
chmod +x test-auto-invoicing.sh
./test-auto-invoicing.sh
```

