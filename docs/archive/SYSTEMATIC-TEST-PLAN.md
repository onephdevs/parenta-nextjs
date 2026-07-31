# Systematic Test Plan
**Date:** October 29, 2025  
**Status:** Ready for Execution  
**Completed Fixes:** 12/27 (44%)

---

## 🎯 Test Objectives

1. **Verify all bug fixes implemented**
2. **Confirm CRUD operations work correctly**
3. **Test UI improvements**
4. **Validate data flow**
5. **Check navigation and redirects**

---

## ✅ Phase 1: Critical Bug Fixes Verification

### Test 1.1: Tenant Creation & Redirect
**Bug Fixed:** 404 after tenant creation  
**File:** `src/app/api/tenants/route.ts`

**Test Steps:**
1. Navigate to `/admin/tenants/new`
2. Fill out tenant form with test data
3. Click "Add Tenant" button
4. **Expected:** Redirect to tenant detail page (no 404)
5. **Expected:** See tenant details displayed correctly

**Test Data:**
```
First Name: Test
Last Name: Tenant
Email: test.tenant@example.com
Phone: 555-0100
```

---

### Test 1.2: Tenant Stats Display
**Bug Fixed:** Tenant stats showing 0  
**File:** `src/app/admin/tenants/page.tsx`

**Test Steps:**
1. Navigate to `/admin/tenants`
2. **Expected:** Stats cards show correct numbers:
   - Total Tenants: (actual count)
   - Active Tenants: (actual count)
   - Pending Tenants: (actual count)
   - Avg. Income: ₱(amount) ← Note: Currency in pesos

---

### Test 1.3: Building Stats Display
**Bug Fixed:** Building stats showing 0  
**Files:** `src/lib/api/buildings.ts`, `src/types/database.ts`

**Test Steps:**
1. Navigate to `/admin/buildings`
2. **Expected:** "Total Units" stat shows correct count
3. Click on a building card
4. **Expected:** Building detail shows room counts

---

### Test 1.4: Ellipsis Button Functionality
**Bug Fixed:** Ellipsis button not working  
**File:** `src/components/features/BuildingCard.tsx`

**Test Steps:**
1. Navigate to `/admin/buildings`
2. Click ellipsis (•••) button on any building card
3. **Expected:** Dropdown menu appears with:
   - View Details
   - Edit Building
   - Manage Rooms
4. Click "View Details"
5. **Expected:** Navigate to building detail page
6. Go back, click ellipsis again
7. Click outside menu
8. **Expected:** Menu closes

---

### Test 1.5: Tenant Card UI
**Bug Fixed:** Verified working  
**File:** `src/components/features/TenantCard.tsx`

**Test Steps:**
1. Navigate to `/admin/tenants`
2. **Expected:** Tenant cards display properly:
   - Avatar with initials
   - Name and email
   - Contact info
   - Emergency contact (if any)
   - "View Details" and "Edit" buttons

---

## ✅ Phase 2: Room Form Improvements

### Test 2.1: Square Footage Minimum
**Fix:** Min value changed from 50 to 1  
**Files:** `AddRoomModal.tsx`, `AddRoomForm.tsx`

**Test Steps:**
1. Navigate to a building detail page
2. Click "Add Room"
3. Enter square footage of "10"
4. **Expected:** Value accepted (no validation error)

---

### Test 2.2: Currency Display
**Fix:** $ → ₱ (Philippine Pesos)  
**Files:** `AddRoomModal.tsx`, `AddRoomForm.tsx`

**Test Steps:**
1. Open Add Room form
2. **Expected:** "Monthly Rate" label shows "(₱)"
3. **Expected:** Helper text: "Enter amount in Philippine Pesos"
4. **Expected:** Input accepts whole numbers only

---

### Test 2.3: Deposit Field Removed
**Fix:** Deposit field removed from room forms  
**Files:** `AddRoomModal.tsx`, `AddRoomForm.tsx`, `database.ts`

**Test Steps:**
1. Open Add Room form
2. **Expected:** No "Deposit Amount" field visible
3. Fill form and create room
4. **Expected:** Room created successfully

---

### Test 2.4: Asset Assignment Removed
**Fix:** Asset assignment never existed (verified)

**Test Steps:**
1. Open Add Room form
2. **Expected:** No asset assignment section
3. **Expected:** No asset selection dropdown

---

## ✅ Phase 3: Building Improvements

### Test 3.1: Country Field Default
**Fix:** Default changed from USA to Philippines  
**File:** `AddBuildingModal.tsx`

**Test Steps:**
1. Click "Add Building" button
2. **Expected:** Country field defaults to "Philippines"
3. **Expected:** Can still change to other countries if needed

---

### Test 3.2: Edit Building Save Button
**Fix:** Verified save button exists  
**File:** `EditBuildingForm.tsx`

**Test Steps:**
1. Navigate to building detail page
2. Click "Edit Building"
3. **Expected:** Form opens with all fields populated
4. Scroll to bottom
5. **Expected:** "Update Building" button visible and enabled
6. Make a change (e.g., description)
7. Click "Update Building"
8. **Expected:** Success notification
9. **Expected:** Changes saved

---

### Test 3.3: Year Built Removed
**Fix:** Removed from building cards  
**File:** `BuildingCard.tsx`

**Test Steps:**
1. Navigate to `/admin/buildings`
2. View building cards (both grid and list view)
3. **Expected:** No "Year Built" field visible
4. **Expected:** "Occupancy" field shows instead:
   - Format: "X/Y" (occupied/total)

---

## 🔄 Phase 4: Data Flow & Integration Tests

### Test 4.1: Complete Building Creation Flow
**Test Steps:**
1. Navigate to `/admin/buildings`
2. Click "Add Building"
3. Fill form with complete data
4. Submit
5. **Expected:** Redirect to new building detail page
6. **Expected:** Building stats updated
7. **Expected:** Can add rooms to building

---

### Test 4.2: Complete Room Creation Flow
**Test Steps:**
1. Navigate to building detail page
2. Click "Add Room"
3. Fill form (use ₱ for monthly rate)
4. Submit
5. **Expected:** Redirect to room detail page
6. **Expected:** Room appears in building's room list
7. **Expected:** Building's "Total Units" incremented

---

### Test 4.3: Complete Tenant Creation Flow
**Test Steps:**
1. Navigate to `/admin/tenants/new`
2. Fill complete tenant form
3. Submit
4. **Expected:** Redirect to tenant detail page (no 404)
5. **Expected:** Tenant appears in tenants list
6. **Expected:** Tenant stats updated

---

### Test 4.4: Tenant Assignment Flow
**Test Steps:**
1. Navigate to room detail page
2. Click "Assign Tenant"
3. Select tenant from dropdown
4. Fill assignment details
5. Submit
6. **Expected:** Tenant assigned
7. **Expected:** Room status → "occupied"
8. **Expected:** Tenant status → "active"
9. **Expected:** Building occupancy stats updated

---

## 📱 Phase 5: Navigation & UI Tests

### Test 5.1: All Navigation Links
**Test Steps:**
1. Test all sidebar links
2. Test all breadcrumb links
3. Test all card action buttons
4. **Expected:** No 404 errors
5. **Expected:** Correct pages load

---

### Test 5.2: Dropdown Menus
**Test Steps:**
1. Test ellipsis menus on all cards
2. Test filter dropdowns
3. Test status selectors
4. **Expected:** All menus open/close correctly
5. **Expected:** Click-outside closes menus

---

### Test 5.3: Form Validation
**Test Steps:**
1. Try submitting forms with missing required fields
2. **Expected:** Validation errors show
3. Try invalid data (e.g., negative numbers)
4. **Expected:** Appropriate error messages

---

### Test 5.4: Notifications
**Test Steps:**
1. Perform CRUD operations
2. **Expected:** Loading notifications during operations
3. **Expected:** Success notifications on completion
4. **Expected:** Error notifications on failure
5. **Expected:** Notifications auto-dismiss or have close button

---

## 🎨 Phase 6: Visual & Responsive Tests

### Test 6.1: Desktop View (1920x1080)
**Test Steps:**
1. View all pages at full desktop resolution
2. **Expected:** Layout looks professional
3. **Expected:** No horizontal scrolling
4. **Expected:** Cards display in appropriate grids

---

### Test 6.2: Tablet View (768x1024)
**Test Steps:**
1. Resize browser to tablet size
2. **Expected:** Responsive layout adjusts
3. **Expected:** Sidebar collapses to hamburger menu
4. **Expected:** Grid columns reduce appropriately

---

### Test 6.3: Mobile View (375x667)
**Test Steps:**
1. View on mobile size
2. **Expected:** Single column layouts
3. **Expected:** Touch-friendly buttons
4. **Expected:** No horizontal scrolling

---

## 🔐 Phase 7: Authentication & Permissions

### Test 7.1: Admin Access
**Test Steps:**
1. Login as admin
2. **Expected:** Access to all admin pages
3. **Expected:** Can perform all CRUD operations

---

### Test 7.2: Tenant Access
**Test Steps:**
1. Login as tenant
2. **Expected:** Access only to tenant dashboard
3. **Expected:** Cannot access admin routes

---

### Test 7.3: Logout Flow
**Test Steps:**
1. Click logout
2. **Expected:** Redirect to login page
3. Try accessing protected route
4. **Expected:** Redirect to login

---

## 📊 Test Summary Template

```
TEST EXECUTION DATE: _______________
TESTER: _______________

PHASE 1: Critical Bugs    [ ] PASS  [ ] FAIL  Notes: ______________
PHASE 2: Room Forms       [ ] PASS  [ ] FAIL  Notes: ______________
PHASE 3: Buildings        [ ] PASS  [ ] FAIL  Notes: ______________
PHASE 4: Data Flow        [ ] PASS  [ ] FAIL  Notes: ______________
PHASE 5: Navigation       [ ] PASS  [ ] FAIL  Notes: ______________
PHASE 6: Responsive       [ ] PASS  [ ] FAIL  Notes: ______________
PHASE 7: Auth             [ ] PASS  [ ] FAIL  Notes: ______________

OVERALL: [ ] PASS  [ ] FAIL

ISSUES FOUND:
1. _______________
2. _______________
3. _______________
```

---

## 🐛 Known Issues (To Be Fixed Next)

These are intentionally NOT tested yet as they're pending implementation:

1. **Tenant System Overhaul (7 tasks)**
   - Deposit/Advance months instead of fixed amounts
   - Remove Move Out Date from assignment
   - Add Pay button in tenant profile
   - Match lease details across forms
   - Use tenant name (not email) in assignment
   - Remove status selection in Add Tenant
   
2. **Rooms Page Improvements (3 tasks)**
   - Change "Room Statistics" to "Vacancy Overview"
   - Add "Add Occupant" button
   - Move "Edit Room" to header button

---

## ✅ Testing Best Practices

1. **Use Incognito/Private Window** - Fresh session
2. **Clear Browser Cache** - Ensure latest code
3. **Check Browser Console** - No JavaScript errors
4. **Test in Chrome & Safari** - Cross-browser compatibility
5. **Use Real Data** - Not just "test" values
6. **Document Edge Cases** - Unusual scenarios
7. **Take Screenshots** - Of any issues found

---

## 🎯 Success Criteria

- [ ] All Phase 1-3 tests pass (Critical fixes)
- [ ] All CRUD operations work end-to-end
- [ ] No console errors during normal usage
- [ ] All navigation links work correctly
- [ ] Responsive on mobile, tablet, desktop
- [ ] No 404 errors
- [ ] Stats display correctly
- [ ] Currency displays in pesos (₱)
- [ ] Forms validate properly
- [ ] Notifications work correctly

**Target:** 95%+ test pass rate before moving to next features

---

## 📝 Notes

- Development server should be running on `http://localhost:3002`
- Use demo credentials:
  - Admin: `admin@parenta.com` / `admin123`
  - Tenant: `tenant@parenta.com` / `tenant123`
- Database should have seed data
- All tests assume fresh, seeded database state

