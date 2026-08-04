#!/bin/bash

# Phase 2 API Testing Script
# Tests all endpoints for Late Fees, Bulk Operations, Notifications, and Lease Management

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3030"
API_BASE="${BASE_URL}/api"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print section header
print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

# Function to print test result
print_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local test_name=$1
    local status=$2
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local test_name=$3
    local data=$4
    
    echo -e "${YELLOW}Testing:${NC} $test_name"
    echo -e "${YELLOW}Endpoint:${NC} $method ${API_BASE}${endpoint}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -X $method "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -w "\nHTTP_STATUS:%{http_code}")
    else
        response=$(curl -s -X $method "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\nHTTP_STATUS:%{http_code}")
    fi
    
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')
    
    echo -e "${YELLOW}Response:${NC} HTTP $http_status"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    
    if [ "$http_status" -eq 200 ] || [ "$http_status" -eq 201 ] || [ "$http_status" -eq 207 ]; then
        print_test "$test_name" "PASS"
        return 0
    else
        print_test "$test_name" "FAIL"
        return 1
    fi
}

# Start testing
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║          PHASE 2 API COMPREHENSIVE TEST SUITE            ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "Testing against: ${BASE_URL}"
echo "Started at: $(date)"
echo ""

# Check if server is running
echo -e "${YELLOW}Checking if server is running...${NC}"
if curl -s "${BASE_URL}" > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running. Please start the development server first.${NC}"
    echo "Run: npm run dev"
    exit 1
fi

# =====================================================
# LATE FEES API TESTS
# =====================================================
print_header "1. LATE FEES API TESTS"

# Test 1.1: Get Late Fee Settings
test_endpoint "GET" "/late-fees/settings" "Get all late fee settings"

# Test 1.2: Create Late Fee Setting
late_fee_data='{
  "name": "Standard Late Fee - 5%",
  "description": "5% late fee applied after 5 days grace period",
  "fee_type": "percentage",
  "percentage_amount": 5,
  "grace_period_days": 5,
  "apply_after_days": 5,
  "is_active": true,
  "auto_apply": false,
  "send_notification": true
}'
test_endpoint "POST" "/late-fees/settings" "Create late fee setting" "$late_fee_data"

# Test 1.3: Calculate Late Fees (Dry Run)
test_endpoint "GET" "/late-fees/calculate" "Calculate late fees for all eligible invoices"

# Test 1.4: Apply Late Fees (Dry Run)
apply_late_fee_data='{"dry_run": true}'
test_endpoint "POST" "/late-fees/apply" "Apply late fees (dry run)" "$apply_late_fee_data"

# =====================================================
# BULK OPERATIONS API TESTS
# =====================================================
print_header "2. BULK OPERATIONS API TESTS"

# Test 2.1: Generate Monthly Invoices (Dry Run - won't create duplicates)
bulk_invoice_data='{
  "month": "2025-12"
}'
test_endpoint "POST" "/bulk/invoices/generate" "Generate monthly invoices for all tenants" "$bulk_invoice_data"

# Test 2.2: Test CSV Payment Import Structure (with empty array)
bulk_payment_data='{
  "payments": []
}'
test_endpoint "POST" "/bulk/payments/import" "Test bulk payment import structure" "$bulk_payment_data"

# =====================================================
# NOTIFICATIONS API TESTS
# =====================================================
print_header "3. NOTIFICATIONS & REMINDERS API TESTS"

# Test 3.1: Generate Payment Reminders
test_endpoint "POST" "/notifications/reminders/generate" "Generate payment reminders"

# Test 3.2: Process Notification Queue
test_endpoint "GET" "/notifications/queue/process" "Process notification queue"

# =====================================================
# LEASE MANAGEMENT API TESTS
# =====================================================
print_header "4. LEASE MANAGEMENT API TESTS"

# Test 4.1: Generate Lease Expiration Alerts
test_endpoint "POST" "/lease/alerts/generate" "Generate lease expiration alerts"

# Test 4.2: Get Lease Expiration Alerts
test_endpoint "GET" "/lease/alerts" "Get all lease expiration alerts"

# Test 4.3: Get Lease Renewal Requests
test_endpoint "GET" "/lease/renewals" "Get all lease renewal requests"

# Test 4.4: Get Move-Out Records
test_endpoint "GET" "/lease/moveouts" "Get all move-out processing records"

# =====================================================
# DASHBOARD & REPORTS API TESTS (From Phase 1)
# =====================================================
print_header "5. DASHBOARD & REPORTS API TESTS"

# Test 5.1: Get Dashboard Metrics
test_endpoint "GET" "/dashboard/metrics" "Get overall dashboard metrics"

# Test 5.2: Get Revenue Data
test_endpoint "GET" "/dashboard/revenue" "Get revenue data for charts"

# Test 5.3: Get Occupancy Rate
test_endpoint "GET" "/dashboard/occupancy" "Get occupancy rate"

# Test 5.4: Get Recent Payments
test_endpoint "GET" "/dashboard/payments/recent" "Get recent payments"

# Test 5.5: Get Outstanding Invoices
test_endpoint "GET" "/dashboard/invoices/outstanding" "Get outstanding invoices"

# Test 5.6: Get Upcoming Due Dates
test_endpoint "GET" "/dashboard/invoices/upcoming" "Get upcoming invoice due dates"

# =====================================================
# INTEGRATION TESTS
# =====================================================
print_header "6. INTEGRATION TESTS"

echo -e "${YELLOW}Running integration scenarios...${NC}"
echo ""

# Scenario 1: Complete workflow test
echo -e "${BLUE}Scenario 1: Late Fee Workflow${NC}"
echo "1. Calculate eligible invoices for late fees"
test_endpoint "GET" "/late-fees/calculate" "Step 1: Calculate late fees"

echo ""
echo "2. Apply late fees (dry run)"
test_endpoint "POST" "/late-fees/apply" "Step 2: Apply late fees (dry run)" '{"dry_run": true}'

echo ""
echo -e "${BLUE}Scenario 2: Notification Workflow${NC}"
echo "1. Generate payment reminders"
test_endpoint "POST" "/notifications/reminders/generate" "Step 1: Generate reminders"

echo ""
echo "2. Process notification queue"
test_endpoint "GET" "/notifications/queue/process" "Step 2: Process queue"

echo ""
echo -e "${BLUE}Scenario 3: Lease Management Workflow${NC}"
echo "1. Generate expiration alerts"
test_endpoint "POST" "/lease/alerts/generate" "Step 1: Generate alerts"

echo ""
echo "2. Check generated alerts"
test_endpoint "GET" "/lease/alerts" "Step 2: View alerts"

# =====================================================
# SUMMARY
# =====================================================
print_header "TEST SUMMARY"

echo "Total Tests Run: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}║              ✓ ALL TESTS PASSED SUCCESSFULLY!             ║${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}🎉 All Phase 2 APIs are working correctly!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run database migrations"
    echo "2. Configure Resend API key for email notifications"
    echo "3. Deploy to production"
    exit 0
else
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                           ║${NC}"
    echo -e "${RED}║                ✗ SOME TESTS FAILED                        ║${NC}"
    echo -e "${RED}║                                                           ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Some APIs are not working as expected.${NC}"
    echo ""
    echo "Possible issues:"
    echo "1. Database migrations not run yet"
    echo "2. Authentication/session issues"
    echo "3. Server not fully started"
    echo "4. Missing environment variables"
    exit 1
fi

