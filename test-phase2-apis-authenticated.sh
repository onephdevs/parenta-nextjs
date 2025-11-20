#!/bin/bash

# Phase 2 API Testing Script with Authentication
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
COOKIE_FILE="/tmp/phase2_test_cookies.txt"

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

# Function to test API endpoint with authentication
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
            -b "$COOKIE_FILE" \
            -w "\nHTTP_STATUS:%{http_code}")
    else
        response=$(curl -s -X $method "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -b "$COOKIE_FILE" \
            -d "$data" \
            -w "\nHTTP_STATUS:%{http_code}")
    fi
    
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')
    
    echo -e "${YELLOW}Response:${NC} HTTP $http_status"
    
    # Pretty print JSON if possible
    if echo "$body" | jq '.' 2>/dev/null > /dev/null; then
        echo "$body" | jq '.' | head -20
        if [ $(echo "$body" | jq '. | length' 2>/dev/null || echo 0) -gt 5 ]; then
            echo "... (truncated for readability)"
        fi
    else
        echo "$body" | head -20
    fi
    
    # Check if we got unauthorized
    if [ "$http_status" -eq 401 ]; then
        echo -e "${RED}⚠️  Authentication required but not provided${NC}"
        print_test "$test_name" "FAIL"
        return 1
    fi
    
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
echo "║         (Authentication Required - Manual Mode)          ║"
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

echo ""
echo -e "${YELLOW}⚠️  NOTE: These APIs require authentication${NC}"
echo -e "${YELLOW}Please ensure you are logged in to test properly${NC}"
echo ""
echo -e "${YELLOW}To authenticate:${NC}"
echo "1. Open browser and login at ${BASE_URL}/login"
echo "2. Export your session cookie to: $COOKIE_FILE"
echo "3. Or run tests manually using the browser's developer tools"
echo ""
echo -e "${BLUE}Proceeding with tests (may fail if not authenticated)...${NC}"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# =====================================================
# LATE FEES API TESTS
# =====================================================
print_header "1. LATE FEES API TESTS"

test_endpoint "GET" "/late-fees/settings" "Get all late fee settings"

late_fee_data='{
  "name": "Test Late Fee - 5%",
  "description": "5% late fee for testing",
  "fee_type": "percentage",
  "percentage_amount": 5,
  "grace_period_days": 5,
  "apply_after_days": 5,
  "is_active": true,
  "auto_apply": false
}'
test_endpoint "POST" "/late-fees/settings" "Create late fee setting" "$late_fee_data"

test_endpoint "GET" "/late-fees/calculate" "Calculate late fees"

test_endpoint "POST" "/late-fees/apply" "Apply late fees (dry run)" '{"dry_run": true}'

# =====================================================
# BULK OPERATIONS API TESTS
# =====================================================
print_header "2. BULK OPERATIONS API TESTS"

test_endpoint "POST" "/bulk/invoices/generate" "Generate monthly invoices" '{"month": "2025-12"}'

# =====================================================
# NOTIFICATIONS API TESTS
# =====================================================
print_header "3. NOTIFICATIONS API TESTS"

test_endpoint "POST" "/notifications/reminders/generate" "Generate payment reminders"

test_endpoint "GET" "/notifications/queue/process" "Process notification queue"

# =====================================================
# LEASE MANAGEMENT API TESTS
# =====================================================
print_header "4. LEASE MANAGEMENT API TESTS"

test_endpoint "POST" "/lease/alerts/generate" "Generate lease alerts"

test_endpoint "GET" "/lease/alerts" "Get lease alerts"

test_endpoint "GET" "/lease/renewals" "Get renewal requests"

test_endpoint "GET" "/lease/moveouts" "Get move-out records"

# =====================================================
# DASHBOARD API TESTS
# =====================================================
print_header "5. DASHBOARD API TESTS"

test_endpoint "GET" "/dashboard/metrics" "Get dashboard metrics"

test_endpoint "GET" "/dashboard/revenue" "Get revenue data"

test_endpoint "GET" "/dashboard/occupancy" "Get occupancy rate"

# =====================================================
# SUMMARY
# =====================================================
print_header "TEST SUMMARY"

echo "Total Tests Run: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo ""
echo "Success Rate: ${success_rate}%"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}║              ✓ ALL TESTS PASSED SUCCESSFULLY!             ║${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    exit 0
elif [ $success_rate -ge 50 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed, but most APIs are working${NC}"
    exit 1
else
    echo ""
    echo -e "${RED}✗ Most tests failed - authentication issue likely${NC}"
    exit 1
fi

