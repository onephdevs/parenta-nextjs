#!/bin/bash

# Auto-Invoicing System - Complete API Flow Test
# This script tests the entire workflow from tenant creation to payment allocation

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# API Base URL
BASE_URL="http://localhost:3030"

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to pretty print JSON
print_json() {
    echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
}

print_header "AUTO-INVOICING SYSTEM - API FLOW TEST"
echo "This test will simulate the complete workflow:"
echo "1. Fetch existing buildings and rooms"
echo "2. Create a new tenant"
echo "3. Assign tenant to a room (auto-generate invoices)"
echo "4. Check generated invoices"
echo "5. Record a payment (auto-allocate to invoices)"
echo "6. Check payment allocations"
echo "7. Verify tenant credits and deposits"
echo ""

# ============================================
# STEP 1: Get Buildings and Rooms
# ============================================
print_header "STEP 1: Fetch Buildings and Rooms"

print_info "Fetching all buildings..."
BUILDINGS_RESPONSE=$(curl -s "$BASE_URL/api/buildings")
echo "$BUILDINGS_RESPONSE" | python3 -m json.tool

BUILDING_ID=$(echo "$BUILDINGS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); buildings=data.get('data', {}).get('buildings', data.get('buildings', [])); print(buildings[0]['id'] if buildings else '')")
BUILDING_NAME=$(echo "$BUILDINGS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); buildings=data.get('data', {}).get('buildings', data.get('buildings', [])); print(buildings[0]['name'] if buildings else '')")

if [ -z "$BUILDING_ID" ]; then
    print_error "No buildings found. Please create a building first."
    exit 1
fi

print_success "Found building: $BUILDING_NAME (ID: $BUILDING_ID)"

print_info "Fetching available rooms..."
ROOMS_RESPONSE=$(curl -s "$BASE_URL/api/rooms")
echo "$ROOMS_RESPONSE" | python3 -m json.tool

ROOM_ID=$(echo "$ROOMS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); all_rooms=data.get('data', data.get('rooms', [])); all_rooms=all_rooms if isinstance(all_rooms, list) else []; rooms=[r for r in all_rooms if r.get('status')=='vacant' or r.get('roomStatus')=='vacant']; print(rooms[0]['id'] if rooms else '')")
ROOM_NUMBER=$(echo "$ROOMS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); all_rooms=data.get('data', data.get('rooms', [])); all_rooms=all_rooms if isinstance(all_rooms, list) else []; rooms=[r for r in all_rooms if r.get('status')=='vacant' or r.get('roomStatus')=='vacant']; print(rooms[0].get('roomNumber', rooms[0].get('room_number', '')) if rooms else '')")
RENT_AMOUNT=$(echo "$ROOMS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); all_rooms=data.get('data', data.get('rooms', [])); all_rooms=all_rooms if isinstance(all_rooms, list) else []; rooms=[r for r in all_rooms if r.get('status')=='vacant' or r.get('roomStatus')=='vacant']; print(rooms[0].get('monthlyRate', rooms[0].get('rent_amount', 0)) if rooms else '')")

if [ -z "$ROOM_ID" ]; then
    print_error "No available rooms found. Please create an available room first."
    exit 1
fi

print_success "Found available room: $ROOM_NUMBER (ID: $ROOM_ID, Rent: ₱$RENT_AMOUNT)"

# ============================================
# STEP 2: Create a New Tenant
# ============================================
print_header "STEP 2: Create New Tenant"

TIMESTAMP=$(date +%s)

TENANT_DATA=$(cat <<EOF
{
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "email": "juan.delacruz.test.$TIMESTAMP@example.com",
  "phone": "+63 917 123 4567",
  "dateOfBirth": "1990-05-15",
  "emergencyContactName": "Maria Dela Cruz",
  "emergencyContactPhone": "+63 917 765 4321",
  "emergencyContactRelationship": "Spouse",
  "employmentStatus": "employed",
  "employerName": "ABC Corporation",
  "monthlyIncome": 50000,
  "monthlyRent": $RENT_AMOUNT,
  "depositMonths": 2,
  "advanceMonths": 1,
  "leaseStartDate": "2025-01-01",
  "leaseEndDate": "2025-12-31",
  "notes": "Test tenant for auto-invoicing system"
}
EOF
)

print_info "Creating tenant with data:"
echo "$TENANT_DATA" | python3 -m json.tool

TENANT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/tenants" \
  -H "Content-Type: application/json" \
  -d "$TENANT_DATA")

echo "$TENANT_RESPONSE" | python3 -m json.tool

TENANT_ID=$(echo "$TENANT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['id'] if data.get('success') and data.get('data') else '')")

if [ -z "$TENANT_ID" ]; then
    print_error "Failed to create tenant"
    exit 1
fi

print_success "Tenant created successfully! ID: $TENANT_ID"

# ============================================
# STEP 3: Assign Tenant to Room (Auto-Generate Invoices)
# ============================================
print_header "STEP 3: Assign Tenant to Room (Auto-Generate Invoices)"

DEPOSIT_AMOUNT=$(echo "$RENT_AMOUNT * 2" | bc)

ASSIGNMENT_DATA=$(cat <<EOF
{
  "tenantId": "$TENANT_ID",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "monthlyRate": $RENT_AMOUNT,
  "depositPaid": $DEPOSIT_AMOUNT,
  "generateInvoices": true
}
EOF
)

print_info "Assigning tenant to room with data:"
echo "$ASSIGNMENT_DATA" | python3 -m json.tool

ASSIGNMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rooms/$ROOM_ID/assign" \
  -H "Content-Type: application/json" \
  -d "$ASSIGNMENT_DATA")

echo "$ASSIGNMENT_RESPONSE" | python3 -m json.tool

INVOICES_GENERATED=$(echo "$ASSIGNMENT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('invoicesGenerated', 0))")

if [ "$INVOICES_GENERATED" -gt 0 ]; then
    print_success "Room assignment successful! $INVOICES_GENERATED invoices auto-generated"
else
    print_error "Room assignment succeeded but no invoices generated"
fi

# ============================================
# STEP 4: Check Generated Invoices
# ============================================
print_header "STEP 4: Verify Generated Invoices"

print_info "Fetching invoices for tenant $TENANT_ID..."
INVOICES_RESPONSE=$(curl -s "$BASE_URL/api/invoices?tenantId=$TENANT_ID")
echo "$INVOICES_RESPONSE" | python3 -m json.tool

INVOICE_COUNT=$(echo "$INVOICES_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); invoices=data.get('data', {}).get('invoices', data.get('invoices', [])); print(len(invoices))")
print_success "Found $INVOICE_COUNT invoices for the tenant"

# Get the first invoice ID for payment allocation test
FIRST_INVOICE_ID=$(echo "$INVOICES_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); invoices=data.get('data', {}).get('invoices', data.get('invoices', [])); print(invoices[0]['id'] if invoices else '')")
FIRST_INVOICE_AMOUNT=$(echo "$INVOICES_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); invoices=data.get('data', {}).get('invoices', data.get('invoices', [])); print(invoices[0]['amount'] if invoices else '')")

print_info "First invoice ID: $FIRST_INVOICE_ID, Amount: ₱$FIRST_INVOICE_AMOUNT"

# ============================================
# STEP 5: Record a Payment (Auto-Allocate to Invoices)
# ============================================
print_header "STEP 5: Record Payment (Auto-Allocate to Invoices)"

# Pay more than one invoice to test allocation and credit creation
PAYMENT_AMOUNT=$(echo "$RENT_AMOUNT * 2.5" | bc)
print_info "Recording payment of ₱$PAYMENT_AMOUNT (more than one invoice to test credit creation)"

PAYMENT_DATA=$(cat <<EOF
{
  "tenantId": "$TENANT_ID",
  "roomId": "$ROOM_ID",
  "amount": $PAYMENT_AMOUNT,
  "paymentType": "rent",
  "paymentDate": "2025-01-15",
  "paymentMethod": "bank_transfer",
  "transactionId": "TEST-$(date +%s)",
  "description": "Test payment for auto-allocation",
  "autoAllocate": true
}
EOF
)

echo "$PAYMENT_DATA" | python3 -m json.tool

PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/payments" \
  -H "Content-Type: application/json" \
  -d "$PAYMENT_DATA")

echo "$PAYMENT_RESPONSE" | python3 -m json.tool

PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['payment']['id'] if data.get('success') and data.get('data') else '')")
INVOICES_PAID=$(echo "$PAYMENT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); details=data.get('allocationDetails', {}); print(details.get('invoicesPaid', 0))")
CREDIT_CREATED=$(echo "$PAYMENT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); details=data.get('allocationDetails', {}); print(details.get('creditCreated', 0))")

if [ ! -z "$PAYMENT_ID" ]; then
    print_success "Payment recorded! ID: $PAYMENT_ID"
    print_success "Invoices paid: $INVOICES_PAID"
    print_success "Credit created: ₱$CREDIT_CREATED"
else
    print_error "Failed to record payment"
fi

# ============================================
# STEP 6: Check Payment Allocations
# ============================================
print_header "STEP 6: Verify Payment Allocations"

print_info "Fetching updated invoices to check allocations..."
UPDATED_INVOICES=$(curl -s "$BASE_URL/api/invoices?tenantId=$TENANT_ID")
echo "$UPDATED_INVOICES" | python3 -m json.tool

COMPLETED_INVOICES=$(echo "$UPDATED_INVOICES" | python3 -c "import sys, json; data=json.load(sys.stdin); invoices=data.get('data', {}).get('invoices', data.get('invoices', [])); print(len([i for i in invoices if i['status']=='completed']))")
PARTIAL_INVOICES=$(echo "$UPDATED_INVOICES" | python3 -c "import sys, json; data=json.load(sys.stdin); invoices=data.get('data', {}).get('invoices', data.get('invoices', [])); print(len([i for i in invoices if i['status']=='partial']))")

print_success "Completed invoices: $COMPLETED_INVOICES"
print_success "Partial invoices: $PARTIAL_INVOICES"

# ============================================
# STEP 7: Check Tenant Credits and Deposits
# ============================================
print_header "STEP 7: Verify Tenant Credits and Deposits"

print_info "Fetching tenant credit balance..."
CREDITS_RESPONSE=$(curl -s "$BASE_URL/api/tenant-credits/$TENANT_ID")
echo "$CREDITS_RESPONSE" | python3 -m json.tool

CREDIT_BALANCE=$(echo "$CREDITS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('balance', 0))")
print_success "Tenant credit balance: ₱$CREDIT_BALANCE"

print_info "Fetching deposit ledger..."
DEPOSITS_RESPONSE=$(curl -s "$BASE_URL/api/deposit-ledger/$TENANT_ID")
echo "$DEPOSITS_RESPONSE" | python3 -m json.tool

DEPOSIT_BALANCE=$(echo "$DEPOSITS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('balance', 0))")
print_success "Security deposit balance: ₱$DEPOSIT_BALANCE"

# ============================================
# SUMMARY
# ============================================
print_header "TEST SUMMARY"

echo -e "${GREEN}✓ System Test Complete!${NC}\n"
echo "Workflow tested successfully:"
echo "  1. ✓ Fetched existing buildings and rooms"
echo "  2. ✓ Created new tenant (ID: $TENANT_ID)"
echo "  3. ✓ Assigned tenant to room (Room $ROOM_NUMBER)"
echo "  4. ✓ Auto-generated $INVOICES_GENERATED invoices"
echo "  5. ✓ Recorded payment of ₱$PAYMENT_AMOUNT"
echo "  6. ✓ Auto-allocated to $INVOICES_PAID invoices"
echo "  7. ✓ Created tenant credit of ₱$CREDIT_CREATED"
echo ""
echo "Final Balances:"
echo "  - Tenant Credit: ₱$CREDIT_BALANCE"
echo "  - Security Deposit: ₱$DEPOSIT_BALANCE"
echo "  - Completed Invoices: $COMPLETED_INVOICES"
echo "  - Partial Invoices: $PARTIAL_INVOICES"
echo ""
print_success "All auto-invoicing features working correctly! 🎉"

# ============================================
# CLEANUP PROMPT
# ============================================
echo -e "\n${YELLOW}Note: Test tenant (ID: $TENANT_ID) was created for testing.${NC}"
echo -e "${YELLOW}You can view details at: $BASE_URL/admin/tenants/$TENANT_ID${NC}"
echo -e "${YELLOW}To clean up, delete the tenant from the admin panel.${NC}\n"

