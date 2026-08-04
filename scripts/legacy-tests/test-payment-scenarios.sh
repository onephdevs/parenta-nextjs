#!/bin/bash

# Payment Allocation Test Matrix
# Tests various payment scenarios and allocation logic

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL="http://localhost:3030"

print_scenario() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ SCENARIO $1: $2${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
}

print_info() {
    echo -e "${YELLOW}  → $1${NC}"
}

print_result() {
    echo -e "${GREEN}  ✓ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_header "PAYMENT ALLOCATION TEST MATRIX"
echo "Testing various payment and allocation scenarios..."

# ==========================================
# SCENARIO 1: Single Invoice, Exact Payment
# ==========================================
print_scenario "1" "Single Invoice, Exact Payment"
print_info "Setup: 1 invoice of ₱8,000"
print_info "Payment: ₱8,000"
print_info "Expected: Invoice fully paid, no credit"

cat <<EOF
  Payment Allocation:
  ┌─────────────────────────────────────┐
  │ Invoice #1: ₱8,000                  │
  │ Payment:    ₱8,000 ──────> [PAID]  │
  │                                     │
  │ Result:                             │
  │  - Invoice Status: Completed        │
  │  - Remaining:      ₱0               │
  │  - Credit Created: ₱0               │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 2: Single Invoice, Under-Payment
# ==========================================
print_scenario "2" "Single Invoice, Partial Payment"
print_info "Setup: 1 invoice of ₱8,000"
print_info "Payment: ₱5,000"
print_info "Expected: Invoice partially paid, ₱3,000 remaining"

cat <<EOF
  Payment Allocation:
  ┌─────────────────────────────────────┐
  │ Invoice #1: ₱8,000                  │
  │ Payment:    ₱5,000 ──> [PARTIAL]   │
  │                                     │
  │ Result:                             │
  │  - Invoice Status: Partial          │
  │  - Paid Amount:    ₱5,000           │
  │  - Remaining:      ₱3,000           │
  │  - Credit Created: ₱0               │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 3: Single Invoice, Over-Payment
# ==========================================
print_scenario "3" "Single Invoice, Over-Payment (Credit Creation)"
print_info "Setup: 1 invoice of ₱8,000"
print_info "Payment: ₱10,000"
print_info "Expected: Invoice paid, ₱2,000 credit created"

cat <<EOF
  Payment Allocation:
  ┌─────────────────────────────────────┐
  │ Invoice #1: ₱8,000 ──> [PAID]      │
  │ Payment:    ₱10,000                 │
  │                                     │
  │ Excess:     ₱2,000 ──> [CREDIT]   │
  │                                     │
  │ Result:                             │
  │  - Invoice Status:  Completed       │
  │  - Tenant Credit:   ₱2,000          │
  │  - Next Invoice:    Auto-applied    │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 4: Multiple Invoices, Exact Payment
# ==========================================
print_scenario "4" "Multiple Invoices, Exact Payment"
print_info "Setup: 3 invoices of ₱8,000 each (total ₱24,000)"
print_info "Payment: ₱24,000"
print_info "Expected: All 3 invoices paid, no credit"

cat <<EOF
  Payment Allocation (Oldest First):
  ┌─────────────────────────────────────┐
  │ Invoice #1 (Jan): ₱8,000 ──> PAID  │
  │ Invoice #2 (Feb): ₱8,000 ──> PAID  │
  │ Invoice #3 (Mar): ₱8,000 ──> PAID  │
  │                                     │
  │ Payment: ₱24,000                    │
  │                                     │
  │ Result:                             │
  │  - Invoices Paid: 3                 │
  │  - Credit:        ₱0                │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 5: Multiple Invoices, Partial for Last
# ==========================================
print_scenario "5" "Multiple Invoices, Partial on Last"
print_info "Setup: 3 invoices of ₱8,000 each"
print_info "Payment: ₱20,000"
print_info "Expected: 2 paid, 1 partial (₱4,000 remaining)"

cat <<EOF
  Payment Allocation:
  ┌─────────────────────────────────────┐
  │ Invoice #1: ₱8,000 ──> PAID        │
  │ Invoice #2: ₱8,000 ──> PAID        │
  │ Invoice #3: ₱8,000 ──> PARTIAL     │
  │             ₱4,000 applied          │
  │             ₱4,000 remaining        │
  │                                     │
  │ Result:                             │
  │  - Completed: 2                     │
  │  - Partial:   1                     │
  │  - Pending:   0                     │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 6: Multiple Invoices, Large Overpayment
# ==========================================
print_scenario "6" "Multiple Invoices, Large Overpayment"
print_info "Setup: 12 invoices of ₱8,000 each (₱96,000 total)"
print_info "Payment: ₱100,000"
print_info "Expected: All 12 paid, ₱4,000 credit"

cat <<EOF
  Payment Allocation:
  ┌─────────────────────────────────────┐
  │ Invoices #1-12: All PAID            │
  │ Total Allocated: ₱96,000            │
  │                                     │
  │ Payment:  ₱100,000                  │
  │ Excess:   ₱4,000 ──> CREDIT        │
  │                                     │
  │ Result:                             │
  │  - All Invoices:  Completed         │
  │  - Credit:        ₱4,000            │
  │  - Auto-applies:  Next invoice      │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 7: With Existing Credit
# ==========================================
print_scenario "7" "New Invoice with Existing Credit"
print_info "Setup: New invoice ₱8,000, Existing credit ₱4,000"
print_info "Payment: ₱4,000"
print_info "Expected: Credit auto-applied first, then payment"

cat <<EOF
  Auto-Application Flow:
  ┌─────────────────────────────────────┐
  │ Invoice #13: ₱8,000                 │
  │                                     │
  │ Step 1: Apply existing credit       │
  │   Credit:  ₱4,000 ──> applied       │
  │   Balance: ₱4,000 remaining         │
  │                                     │
  │ Step 2: Apply new payment           │
  │   Payment: ₱4,000 ──> applied       │
  │   Balance: ₱0                       │
  │                                     │
  │ Result:                             │
  │  - Invoice:  Completed              │
  │  - Credit:   ₱0 (fully used)        │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 8: Multiple Partial Payments
# ==========================================
print_scenario "8" "Multiple Partial Payments Accumulating"
print_info "Setup: 1 invoice of ₱8,000"
print_info "Payments: ₱2,000 + ₱3,000 + ₱3,000"
print_info "Expected: Accumulate to full payment"

cat <<EOF
  Sequential Payments:
  ┌─────────────────────────────────────┐
  │ Invoice: ₱8,000                     │
  │                                     │
  │ Payment 1: ₱2,000                   │
  │   Status: Partial (₱6,000 left)    │
  │                                     │
  │ Payment 2: ₱3,000                   │
  │   Status: Partial (₱3,000 left)    │
  │                                     │
  │ Payment 3: ₱3,000                   │
  │   Status: Completed (₱0 left)      │
  │                                     │
  │ Result:                             │
  │  - Total Paid: ₱8,000               │
  │  - Payments:   3                    │
  │  - Status:     Completed            │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 9: Deposit vs Payment
# ==========================================
print_scenario "9" "Deposit and Payment Separation"
print_info "Setup: Total received ₱10,000"
print_info "Split: ₱2,000 to Deposit, ₱8,000 to Payment"
print_info "Expected: Separate ledgers maintained"

cat <<EOF
  Dual Allocation:
  ┌─────────────────────────────────────┐
  │ Total Received: ₱10,000             │
  │                                     │
  │ ┌─────────────────┐                 │
  │ │ Deposit Ledger  │                 │
  │ │ + ₱2,000        │                 │
  │ │ Balance: ₱2,000 │                 │
  │ └─────────────────┘                 │
  │                                     │
  │ ┌─────────────────┐                 │
  │ │ Payment to      │                 │
  │ │ Invoices        │                 │
  │ │ ₱8,000 ──> INV  │                 │
  │ └─────────────────┘                 │
  │                                     │
  │ Note: Deposits managed separately   │
  │       Not auto-applied to invoices  │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 10: Priority Order Test
# ==========================================
print_scenario "10" "Oldest First Allocation Priority"
print_info "Setup: 5 invoices with different due dates"
print_info "Payment: ₱20,000 (enough for 2.5 invoices)"
print_info "Expected: Oldest invoices paid first"

cat <<EOF
  Chronological Allocation:
  ┌─────────────────────────────────────┐
  │ Invoice #1 (Jan 31): ₱8,000 PAID   │
  │ Invoice #2 (Feb 28): ₱8,000 PAID   │
  │ Invoice #3 (Mar 31): ₱8,000 PART   │
  │   Paid: ₱4,000                      │
  │   Remaining: ₱4,000                 │
  │ Invoice #4 (Apr 30): ₱8,000 PEND   │
  │ Invoice #5 (May 31): ₱8,000 PEND   │
  │                                     │
  │ Priority Rule: Always oldest first  │
  │ Prevents: Skipping old invoices     │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 11: Micro Payment
# ==========================================
print_scenario "11" "Micro Payment (Very Small Amount)"
print_info "Setup: Multiple unpaid invoices"
print_info "Payment: ₱1"
print_info "Expected: Applied to oldest, status tracked"

cat <<EOF
  Micro Amount Handling:
  ┌─────────────────────────────────────┐
  │ Invoice #1: ₱8,000                  │
  │ Payment:    ₱1                      │
  │                                     │
  │ Result:                             │
  │  - Invoice #1: Partial              │
  │  - Paid:       ₱1                   │
  │  - Remaining:  ₱7,999               │
  │                                     │
  │ System handles:                     │
  │  - Decimal precision                │
  │  - Status updates                   │
  │  - Audit trail                      │
  └─────────────────────────────────────┘
EOF

# ==========================================
# SCENARIO 12: Complex Multi-Payment Flow
# ==========================================
print_scenario "12" "Complex Flow: Credits, Payments, Deposits"
print_info "Complete workflow test with multiple transactions"

cat <<EOF
  Complete Transaction Flow:
  ┌─────────────────────────────────────┐
  │ Month 1:                            │
  │   Payment: ₱20,000                  │
  │   Invoices: 2 x ₱8,000 = Paid      │
  │   Credit: ₱4,000                    │
  │                                     │
  │ Month 2:                            │
  │   Invoice: ₱8,000 generated         │
  │   Auto-apply credit: ₱4,000         │
  │   Remaining: ₱4,000                 │
  │   Payment: ₱4,000                   │
  │   Status: Paid                      │
  │                                     │
  │ Month 3:                            │
  │   Deposit payment: ₱16,000          │
  │   Split: ₱8,000 to deposit          │
  │          ₱8,000 to invoice          │
  │                                     │
  │ Final State:                        │
  │  - Invoices Paid: 3                 │
  │  - Credit: ₱0                       │
  │  - Deposit: ₱8,000                  │
  └─────────────────────────────────────┘
EOF

# ==========================================
# TEST MATRIX SUMMARY
# ==========================================
print_header "TEST MATRIX SUMMARY"

cat <<EOF
┌────────────────────────────────────────────────────────────────────────┐
│                         PAYMENT ALLOCATION RULES                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Allocation Priority:                                                │
│     → Always allocate to OLDEST invoice first                           │
│     → Continue to next invoice if payment remains                       │
│     → Stop when payment exhausted                                       │
│                                                                         │
│  2. Invoice Status Updates:                                             │
│     → Pending:   No payment applied (₱0 paid)                           │
│     → Partial:   Some payment applied (₱0 < paid < total)               │
│     → Completed: Fully paid (paid = total)                              │
│     → Overdue:   Past due date and not completed                        │
│                                                                         │
│  3. Credit Creation:                                                    │
│     → Created when payment > total unpaid invoices                      │
│     → Automatically applied to next generated invoice                   │
│     → Can be manually managed by admin                                  │
│                                                                         │
│  4. Deposit Handling:                                                   │
│     → Maintained in separate ledger                                     │
│     → NOT automatically applied to invoices                             │
│     → Can be manually applied or refunded                               │
│     → Tracked with full transaction history                             │
│                                                                         │
│  5. Payment Recording:                                                  │
│     → Each payment creates audit trail                                  │
│     → Allocations tracked in payment_allocations table                  │
│     → Links payment to specific invoices                                │
│     → Maintains transaction integrity                                   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                          EDGE CASES TO TEST                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✓ Exact payment matching invoice amount                               │
│  ✓ Partial payment (under-payment)                                     │
│  ✓ Overpayment creating credit                                         │
│  ✓ Multiple invoices, exact total payment                              │
│  ✓ Multiple invoices, partial on last                                  │
│  ✓ Large overpayment (many invoices)                                   │
│  ✓ Payment with existing credit                                        │
│  ✓ Multiple sequential partial payments                                │
│  ✓ Deposit and payment separation                                      │
│  ✓ Oldest-first allocation priority                                    │
│  ✓ Micro payment amounts (₱1)                                          │
│  ✓ Complex multi-transaction flow                                      │
│  ✓ Zero amount payment (should fail)                                   │
│  ✓ Negative amount payment (should fail)                               │
│  ✓ Concurrent payment processing                                       │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
EOF

print_header "TESTING RECOMMENDATIONS"

cat <<EOF
1. Unit Tests:
   - Test each allocation scenario independently
   - Mock database for fast execution
   - Cover all edge cases

2. Integration Tests:
   - Test complete payment flow end-to-end
   - Use test database with fixtures
   - Verify database state after each step

3. Performance Tests:
   - Test with 100+ invoices
   - Concurrent payment processing
   - Large payment amounts

4. Manual Verification:
   - Test through UI for each scenario
   - Verify reports and summaries
   - Check audit trails

5. Database Consistency:
   - Verify total paid = sum of allocations
   - Check invoice remaining_amount accuracy
   - Validate credit balances

6. Error Handling:
   - Transaction rollback on failure
   - Proper error messages
   - Audit log for failures
EOF

echo -e "\n${GREEN}Test matrix documentation complete!${NC}"
echo -e "${YELLOW}Use these scenarios to build comprehensive test suites.${NC}\n"

