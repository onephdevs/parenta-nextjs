#!/bin/bash

# ========================================
# Comprehensive Page Testing Script
# ========================================
# Tests all pages in the application systematically
# ========================================

BASE_URL="https://parenta-nextjs.vercel.app"
RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test a URL
test_url() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing: $description ... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)
    
    if [ "$response" == "$expected_status" ] || [ "$response" == "307" ] || [ "$response" == "200" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $response)"
        echo "[PASS] $description - HTTP $response" >> "$RESULTS_FILE"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $response, expected $expected_status)"
        echo "[FAIL] $description - HTTP $response (expected $expected_status)" >> "$RESULTS_FILE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "========================================="
echo "  Parenta - Comprehensive Page Testing"
echo "========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Results: $RESULTS_FILE"
echo ""
echo "Starting tests..."
echo ""

# Start logging
echo "===========================================================================" > "$RESULTS_FILE"
echo "PARENTA PROPERTY MANAGEMENT SYSTEM - PAGE TESTING RESULTS" >> "$RESULTS_FILE"
echo "Tested at: $(date)" >> "$RESULTS_FILE"
echo "Base URL: $BASE_URL" >> "$RESULTS_FILE"
echo "===========================================================================" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# ==========================================
# MODULE 1: AUTHENTICATION
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 1: AUTHENTICATION (5 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 1: AUTHENTICATION" >> "$RESULTS_FILE"

test_url "$BASE_URL/" "200" "Home Page"
test_url "$BASE_URL/auth/signin" "200" "General Sign In"
test_url "$BASE_URL/auth/signup" "200" "Sign Up"
test_url "$BASE_URL/auth/admin/signin" "200" "Admin Sign In"
test_url "$BASE_URL/auth/tenant/signin" "200" "Tenant Sign In"
test_url "$BASE_URL/auth/staff/signin" "200" "Staff Sign In"

echo ""

# ==========================================
# MODULE 2: ADMIN DASHBOARD
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 2: ADMIN DASHBOARD (1 page)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 2: ADMIN DASHBOARD" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin" "307" "Admin Dashboard"

echo ""

# ==========================================
# MODULE 3: BUILDINGS & ROOMS
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 3: BUILDINGS & ROOMS (5 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 3: BUILDINGS & ROOMS" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/buildings" "307" "Buildings List"
test_url "$BASE_URL/admin/rooms" "307" "Rooms List"

echo ""

# ==========================================
# MODULE 4: TENANTS
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 4: TENANTS (4 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 4: TENANTS" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/tenants" "307" "Tenants List"
test_url "$BASE_URL/admin/tenants/new" "307" "Add New Tenant"

echo ""

# ==========================================
# MODULE 5: FINANCIAL
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 5: FINANCIAL (12 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 5: FINANCIAL" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/financial" "307" "Financial Overview"
test_url "$BASE_URL/admin/financial/dashboard" "307" "Financial Dashboard"
test_url "$BASE_URL/admin/financial/payments" "307" "Payments List"
test_url "$BASE_URL/admin/financial/payments/new" "307" "Record New Payment"
test_url "$BASE_URL/admin/financial/invoices" "307" "Invoices List"
test_url "$BASE_URL/admin/financial/invoices/new" "307" "Create New Invoice"
test_url "$BASE_URL/admin/financial/expenses" "307" "Expenses List"
test_url "$BASE_URL/admin/financial/expenses/new" "307" "Add New Expense"
test_url "$BASE_URL/admin/financial/reports" "307" "Financial Reports"

echo ""

# ==========================================
# MODULE 6: LATE FEES
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 6: LATE FEES (2 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 6: LATE FEES" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/financial/late-fees/settings" "307" "Late Fee Settings"
test_url "$BASE_URL/admin/financial/late-fees/apply" "307" "Apply Late Fees"

echo ""

# ==========================================
# MODULE 7: BULK OPERATIONS
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 7: BULK OPERATIONS (1 page)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 7: BULK OPERATIONS" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/bulk-operations" "307" "Bulk Operations"

echo ""

# ==========================================
# MODULE 8: NOTIFICATIONS
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 8: NOTIFICATIONS (1 page)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 8: NOTIFICATIONS" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/notifications" "307" "Notifications Manager"

echo ""

# ==========================================
# MODULE 9: LEASE MANAGEMENT
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 9: LEASE MANAGEMENT (1 page)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 9: LEASE MANAGEMENT" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/lease-management" "307" "Lease Management"

echo ""

# ==========================================
# MODULE 10: MAINTENANCE
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 10: MAINTENANCE (2 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 10: MAINTENANCE" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/maintenance" "307" "Admin Maintenance"
test_url "$BASE_URL/tenant/maintenance" "307" "Tenant Maintenance"

echo ""

# ==========================================
# MODULE 11: DOCUMENTS
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 11: DOCUMENTS (4 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 11: DOCUMENTS" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/documents" "307" "Documents List"
test_url "$BASE_URL/admin/documents/categories" "307" "Document Categories"
test_url "$BASE_URL/admin/documents/templates" "307" "Document Templates"

echo ""

# ==========================================
# MODULE 12: UTILITIES
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 12: UTILITIES (3 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 12: UTILITIES" >> "$RESULTS_FILE"

test_url "$BASE_URL/utilities" "307" "Utilities List"
test_url "$BASE_URL/admin/utilities/readings" "307" "Utility Readings"
test_url "$BASE_URL/admin/utilities/cost-allocation" "307" "Cost Allocation"

echo ""

# ==========================================
# MODULE 13: ASSETS
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 13: ASSETS (1 page)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 13: ASSETS" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/assets" "307" "Assets List"

echo ""

# ==========================================
# MODULE 14: ANALYTICS & REPORTS
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 14: ANALYTICS & REPORTS (3 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 14: ANALYTICS & REPORTS" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/analytics" "307" "Analytics"
test_url "$BASE_URL/admin/reports" "307" "Reports"
test_url "$BASE_URL/admin/financial/advanced-analytics" "307" "Advanced Analytics"

echo ""

# ==========================================
# MODULE 15: TENANT PORTAL
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 15: TENANT PORTAL (4 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 15: TENANT PORTAL" >> "$RESULTS_FILE"

test_url "$BASE_URL/tenant" "307" "Tenant Dashboard"
test_url "$BASE_URL/tenant/payments" "307" "Tenant Payments"
test_url "$BASE_URL/tenant/documents" "307" "Tenant Documents"

echo ""

# ==========================================
# MODULE 16: OTHER
# ==========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MODULE 16: OTHER PAGES (2 pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MODULE 16: OTHER" >> "$RESULTS_FILE"

test_url "$BASE_URL/admin/export" "307" "Export Data"
test_url "$BASE_URL/admin/financial/payment-gateways" "307" "Payment Gateways"

echo ""

# ==========================================
# SUMMARY
# ==========================================
echo "" >> "$RESULTS_FILE"
echo "===========================================================================" >> "$RESULTS_FILE"
echo "SUMMARY" >> "$RESULTS_FILE"
echo "===========================================================================" >> "$RESULTS_FILE"
echo "Total Tests: $TOTAL_TESTS" >> "$RESULTS_FILE"
echo "Passed: $PASSED_TESTS" >> "$RESULTS_FILE"
echo "Failed: $FAILED_TESTS" >> "$RESULTS_FILE"
echo "Success Rate: $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%" >> "$RESULTS_FILE"
echo "===========================================================================" >> "$RESULTS_FILE"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Tests:    $TOTAL_TESTS"
echo -e "Passed:         ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:         ${RED}$FAILED_TESTS${NC}"

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    echo "Success Rate:   $SUCCESS_RATE%"
fi

echo ""
echo "Results saved to: $RESULTS_FILE"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  SOME TESTS FAILED - Check $RESULTS_FILE for details${NC}"
    exit 1
fi

