# Manual Testing Guide - Report Pages

**Date:** December 2024  
**Purpose:** Comprehensive manual testing guide for post-deployment verification  
**Target:** Production deployment on Vercel

---

## 🎯 Testing Prerequisites

### Access Requirements
- ✅ Admin account credentials
- ✅ Access to production URL
- ✅ Multiple browsers (Chrome, Firefox, Safari)
- ✅ Mobile device for responsive testing

### Test Data Requirements
- ✅ At least 2-3 active tenants
- ✅ Some payment history
- ✅ Some deposit transactions
- ✅ At least 1 vacant room
- ✅ Multiple buildings (if applicable)

---

## 📋 Step-by-Step Testing Guide

### Phase 1: Authentication & Access (5 minutes)

#### Test 1.1: Unauthenticated Access
1. Open browser in incognito/private mode
2. Navigate to: `https://parenta-nextjs-43gu9vbvb-estopaceadrians-projects.vercel.app/admin/reports`
3. **Expected:** Redirected to login page
4. **Result:** ⬜ Pass / ⬜ Fail

#### Test 1.2: Authenticated Access
1. Log in with admin credentials
2. Navigate to: `/admin/reports`
3. **Expected:** Reports page loads with all report categories
4. **Result:** ⬜ Pass / ⬜ Fail

#### Test 1.3: Direct URL Access
1. While logged in, directly navigate to: `/admin/reports/tenant-list`
2. **Expected:** Page loads correctly
3. **Result:** ⬜ Pass / ⬜ Fail

---

### Phase 2: Main Reports Page (10 minutes)

#### Test 2.1: Page Load
1. Navigate to `/admin/reports`
2. **Check:**
   - [ ] Page loads without errors
   - [ ] All report categories visible
   - [ ] New report links visible:
     - [ ] Tenant List Report (in Tenant Reports section)
     - [ ] Collected Amount Report (in Financial Reports section)
     - [ ] Deposit Report (in Financial Reports section)
     - [ ] Vacant Rooms Report (in Property Reports section)
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 2.2: Link Navigation
1. Click on "Tenant List Report" link
2. **Expected:** Navigates to `/admin/reports/tenant-list`
3. **Result:** ⬜ Pass / ⬜ Fail
4. Repeat for other 3 report links
5. **Result:** ⬜ Pass / ⬜ Fail

---

### Phase 3: Tenant List Report (15 minutes)

#### Test 3.1: Page Load
1. Navigate to `/admin/reports/tenant-list`
2. **Check:**
   - [ ] Page loads without errors
   - [ ] Header with back button visible
   - [ ] Filter section visible
   - [ ] "Generate Report" button visible
   - [ ] Export buttons NOT visible (no data yet)
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 3.2: Filter Functionality
1. **Building Filter:**
   - [ ] Dropdown populates with buildings
   - [ ] Can select a building
   - [ ] Can select "All Buildings"
2. **Status Filter:**
   - [ ] Dropdown has options: All, Active, Pending, Inactive
   - [ ] Can select different statuses
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 3.3: Report Generation
1. Click "Generate Report" button
2. **Check:**
   - [ ] Button shows loading state ("Generating...")
   - [ ] Button is disabled during generation
   - [ ] Loading completes within 10 seconds
   - [ ] Report data displays
   - [ ] Export buttons appear
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 3.4: Report Data Display
1. **Summary Cards:**
   - [ ] Total Tenants card shows correct number
   - [ ] Total Balance card shows correct amount (₱)
   - [ ] Total Past Due card shows correct amount (₱)
   - [ ] Tenants with Balance card shows correct number
2. **Data Table:**
   - [ ] Table displays all tenants
   - [ ] Tenant names are clickable links
   - [ ] Room numbers display correctly
   - [ ] Building names display correctly
   - [ ] Balances formatted with ₱
   - [ ] Past due amounts formatted correctly
   - [ ] Days past due shows correctly
   - [ ] Status badges color-coded correctly
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 3.5: Filtered Reports
1. Select a specific building from dropdown
2. Click "Generate Report"
3. **Expected:** Only tenants from that building appear
4. **Result:** ⬜ Pass / ⬜ Fail
5. Select "Active" status
6. Click "Generate Report"
7. **Expected:** Only active tenants appear
8. **Result:** ⬜ Pass / ⬜ Fail

#### Test 3.6: Export Functionality
1. **Excel Export:**
   - [ ] Click "Export Excel" button
   - [ ] Button shows "Exporting..." state
   - [ ] File downloads with name: `tenant-list-report-YYYY-MM-DD.xlsx`
   - [ ] File opens in Excel correctly
   - [ ] Data matches displayed report
2. **PDF Export:**
   - [ ] Click "Export PDF" button
   - [ ] Button shows "Exporting..." state
   - [ ] File downloads with name: `tenant-list-report-YYYY-MM-DD.pdf`
   - [ ] File opens in PDF viewer correctly
   - [ ] Data matches displayed report
3. **Print:**
   - [ ] Click "Print" button
   - [ ] Print dialog opens
   - [ ] Print preview shows all data
   - [ ] Layout is correct
4. **Result:** ⬜ Pass / ⬜ Fail

---

### Phase 4: Collected Amount Report (15 minutes)

#### Test 4.1: Page Load
1. Navigate to `/admin/reports/collected-amount`
2. **Check:**
   - [ ] Page loads correctly
   - [ ] Date pickers visible
   - [ ] Period type dropdown visible
   - [ ] Default dates set (last month)
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 4.2: Date Validation
1. Try to generate report without selecting dates
2. **Expected:** Error message or dates required
3. **Result:** ⬜ Pass / ⬜ Fail
4. Select start date only
5. Try to generate
6. **Expected:** Validation error
7. **Result:** ⬜ Pass / ⬜ Fail

#### Test 4.3: Report Generation
1. Select date range (e.g., last 3 months)
2. Select period type: "Monthly"
3. Click "Generate Report"
4. **Check:**
   - [ ] Loading state works
   - [ ] Report generates successfully
   - [ ] Summary cards display
   - [ ] Tables display
5. **Result:** ⬜ Pass / ⬜ Fail

#### Test 4.4: Period Types
1. Test each period type:
   - [ ] Monthly
   - [ ] Quarterly
   - [ ] Semi-Annual
   - [ ] Annual
2. **Expected:** Each generates correct report structure
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 4.5: Data Display
1. **Summary Cards:**
   - [ ] Total Collected (₱)
   - [ ] Total Payments (count)
   - [ ] Average Payment (₱)
   - [ ] Growth vs Previous (%)
2. **By Period Table:**
   - [ ] Periods listed correctly
   - [ ] Amounts formatted (₱)
   - [ ] Payment counts correct
3. **By Payment Method Table:**
   - [ ] Methods listed
   - [ ] Amounts formatted (₱)
   - [ ] Percentages calculated correctly
4. **Result:** ⬜ Pass / ⬜ Fail

#### Test 4.6: Export
1. Generate report
2. Test Excel export
3. Test PDF export
4. Test Print
5. **Result:** ⬜ Pass / ⬜ Fail

---

### Phase 5: Deposit Report (15 minutes)

#### Test 5.1: Page Load & Filters
1. Navigate to `/admin/reports/deposits`
2. **Check:**
   - [ ] Page loads correctly
   - [ ] Date pickers visible
   - [ ] Period type dropdown (Monthly, Semi-Annual, Annual)
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 5.2: Report Generation
1. Select date range
2. Select period type
3. Generate report
4. **Check:**
   - [ ] Summary cards display:
     - [ ] Total Deposits Received (₱)
     - [ ] Total Refunds Issued (₱)
     - [ ] Net Deposit Balance (₱)
     - [ ] Total Transactions
5. **Result:** ⬜ Pass / ⬜ Fail

#### Test 5.3: Data Accuracy
1. **By Period Table:**
   - [ ] Periods listed
   - [ ] Deposits Received (₱)
   - [ ] Refunds Issued (₱)
   - [ ] Net Amount (₱)
   - [ ] Tenant Count
2. **Result:** ⬜ Pass / ⬜ Fail

#### Test 5.4: Export
1. Test all export options
2. **Result:** ⬜ Pass / ⬜ Fail

---

### Phase 6: Vacant Rooms Report (15 minutes)

#### Test 6.1: Page Load
1. Navigate to `/admin/reports/vacant-rooms`
2. **Check:**
   - [ ] Page loads correctly
   - [ ] Building filter visible
   - [ ] Generate button visible
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 6.2: Report Generation
1. Generate report (no filter)
2. **Check:**
   - [ ] Summary cards display:
     - [ ] Total Vacant
     - [ ] Total Rooms
     - [ ] Vacancy Rate (%)
     - [ ] Potential Revenue (₱)
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 6.3: Data Table
1. **Check table columns:**
   - [ ] Room Number (clickable)
   - [ ] Building Name
   - [ ] Floor Number
   - [ ] Room Type
   - [ ] Monthly Rate (₱)
   - [ ] Days Vacant
   - [ ] Last Tenant Name
2. **Result:** ⬜ Pass / ⬜ Fail

#### Test 6.4: Filtered Report
1. Select a specific building
2. Generate report
3. **Expected:** Only vacant rooms from that building
4. **Result:** ⬜ Pass / ⬜ Fail

#### Test 6.5: Export
1. Test all export options
2. **Result:** ⬜ Pass / ⬜ Fail

---

### Phase 7: Error Handling (10 minutes)

#### Test 7.1: API Errors
1. Disconnect internet
2. Try to generate a report
3. **Expected:** User-friendly error message
4. **Result:** ⬜ Pass / ⬜ Fail

#### Test 7.2: Empty Results
1. Generate report with filters that return no results
2. **Expected:** Appropriate empty state message
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 7.3: Invalid Dates
1. Set end date before start date
2. Try to generate report
3. **Expected:** Validation error
4. **Result:** ⬜ Pass / ⬜ Fail

---

### Phase 8: Navigation (5 minutes)

#### Test 8.1: Back Button
1. From any report page, click back button
2. **Expected:** Returns to `/admin/reports`
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 8.2: Detail Links
1. Click tenant name in Tenant List Report
2. **Expected:** Navigates to tenant detail page
3. **Result:** ⬜ Pass / ⬜ Fail
4. Click room number in Vacant Rooms Report
5. **Expected:** Navigates to room detail page
6. **Result:** ⬜ Pass / ⬜ Fail

#### Test 8.3: Browser Navigation
1. Use browser back button
2. Use browser forward button
3. **Expected:** Navigation works correctly
4. **Result:** ⬜ Pass / ⬜ Fail

---

### Phase 9: Responsive Design (15 minutes)

#### Test 9.1: Mobile (< 640px)
1. Open browser DevTools
2. Set to mobile viewport
3. Test each report page:
   - [ ] Layout adapts correctly
   - [ ] Filters stack vertically
   - [ ] Summary cards stack
   - [ ] Tables scroll horizontally
   - [ ] Buttons remain accessible
   - [ ] Text is readable
4. **Result:** ⬜ Pass / ⬜ Fail

#### Test 9.2: Tablet (640px - 1024px)
1. Set to tablet viewport
2. Test layout adaptation
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 9.3: Desktop (> 1024px)
1. Test full desktop layout
2. **Result:** ⬜ Pass / ⬜ Fail

---

### Phase 10: Performance (5 minutes)

#### Test 10.1: Page Load Times
1. Measure time to load each page
2. **Expected:** < 3 seconds
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 10.2: Report Generation Time
1. Measure time to generate reports
2. **Expected:** < 10 seconds
3. **Result:** ⬜ Pass / ⬜ Fail

#### Test 10.3: Export Generation Time
1. Measure time to generate exports
2. **Expected:** < 15 seconds
3. **Result:** ⬜ Pass / ⬜ Fail

---

## 📊 Test Results Summary

### Overall Status
- **Total Tests:** 50+
- **Passed:** ___
- **Failed:** ___
- **Success Rate:** ___%

### Critical Issues
- None found: ⬜
- Issues found: ⬜ (list below)

### Minor Issues
- None found: ⬜
- Issues found: ⬜ (list below)

---

## 🐛 Issues Log

### Issue #1
- **Page:** ___
- **Description:** ___
- **Steps to Reproduce:** ___
- **Expected:** ___
- **Actual:** ___
- **Severity:** Critical / Minor

---

## ✅ Sign-Off

### Tester Information
- **Name:** ___
- **Date:** ___
- **Browser:** ___
- **Device:** ___

### Approval
- [ ] All critical tests passed
- [ ] All minor issues documented
- [ ] Ready for production use
- [ ] Sign-off approved

---

**Last Updated:** TBD  
**Status:** 🔄 In Progress
