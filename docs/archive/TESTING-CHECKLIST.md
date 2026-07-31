# 🧪 Testing Checklist - October 29, 2025
**Status:** In Progress  
**Start Time:** ___________  
**Tester:** ___________

---

## 🚀 Pre-Test Setup

- [ ] Development server running: `http://localhost:3002`
- [ ] Browser opened: Chrome/Safari
- [ ] Logged in as Admin: `admin@parenta.com` / `admin123`
- [ ] Have this checklist ready

---

## ✅ PHASE 1: Critical Bug Fixes (5 tests)

### 1.1 Tenant Creation - No More 404! ✅
- [ ] Navigate to: `/admin/tenants/new`
- [ ] Fill form: First Name "Test", Last Name "User", Email "test@example.com"
- [ ] Monthly Rent: 10000, Deposit Months: 1, Advance Months: 1
- [ ] Click "Add Tenant"
- [ ] **VERIFY:** Redirects to tenant detail (NO 404 error)
- [ ] **VERIFY:** Tenant details display correctly
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 1.2 Tenant Stats Working ✅
- [ ] Navigate to: `/admin/tenants`
- [ ] **VERIFY:** "Total Tenants" shows a number (not 0)
- [ ] **VERIFY:** "Active" shows a number
- [ ] **VERIFY:** "Pending" shows a number
- [ ] **VERIFY:** "Avg Income" shows ₱ amount (pesos!)
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 1.3 Building Stats Working ✅
- [ ] Navigate to: `/admin/buildings`
- [ ] **VERIFY:** Cards show "Total Units" count (not 0)
- [ ] **VERIFY:** Cards show "Occupancy: X/Y" format
- [ ] Click on a building
- [ ] **VERIFY:** Detail page shows room counts
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 1.4 Ellipsis Menu Working ✅
- [ ] Navigate to: `/admin/buildings`
- [ ] Click ellipsis (⋮) button on any building card
- [ ] **VERIFY:** Dropdown menu appears
- [ ] **VERIFY:** Menu shows: View Details, Edit Building, Manage Rooms
- [ ] Click "View Details" → navigates correctly
- [ ] Go back, click ellipsis again
- [ ] Click outside menu
- [ ] **VERIFY:** Menu closes
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 1.5 Tenant Card UI ✅
- [ ] Navigate to: `/admin/tenants`
- [ ] **VERIFY:** Cards display properly with avatars
- [ ] **VERIFY:** Name, email visible
- [ ] **VERIFY:** Buttons work
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

**Phase 1 Results:** ___ / 5 PASSED

---

## ✅ PHASE 2: Room Forms (4 tests)

### 2.1 Square Footage Minimum = 1 ✅
- [ ] Navigate to any building detail
- [ ] Click "Add Room"
- [ ] Enter Room Number: "101"
- [ ] Enter Square Footage: "10" (small number)
- [ ] **VERIFY:** Accepts value (min is 1, not 50)
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 2.2 Currency is Philippine Pesos ✅
- [ ] In Add Room form
- [ ] **VERIFY:** Label says "Monthly Rate (₱)"
- [ ] **VERIFY:** Helper text: "Enter amount in Philippine Pesos"
- [ ] Enter: 5000
- [ ] **VERIFY:** Accepts whole numbers only
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 2.3 No Deposit Field ✅
- [ ] In Add Room form
- [ ] **VERIFY:** NO "Deposit Amount" field exists
- [ ] Fill form: Room 101, Type: Studio, Rate: 8000
- [ ] Click "Add Room"
- [ ] **VERIFY:** Room created successfully
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 2.4 No Asset Assignment ✅
- [ ] In Add Room form
- [ ] **VERIFY:** NO asset assignment section
- [ ] **VERIFY:** NO asset dropdowns
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

**Phase 2 Results:** ___ / 4 PASSED

---

## ✅ PHASE 3: Buildings (3 tests)

### 3.1 Country Defaults to Philippines ✅
- [ ] Navigate to: `/admin/buildings/new`
- [ ] **VERIFY:** Country dropdown defaults to "Philippines"
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 3.2 Edit Building Has Save Button ✅
- [ ] Go to any building detail
- [ ] Click ellipsis → "Edit Building"
- [ ] **VERIFY:** "Update Building" button visible
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 3.3 No "Year Built" in Cards ✅
- [ ] Navigate to: `/admin/buildings`
- [ ] Look at building cards
- [ ] **VERIFY:** NO "Year Built" or "Ave Year Built" visible
- [ ] **VERIFY:** Shows "Occupancy: X/Y" instead
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

**Phase 3 Results:** ___ / 3 PASSED

---

## ✅ PHASE 4: Tenant System (5 tests)

### 4.1 Deposit & Advance in Months ✅
- [ ] Navigate to: `/admin/tenants/new`
- [ ] **VERIFY:** "Monthly Rent (₱)" field exists
- [ ] **VERIFY:** "Deposit Months" dropdown (0-3)
- [ ] **VERIFY:** "Advance Months" dropdown (0-3)
- [ ] Select: Rent 10000, Deposit 1, Advance 1
- [ ] **VERIFY:** Shows "Deposit: ₱10,000"
- [ ] **VERIFY:** Shows "Advance: ₱10,000"
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 4.2 Real-time Calculation ✅
- [ ] In Add Tenant form
- [ ] Set: Monthly Rent = 12000
- [ ] Set: Deposit Months = 2
- [ ] Set: Advance Months = 1
- [ ] **VERIFY:** Deposit shows "₱24,000" (12000 × 2)
- [ ] **VERIFY:** Advance shows "₱12,000" (12000 × 1)
- [ ] **VERIFY:** Total shows "₱36,000" in purple box
- [ ] **VERIFY:** Formula shown below total
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 4.3 No Status Selection ✅
- [ ] In Add Tenant form
- [ ] **VERIFY:** NO "Status" dropdown field
- [ ] **VERIFY:** Status auto-set (not user-selectable)
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 4.4 Record Payment Button ✅
- [ ] Navigate to any tenant detail page
- [ ] **VERIFY:** Green "Record Payment" button in header
- [ ] Click "Record Payment"
- [ ] **VERIFY:** Navigates to payment form
- [ ] **VERIFY:** Tenant auto-selected in form
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 4.5 Currency in Pesos ✅
- [ ] In tenant detail page
- [ ] **VERIFY:** All amounts show ₱ (not $)
- [ ] **VERIFY:** Consistent currency throughout
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

**Phase 4 Results:** ___ / 5 PASSED

---

## ✅ PHASE 5: Rooms Page (3 tests)

### 5.1 "Vacancy Overview" Card ✅
- [ ] Navigate to a room detail page
- [ ] Look for stats card on right side
- [ ] **VERIFY:** Card titled "Vacancy Overview" (not "Room Statistics")
- [ ] **VERIFY:** Shows occupancy metrics
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 5.2 "Add Occupant" Button ✅
- [ ] In room detail, go to "Tenant Management" tab
- [ ] If room has a tenant:
  - [ ] **VERIFY:** "Add Occupant" button visible
  - [ ] **VERIFY:** Button next to "End Assignment"
  - [ ] **VERIFY:** Purple color scheme
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 5.3 "Edit Room" in Header ✅
- [ ] In room detail page
- [ ] **VERIFY:** "Edit Room" button in header (top right)
- [ ] **VERIFY:** NOT in tab navigation
- [ ] Click "Edit Room"
- [ ] **VERIFY:** Opens edit form
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

**Phase 5 Results:** ___ / 3 PASSED

---

## ✅ PHASE 6: Navigation & Flow (4 tests)

### 6.1 Dashboard Stats ✅
- [ ] Navigate to: `/admin`
- [ ] **VERIFY:** All stat cards show numbers
- [ ] **VERIFY:** Quick actions work
- [ ] Click "Record Payment"
- [ ] **VERIFY:** Goes to correct page
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 6.2 Building Navigation ✅
- [ ] From dashboard, click "Buildings"
- [ ] Click on a building card
- [ ] **VERIFY:** Detail page loads
- [ ] Click "Manage Rooms"
- [ ] **VERIFY:** Shows room list
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 6.3 Tenant Navigation ✅
- [ ] From dashboard, click "Tenants"
- [ ] Click on a tenant card
- [ ] **VERIFY:** Detail page loads
- [ ] Click "Record Payment" button
- [ ] **VERIFY:** Payment form opens with tenant selected
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 6.4 Breadcrumbs ✅
- [ ] Navigate deep: Dashboard → Buildings → Building Detail → Room Detail
- [ ] **VERIFY:** Breadcrumbs at top show path
- [ ] Click on breadcrumb
- [ ] **VERIFY:** Navigates back correctly
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

**Phase 6 Results:** ___ / 4 PASSED

---

## ✅ PHASE 7: Data Flow (2 tests)

### 7.1 Complete Tenant Flow ✅
- [ ] Create new tenant (Phase 1.1)
- [ ] **VERIFY:** Redirects to detail
- [ ] Go back to tenant list
- [ ] **VERIFY:** New tenant appears
- [ ] **VERIFY:** Stats updated
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

### 7.2 Complete Room Flow ✅
- [ ] Go to building detail
- [ ] Click "Add Room"
- [ ] Create room with: 101, Studio, 8000
- [ ] **VERIFY:** Success notification
- [ ] Go back to building
- [ ] **VERIFY:** Room count increased
- [ ] **VERIFY:** New room in list
- [ ] **Result:** ✅ PASS / ❌ FAIL
- [ ] **Notes:** ___________

**Phase 7 Results:** ___ / 2 PASSED

---

## 📊 FINAL RESULTS

### Summary
- **Phase 1 (Critical):** ___ / 5 passed
- **Phase 2 (Room Forms):** ___ / 4 passed
- **Phase 3 (Buildings):** ___ / 3 passed
- **Phase 4 (Tenant System):** ___ / 5 passed
- **Phase 5 (Rooms Page):** ___ / 3 passed
- **Phase 6 (Navigation):** ___ / 4 passed
- **Phase 7 (Data Flow):** ___ / 2 passed

### **TOTAL: ___ / 26 tests passed (___ %)**

---

## 🐛 Issues Found

### Issue 1
- **Test:** ___________
- **Description:** ___________
- **Severity:** High / Medium / Low
- **Status:** ___________

### Issue 2
- **Test:** ___________
- **Description:** ___________
- **Severity:** High / Medium / Low
- **Status:** ___________

### Issue 3
- **Test:** ___________
- **Description:** ___________
- **Severity:** High / Medium / Low
- **Status:** ___________

---

## ✅ Sign-Off

- **Test Completion Time:** ___________
- **Total Duration:** ___ minutes
- **Pass Rate:** ___ %
- **Recommendation:** ✅ Ready for Deployment / ⏳ Needs Fixes
- **Tester Signature:** ___________
- **Date:** October 29, 2025

---

## 📝 Notes

___________________________________________________________

___________________________________________________________

___________________________________________________________

___________________________________________________________

---

**Target:** 95%+ pass rate (25/26 tests)  
**Expected:** 100% pass rate (all features tested during development)

Good luck with testing! 🧪✨

