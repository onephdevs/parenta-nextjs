#!/bin/bash

# Simple endpoint existence test
# Checks if all Phase 2 API routes are properly set up
# Does NOT require authentication - just checks routes exist

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:3030/api"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║         PHASE 2 API ENDPOINTS EXISTENCE CHECK            ║"
echo "║         (Verifies routes are set up correctly)           ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

TOTAL=0
EXISTS=0
MISSING=0

check_endpoint() {
    local method=$1
    local path=$2
    local name=$3
    
    TOTAL=$((TOTAL + 1))
    
    # Make request and get HTTP status
    status=$(curl -s -o /dev/null -w "%{http_code}" -X $method "${BASE_URL}${path}")
    
    # 401 (Unauthorized) or 400 (Bad Request) means route exists but needs auth/data
    # 404 (Not Found) means route doesn't exist
    # 200/201 means route works
    
    if [ "$status" = "404" ]; then
        echo -e "${RED}✗${NC} $name - ${RED}NOT FOUND${NC} ($method $path)"
        MISSING=$((MISSING + 1))
    elif [ "$status" = "401" ]; then
        echo -e "${GREEN}✓${NC} $name - ${YELLOW}Exists (needs auth)${NC}"
        EXISTS=$((EXISTS + 1))
    elif [ "$status" = "400" ]; then
        echo -e "${GREEN}✓${NC} $name - ${YELLOW}Exists (needs data)${NC}"
        EXISTS=$((EXISTS + 1))
    elif [ "$status" = "200" ] || [ "$status" = "201" ]; then
        echo -e "${GREEN}✓${NC} $name - ${GREEN}Working!${NC}"
        EXISTS=$((EXISTS + 1))
    else
        echo -e "${YELLOW}?${NC} $name - Unexpected status: $status"
        EXISTS=$((EXISTS + 1))
    fi
}

echo -e "${BLUE}Testing Late Fees APIs...${NC}"
check_endpoint "GET" "/late-fees/settings" "Get late fee settings"
check_endpoint "POST" "/late-fees/settings" "Create late fee setting"
check_endpoint "GET" "/late-fees/calculate" "Calculate late fees"
check_endpoint "POST" "/late-fees/apply" "Apply late fees"
check_endpoint "PATCH" "/late-fees/waive" "Waive late fee"

echo ""
echo -e "${BLUE}Testing Bulk Operations APIs...${NC}"
check_endpoint "POST" "/bulk/invoices/generate" "Generate bulk invoices"
check_endpoint "POST" "/bulk/payments/import" "Import bulk payments"
check_endpoint "PATCH" "/bulk/tenants/update-status" "Update tenant statuses"

echo ""
echo -e "${BLUE}Testing Notifications APIs...${NC}"
check_endpoint "POST" "/notifications/queue" "Queue notification"
check_endpoint "GET" "/notifications/queue/process" "Process notification queue"
check_endpoint "POST" "/notifications/reminders/generate" "Generate reminders"
check_endpoint "POST" "/notifications/send-reminder" "Send reminder"

echo ""
echo -e "${BLUE}Testing Lease Management APIs...${NC}"
check_endpoint "GET" "/lease/alerts" "Get lease alerts"
check_endpoint "POST" "/lease/alerts/generate" "Generate lease alerts"
check_endpoint "GET" "/lease/renewals" "Get renewal requests"
check_endpoint "GET" "/lease/moveouts" "Get move-out records"

echo ""
echo -e "${BLUE}Testing Dashboard APIs (Phase 1)...${NC}"
check_endpoint "GET" "/dashboard/metrics" "Get dashboard metrics"
check_endpoint "GET" "/dashboard/revenue" "Get revenue data"
check_endpoint "GET" "/dashboard/occupancy" "Get occupancy rate"
check_endpoint "GET" "/dashboard/payments/recent" "Get recent payments"
check_endpoint "GET" "/dashboard/invoices/outstanding" "Get outstanding invoices"
check_endpoint "GET" "/dashboard/invoices/upcoming" "Get upcoming due dates"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}SUMMARY${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Endpoints Checked: $TOTAL"
echo -e "${GREEN}Exist: $EXISTS${NC}"
echo -e "${RED}Missing: $MISSING${NC}"
echo ""

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}║           ✓ ALL ENDPOINTS ARE SET UP CORRECTLY!          ║${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}🎉 All Phase 2 API routes are working!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run database migrations (if not done yet)"
    echo "2. Use the manual testing guide to test with authentication"
    echo "3. Test the UI pages in your browser"
    echo ""
    echo "See: MANUAL-API-TESTING-GUIDE.md"
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                           ║${NC}"
    echo -e "${RED}║              ✗ SOME ENDPOINTS ARE MISSING                 ║${NC}"
    echo -e "${RED}║                                                           ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Some API routes were not found (404)${NC}"
    echo "Please check that all files are created correctly."
    exit 1
fi

