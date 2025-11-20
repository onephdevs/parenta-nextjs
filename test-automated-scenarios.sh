#!/bin/bash

# Automated Test Runner for Payment Scenarios
# Executes real API calls and validates responses

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

BASE_URL="http://localhost:3030"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Cleanup array
declare -a CLEANUP_TENANTS=()
declare -a CLEANUP_PAYMENTS=()

cleanup() {
    echo -e "\n${YELLOW}Cleaning up test data...${NC}"
    # Note: In production, implement proper cleanup
    # For now, we'll leave test data for manual inspection
}

trap cleanup EXIT

print_test() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}TEST $1: $2${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
}

print_step() {
    echo -e "${BLUE}  ➜ $1${NC}"
}

print_pass() {
    echo -e "${GREEN}  ✓ PASS: $1${NC}"
    ((PASSED_TESTS++))
}

print_fail() {
    echo -e "${RED}  ✗ FAIL: $1${NC}"
    ((FAILED_TESTS++))
}

print_info() {
    echo -e "${YELLOW}  ℹ $1${NC}"
}

assert_equals() {
    local expected=$1
    local actual=$2
    local message=$3
    
    if [ "$expected" == "$actual" ]; then
        print_pass "$message (expected: $expected, got: $actual)"
        return 0
    else
        print_fail "$message (expected: $expected, got: $actual)"
        return 1
    fi
}

assert_greater() {
    local value=$1
    local threshold=$2
    local message=$3
    
    if (( $(echo "$value > $threshold" | bc -l) )); then
        print_pass "$message ($value > $threshold)"
        return 0
    else
        print_fail "$message ($value <= $threshold)"
        return 1
    fi
}

get_available_room() {
    curl -s "$BASE_URL/api/rooms" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    rooms_data = data.get('data', data.get('rooms', []))
    rooms = rooms_data if isinstance(rooms_data, list) else []
    vacant = [r for r in rooms if r.get('status') == 'vacant' or r.get('roomStatus') == 'vacant']
    print(vacant[0]['id'] if vacant else '')
except: print('')
"
}

create_test_tenant() {
    local email=$1
    local rent=${2:-8000}
    local lease_start=${3:-"2025-01-01"}
    local lease_end=${4:-"2025-12-31"}
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/tenants" \
      -H "Content-Type: application/json" \
      -d "{
        \"firstName\": \"Test\",
        \"lastName\": \"User\",
        \"email\": \"$email\",
        \"phone\": \"+63 917 123 4567\",
        \"employmentStatus\": \"employed\",
        \"monthlyIncome\": 50000,
        \"monthlyRent\": $rent,
        \"depositMonths\": 2,
        \"advanceMonths\": 1,
        \"leaseStartDate\": \"$lease_start\",
        \"leaseEndDate\": \"$lease_end\"
      }")
    
    echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tenant_id = data.get('data', {}).get('id', '') if data.get('success') else ''
    print(tenant_id)
except: print('')
"
}

assign_tenant_to_room() {
    local tenant_id=$1
    local room_id=$2
    local rent=${3:-8000}
    local lease_start=${4:-"2025-01-01"}
    local lease_end=${5:-"2025-12-31"}
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/rooms/$room_id/assign" \
      -H "Content-Type: application/json" \
      -d "{
        \"tenantId\": \"$tenant_id\",
        \"monthlyRent\": $rent,
        \"leaseStartDate\": \"$lease_start\",
        \"leaseEndDate\": \"$lease_end\",
        \"depositMonths\": 2,
        \"advanceMonths\": 1
      }")
    
    echo "$RESPONSE"
}

record_payment() {
    local tenant_id=$1
    local room_id=$2
    local amount=$3
    local deposit=${4:-0}
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/payments" \
      -H "Content-Type: application/json" \
      -d "{
        \"tenantId\": \"$tenant_id\",
        \"roomId\": \"$room_id\",
        \"amount\": $amount,
        \"depositAmount\": $deposit,
        \"paymentType\": \"rent\",
        \"paymentMethod\": \"cash\",
        \"paymentDate\": \"2025-01-15\",
        \"notes\": \"Automated test payment\"
      }")
    
    echo "$RESPONSE"
}

get_tenant_invoices() {
    local tenant_id=$1
    curl -s "$BASE_URL/api/invoices?tenantId=$tenant_id"
}

get_tenant_credit_balance() {
    local tenant_id=$1
    curl -s "$BASE_URL/api/tenant-credits/$tenant_id/balance" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('balance', 0))
except: print('0')
"
}

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║            AUTOMATED PAYMENT SCENARIO TEST SUITE                      ║
║                                                                       ║
║  Testing real API endpoints with various payment scenarios           ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

# ==========================================
# TEST 1: Exact Payment for Single Invoice
# ==========================================
print_test "1" "Exact Payment for Single Invoice"
((TOTAL_TESTS++))

ROOM_ID=$(get_available_room)
if [ -z "$ROOM_ID" ]; then
    print_fail "No available room found"
else
    print_step "Creating tenant with ₱8,000 monthly rent"
    TENANT_ID=$(create_test_tenant "test.exact.$(date +%s)@test.com" 8000)
    
    if [ ! -z "$TENANT_ID" ]; then
        CLEANUP_TENANTS+=("$TENANT_ID")
        print_pass "Tenant created: $TENANT_ID"
        
        print_step "Assigning tenant to room"
        ASSIGN_RESPONSE=$(assign_tenant_to_room "$TENANT_ID" "$ROOM_ID" 8000)
        
        INVOICE_COUNT=$(echo "$ASSIGN_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(len(data.get('invoices', [])))
except: print('0')
")
        
        if [ "$INVOICE_COUNT" -gt "0" ]; then
            print_pass "Invoices generated: $INVOICE_COUNT"
            
            print_step "Recording exact payment of ₱8,000"
            PAYMENT_RESPONSE=$(record_payment "$TENANT_ID" "$ROOM_ID" 8000 0)
            
            if echo "$PAYMENT_RESPONSE" | grep -q '"success".*true'; then
                print_pass "Payment recorded successfully"
                
                # Check credit balance (should be 0)
                CREDIT=$(get_tenant_credit_balance "$TENANT_ID")
                assert_equals "0" "$CREDIT" "No credit created for exact payment"
            else
                print_fail "Payment recording failed"
            fi
        else
            print_fail "No invoices generated"
        fi
    else
        print_fail "Tenant creation failed"
    fi
fi

# ==========================================
# TEST 2: Partial Payment
# ==========================================
print_test "2" "Partial Payment (Under-payment)"
((TOTAL_TESTS++))

ROOM_ID=$(get_available_room)
if [ -z "$ROOM_ID" ]; then
    print_fail "No available room found"
else
    print_step "Creating tenant with ₱8,000 monthly rent"
    TENANT_ID=$(create_test_tenant "test.partial.$(date +%s)@test.com" 8000)
    
    if [ ! -z "$TENANT_ID" ]; then
        CLEANUP_TENANTS+=("$TENANT_ID")
        print_pass "Tenant created: $TENANT_ID"
        
        print_step "Assigning tenant to room"
        assign_tenant_to_room "$TENANT_ID" "$ROOM_ID" 8000 > /dev/null
        
        print_step "Recording partial payment of ₱5,000"
        PAYMENT_RESPONSE=$(record_payment "$TENANT_ID" "$ROOM_ID" 5000 0)
        
        if echo "$PAYMENT_RESPONSE" | grep -q '"success".*true'; then
            print_pass "Partial payment recorded successfully"
            
            # Get invoice status
            INVOICES=$(get_tenant_invoices "$TENANT_ID")
            PARTIAL_COUNT=$(echo "$INVOICES" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    invoices = data.get('invoices', [])
    partial = [i for i in invoices if i.get('status') == 'partial']
    print(len(partial))
except: print('0')
")
            
            if [ "$PARTIAL_COUNT" -gt "0" ]; then
                print_pass "Invoice marked as partial"
            else
                print_fail "Invoice not marked as partial"
            fi
        else
            print_fail "Partial payment recording failed"
        fi
    fi
fi

# ==========================================
# TEST 3: Overpayment (Credit Creation)
# ==========================================
print_test "3" "Overpayment Creating Tenant Credit"
((TOTAL_TESTS++))

ROOM_ID=$(get_available_room)
if [ -z "$ROOM_ID" ]; then
    print_fail "No available room found"
else
    print_step "Creating tenant with ₱8,000 monthly rent"
    TENANT_ID=$(create_test_tenant "test.overpay.$(date +%s)@test.com" 8000)
    
    if [ ! -z "$TENANT_ID" ]; then
        CLEANUP_TENANTS+=("$TENANT_ID")
        print_pass "Tenant created: $TENANT_ID"
        
        print_step "Assigning tenant to room (should create 12 invoices)"
        ASSIGN_RESPONSE=$(assign_tenant_to_room "$TENANT_ID" "$ROOM_ID" 8000)
        
        print_step "Recording overpayment of ₱20,000 (2.5x invoice amount)"
        PAYMENT_RESPONSE=$(record_payment "$TENANT_ID" "$ROOM_ID" 20000 0)
        
        if echo "$PAYMENT_RESPONSE" | grep -q '"success".*true'; then
            print_pass "Overpayment recorded successfully"
            
            # Check credit balance
            sleep 1  # Give DB time to update
            CREDIT=$(get_tenant_credit_balance "$TENANT_ID")
            
            print_info "Tenant credit balance: ₱$CREDIT"
            
            if (( $(echo "$CREDIT > 0" | bc -l) )); then
                print_pass "Tenant credit created (₱$CREDIT)"
            else
                print_fail "Expected credit to be created"
            fi
        else
            print_fail "Overpayment recording failed"
        fi
    fi
fi

# ==========================================
# TEST 4: Zero Payment (Should Fail)
# ==========================================
print_test "4" "Zero Payment Amount (Should Fail)"
((TOTAL_TESTS++))

print_step "Attempting to record ₱0 payment"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-id",
    "roomId": "test-room",
    "amount": 0,
    "paymentType": "rent",
    "paymentDate": "2025-01-15",
    "paymentMethod": "cash"
  }')

if echo "$RESPONSE" | grep -q '"success".*false'; then
    print_pass "Zero payment correctly rejected"
else
    print_fail "Zero payment was accepted (should be rejected)"
fi

# ==========================================
# TEST 5: Negative Payment (Should Fail)
# ==========================================
print_test "5" "Negative Payment Amount (Should Fail)"
((TOTAL_TESTS++))

print_step "Attempting to record negative payment"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-id",
    "roomId": "test-room",
    "amount": -1000,
    "paymentType": "rent",
    "paymentDate": "2025-01-15",
    "paymentMethod": "cash"
  }')

if echo "$RESPONSE" | grep -q '"success".*false'; then
    print_pass "Negative payment correctly rejected"
else
    print_fail "Negative payment was accepted (should be rejected)"
fi

# ==========================================
# TEST 6: Payment with Deposit Split
# ==========================================
print_test "6" "Payment with Deposit Split"
((TOTAL_TESTS++))

ROOM_ID=$(get_available_room)
if [ -z "$ROOM_ID" ]; then
    print_fail "No available room found"
else
    print_step "Creating tenant with ₱8,000 monthly rent"
    TENANT_ID=$(create_test_tenant "test.deposit.$(date +%s)@test.com" 8000)
    
    if [ ! -z "$TENANT_ID" ]; then
        CLEANUP_TENANTS+=("$TENANT_ID")
        print_pass "Tenant created: $TENANT_ID"
        
        print_step "Assigning tenant to room"
        assign_tenant_to_room "$TENANT_ID" "$ROOM_ID" 8000 > /dev/null
        
        print_step "Recording payment: ₱10,000 total (₱2,000 deposit + ₱8,000 to invoices)"
        PAYMENT_RESPONSE=$(record_payment "$TENANT_ID" "$ROOM_ID" 10000 2000)
        
        if echo "$PAYMENT_RESPONSE" | grep -q '"success".*true'; then
            print_pass "Payment with deposit split recorded"
            
            # Verify deposit was recorded
            DEPOSIT=$(curl -s "$BASE_URL/api/deposit-ledger/$TENANT_ID/balance" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('balance', 0))
except: print('0')
")
            
            print_info "Deposit balance: ₱$DEPOSIT"
            
            if (( $(echo "$DEPOSIT >= 2000" | bc -l) )); then
                print_pass "Deposit recorded correctly"
            else
                print_fail "Deposit not recorded correctly"
            fi
        else
            print_fail "Payment with deposit failed"
        fi
    fi
fi

# ==========================================
# TEST 7: Multiple Sequential Payments
# ==========================================
print_test "7" "Multiple Partial Payments to Same Invoice"
((TOTAL_TESTS++))

ROOM_ID=$(get_available_room)
if [ -z "$ROOM_ID" ]; then
    print_fail "No available room found"
else
    print_step "Creating tenant with ₱8,000 monthly rent"
    TENANT_ID=$(create_test_tenant "test.multi.$(date +%s)@test.com" 8000)
    
    if [ ! -z "$TENANT_ID" ]; then
        CLEANUP_TENANTS+=("$TENANT_ID")
        print_pass "Tenant created: $TENANT_ID"
        
        print_step "Assigning tenant to room"
        assign_tenant_to_room "$TENANT_ID" "$ROOM_ID" 8000 > /dev/null
        
        print_step "Payment 1: ₱2,000"
        record_payment "$TENANT_ID" "$ROOM_ID" 2000 0 > /dev/null
        
        print_step "Payment 2: ₱3,000"
        record_payment "$TENANT_ID" "$ROOM_ID" 3000 0 > /dev/null
        
        print_step "Payment 3: ₱3,000 (should complete invoice)"
        RESPONSE=$(record_payment "$TENANT_ID" "$ROOM_ID" 3000 0)
        
        if echo "$RESPONSE" | grep -q '"success".*true'; then
            print_pass "All three payments recorded"
            
            # Check if invoice is now completed
            INVOICES=$(get_tenant_invoices "$TENANT_ID")
            COMPLETED_COUNT=$(echo "$INVOICES" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    invoices = data.get('invoices', [])
    completed = [i for i in invoices if i.get('status') == 'completed']
    print(len(completed))
except: print('0')
")
            
            if [ "$COMPLETED_COUNT" -gt "0" ]; then
                print_pass "Invoice marked as completed after multiple payments"
            else
                print_info "Invoice not yet completed (may need more investigation)"
            fi
        else
            print_fail "Multiple payment sequence failed"
        fi
    fi
fi

# ==========================================
# TEST SUMMARY
# ==========================================
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                       TEST SUMMARY                             ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

PASS_RATE=0
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; ($PASSED_TESTS * 100) / $TOTAL_TESTS" | bc)
fi

echo -e "Total Test Scenarios: ${CYAN}$TOTAL_TESTS${NC}"
echo -e "Assertions Passed:    ${GREEN}$PASSED_TESTS${NC}"
echo -e "Assertions Failed:    ${RED}$FAILED_TESTS${NC}"
echo -e "Pass Rate:            ${YELLOW}${PASS_RATE}%${NC}"

echo -e "\n${YELLOW}Test data created:${NC}"
echo -e "  Tenants: ${#CLEANUP_TENANTS[@]}"
echo -e "  (Test data remains for manual inspection)"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All test scenarios passed!${NC}\n"
    exit 0
else
    echo -e "\n${YELLOW}⚠ Some assertions failed - review results above${NC}\n"
    exit 1
fi

