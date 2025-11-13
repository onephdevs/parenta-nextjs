# 🧪 Test Cases - Parenta Property Management System

**Version**: 1.1.0  
**Last Updated**: October 30, 2025  
**Test Environment**: http://localhost:3030  
**Status**: Ready for Execution

---

## 📋 Test Case Format

Each test case includes:
- **ID**: Unique identifier (TC-XXX)
- **Title**: Brief description
- **Module**: Feature/module being tested
- **Priority**: Critical, High, Medium, Low
- **Preconditions**: Required setup
- **Test Steps**: Step-by-step actions
- **Expected Results**: What should happen
- **Status**: ⏳ Pending | ✅ Pass | ❌ Fail

---

## 🎯 Test Coverage Summary

| Module | Test Cases | Status |
|--------|------------|--------|
| Authentication | 6 | ⏳ Pending |
| Admin Dashboard | 3 | ⏳ Pending |
| Buildings | 8 | ⏳ Pending |
| Rooms | 10 | ⏳ Pending |
| Tenants | 9 | ⏳ Pending |
| Payments | 7 | ⏳ Pending |
| Invoices | 8 | ⏳ Pending |
| Expenses | 5 | ⏳ Pending |
| Maintenance | 10 | ⏳ Pending |
| Utilities | 5 | ⏳ Pending |
| Assets | 6 | ⏳ Pending |
| Analytics | 4 | ⏳ Pending |
| Reports | 5 | ⏳ Pending |
| Tenant Portal | 8 | ⏳ Pending |
| Landing Page | 2 | ⏳ Pending |
| **TOTAL** | **96 Test Cases** | ⏳ |

---

## 🔐 AUTHENTICATION TEST CASES

### TC-001: Admin Login - Valid Credentials
**Priority**: Critical  
**Module**: Authentication

**Preconditions**: 
- Server running on port 3030
- Admin account exists

**Test Steps**:
1. Navigate to http://localhost:3030/auth/admin/signin
2. Enter email: `admin@parenta.com`
3. Enter password: `admin123`
4. Click "Sign In" button

**Expected Results**:
- ✅ User is authenticated
- ✅ Redirected to `/admin` dashboard
- ✅ Dashboard loads successfully
- ✅ Admin name appears in header

**Status**: ⏳ Pending

---

### TC-002: Tenant Login - Valid Credentials
**Priority**: Critical  
**Module**: Authentication

**Preconditions**: 
- Server running on port 3030
- Tenant account exists

**Test Steps**:
1. Navigate to http://localhost:3030/auth/tenant/signin
2. Enter email: `tenant@parenta.com`
3. Enter password: `tenant123`
4. Click "Sign In" button

**Expected Results**:
- ✅ User is authenticated
- ✅ Redirected to `/tenant` dashboard
- ✅ Dashboard loads successfully
- ✅ Tenant name appears in header

**Status**: ⏳ Pending

---

### TC-003: Login - Invalid Credentials
**Priority**: High  
**Module**: Authentication

**Preconditions**: 
- Server running on port 3030

**Test Steps**:
1. Navigate to http://localhost:3030/auth/admin/signin
2. Enter email: `wrong@email.com`
3. Enter password: `wrongpassword`
4. Click "Sign In" button

**Expected Results**:
- ✅ Error message displayed: "Invalid email or password"
- ✅ User remains on login page
- ✅ No redirect occurs

**Status**: ⏳ Pending

---

### TC-004: Logout Functionality
**Priority**: High  
**Module**: Authentication

**Preconditions**: 
- User is logged in as admin

**Test Steps**:
1. Click on user profile/avatar in header
2. Click "Logout" or "Sign Out" button
3. Observe redirect

**Expected Results**:
- ✅ User is logged out
- ✅ Session is terminated
- ✅ Redirected to login page or landing page
- ✅ Accessing `/admin` redirects to login

**Status**: ⏳ Pending

---

### TC-005: Protected Route - Unauthorized Access
**Priority**: Critical  
**Module**: Authentication

**Preconditions**: 
- User is NOT logged in

**Test Steps**:
1. Navigate directly to http://localhost:3030/admin
2. Observe behavior

**Expected Results**:
- ✅ User is redirected to login page
- ✅ Admin dashboard does not load
- ✅ Error message may appear

**Status**: ⏳ Pending

---

### TC-006: Role-Based Access Control
**Priority**: Critical  
**Module**: Authentication

**Preconditions**: 
- Logged in as tenant

**Test Steps**:
1. Attempt to navigate to http://localhost:3030/admin
2. Observe behavior

**Expected Results**:
- ✅ Access denied
- ✅ Redirected to tenant dashboard or error page
- ✅ Admin pages not accessible

**Status**: ⏳ Pending

---

## 🏠 LANDING PAGE TEST CASES

### TC-007: Landing Page Load
**Priority**: High  
**Module**: Landing Page

**Preconditions**: 
- Server running
- Database has buildings

**Test Steps**:
1. Navigate to http://localhost:3030
2. Wait for page to load

**Expected Results**:
- ✅ Page loads successfully
- ✅ Hero section displays
- ✅ Up to 6 featured buildings display
- ✅ Login buttons are visible
- ✅ No console errors

**Status**: ⏳ Pending

---

### TC-008: Landing Page - Login Navigation
**Priority**: Medium  
**Module**: Landing Page

**Preconditions**: 
- On landing page

**Test Steps**:
1. Click "Login as Admin" button
2. Go back and click "Login as Tenant" button

**Expected Results**:
- ✅ "Login as Admin" redirects to `/auth/admin/signin`
- ✅ "Login as Tenant" redirects to `/auth/tenant/signin`
- ✅ Both pages load correctly

**Status**: ⏳ Pending

---

## 📊 ADMIN DASHBOARD TEST CASES

### TC-009: Dashboard Load and Stats Display
**Priority**: Critical  
**Module**: Admin Dashboard

**Preconditions**: 
- Logged in as admin
- Database has data

**Test Steps**:
1. Navigate to `/admin` dashboard
2. Observe stats cards

**Expected Results**:
- ✅ Dashboard loads successfully
- ✅ All stat cards display numbers (not NaN)
- ✅ Stats show: Total Buildings, Total Rooms, Total Tenants, etc.
- ✅ All amounts in PHP (₱)
- ✅ No console errors

**Status**: ⏳ Pending

---

### TC-010: Dashboard - Quick Actions
**Priority**: Medium  
**Module**: Admin Dashboard

**Preconditions**: 
- Logged in as admin

**Test Steps**:
1. Click "Add Building" quick action button
2. Click "Add Room" quick action button
3. Click "Record Payment" quick action button

**Expected Results**:
- ✅ Each button opens a modal or redirects to correct page
- ✅ Forms load with all fields
- ✅ Cancel buttons work

**Status**: ⏳ Pending

---

### TC-011: Dashboard - Sidebar Navigation
**Priority**: High  
**Module**: Admin Dashboard

**Preconditions**: 
- Logged in as admin

**Test Steps**:
1. Click each item in sidebar navigation
2. Verify each page loads

**Expected Results**:
- ✅ All sidebar links work
- ✅ Pages load without errors
- ✅ Active page is highlighted in sidebar

**Status**: ⏳ Pending

---

## 🏢 BUILDINGS MODULE TEST CASES

### TC-012: View Buildings List
**Priority**: High  
**Module**: Buildings

**Preconditions**: 
- Logged in as admin
- Database has buildings

**Test Steps**:
1. Navigate to `/admin/buildings`
2. Observe buildings list

**Expected Results**:
- ✅ Page loads successfully
- ✅ Buildings display in cards/grid
- ✅ Each building shows: name, address, units, occupancy
- ✅ All stats show numbers (not NaN)
- ✅ "Add Building" button is visible

**Status**: ⏳ Pending

---

### TC-013: Create New Building
**Priority**: Critical  
**Module**: Buildings

**Preconditions**: 
- Logged in as admin

**Test Steps**:
1. Navigate to `/admin/buildings`
2. Click "Add Building" button
3. Fill in form:
   - Name: "Test Building"
   - Address: "123 Test St"
   - City: "Manila"
   - Postal Code: "1000"
   - Type: "Apartment"
4. Click "Save" or "Create" button

**Expected Results**:
- ✅ Form validation works
- ✅ Building is created successfully
- ✅ Success notification appears
- ✅ New building appears in list
- ✅ Modal closes or redirects to building detail

**Status**: ⏳ Pending

---

### TC-014: Edit Existing Building
**Priority**: High  
**Module**: Buildings

**Preconditions**: 
- Logged in as admin
- At least one building exists

**Test Steps**:
1. Navigate to `/admin/buildings`
2. Click "Edit" button on a building
3. Change the building name
4. Click "Save" button

**Expected Results**:
- ✅ Edit modal opens with pre-filled data
- ✅ Building updates successfully
- ✅ Success notification appears
- ✅ Updated name displays in list
- ✅ Changes persist after refresh

**Status**: ⏳ Pending

---

### TC-015: Delete Building
**Priority**: High  
**Module**: Buildings

**Preconditions**: 
- Logged in as admin
- Building with no rooms exists

**Test Steps**:
1. Navigate to `/admin/buildings`
2. Click "Delete" button on a building
3. Confirm deletion in confirmation dialog

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Building is deleted successfully
- ✅ Success notification appears
- ✅ Building removed from list
- ✅ Count updates correctly

**Status**: ⏳ Pending

---

### TC-016: View Building Detail Page
**Priority**: Medium  
**Module**: Buildings

**Preconditions**: 
- Logged in as admin
- Building exists

**Test Steps**:
1. Navigate to `/admin/buildings`
2. Click "View Details" on a building
3. Observe detail page

**Expected Results**:
- ✅ Redirects to `/admin/buildings/[id]`
- ✅ Building details display correctly
- ✅ Rooms list shows (if any)
- ✅ Breadcrumb navigation works
- ✅ "Edit Building" button is visible

**Status**: ⏳ Pending

---

### TC-017: Building - Search/Filter
**Priority**: Medium  
**Module**: Buildings

**Preconditions**: 
- Logged in as admin
- Multiple buildings exist

**Test Steps**:
1. Navigate to `/admin/buildings`
2. Use search box to search for a building name
3. Observe results

**Expected Results**:
- ✅ Search filters the list in real-time
- ✅ Matching buildings display
- ✅ Non-matching buildings are hidden
- ✅ Clear search restores full list

**Status**: ⏳ Pending

---

### TC-018: Building Stats Calculation
**Priority**: Medium  
**Module**: Buildings

**Preconditions**: 
- Logged in as admin
- Building with rooms exists

**Test Steps**:
1. Navigate to building detail page
2. Observe stats

**Expected Results**:
- ✅ Total units count is correct
- ✅ Occupied units count is correct
- ✅ Occupancy rate calculates correctly
- ✅ All numbers display (not NaN)

**Status**: ⏳ Pending

---

### TC-019: Building Image Upload
**Priority**: Low  
**Module**: Buildings

**Preconditions**: 
- Logged in as admin
- Creating or editing building

**Test Steps**:
1. Open Add/Edit Building form
2. Upload an image file
3. Save building

**Expected Results**:
- ✅ Image uploads successfully
- ✅ Preview shows uploaded image
- ✅ Image displays on building card
- ✅ Supported formats work (jpg, png, webp)

**Status**: ⏳ Pending

---

## 🚪 ROOMS MODULE TEST CASES

### TC-020: View Rooms List
**Priority**: High  
**Module**: Rooms

**Preconditions**: 
- Logged in as admin
- Rooms exist in database

**Test Steps**:
1. Navigate to `/admin/rooms`
2. Observe rooms list

**Expected Results**:
- ✅ Page loads successfully
- ✅ Rooms display in cards/table
- ✅ Vacancy overview stats show correctly
- ✅ Each room shows: number, building, status, rate (₱)
- ✅ "Add Room" button is visible

**Status**: ⏳ Pending

---

### TC-021: Create New Room
**Priority**: Critical  
**Module**: Rooms

**Preconditions**: 
- Logged in as admin
- At least one building exists

**Test Steps**:
1. Navigate to `/admin/rooms`
2. Click "Add Room" button
3. Fill in form:
   - Building: Select building
   - Room Number: "101"
   - Square Footage: 500
   - Monthly Rate: 15000
   - Deposit Amount: 30000
4. Click "Save" button

**Expected Results**:
- ✅ Form validation works (minimum 1 sqft, numbers only)
- ✅ Room is created successfully
- ✅ Success notification appears
- ✅ New room appears in list
- ✅ Amounts display in PHP (₱)

**Status**: ⏳ Pending

---

### TC-022: Edit Room
**Priority**: High  
**Module**: Rooms

**Preconditions**: 
- Logged in as admin
- Room exists

**Test Steps**:
1. Navigate to `/admin/rooms`
2. Click "Edit" on a room
3. Change monthly rate to 18000
4. Click "Save" button

**Expected Results**:
- ✅ Edit modal opens with pre-filled data
- ✅ Room updates successfully
- ✅ Success notification appears
- ✅ New rate displays in list (₱18,000)
- ✅ Changes persist after refresh

**Status**: ⏳ Pending

---

### TC-023: Filter Rooms by Building
**Priority**: Medium  
**Module**: Rooms

**Preconditions**: 
- Logged in as admin
- Rooms in multiple buildings exist

**Test Steps**:
1. Navigate to `/admin/rooms`
2. Select a building from filter dropdown
3. Observe filtered results

**Expected Results**:
- ✅ Only rooms in selected building display
- ✅ Room count updates
- ✅ "All Buildings" shows all rooms again

**Status**: ⏳ Pending

---

### TC-024: Filter Rooms by Status
**Priority**: Medium  
**Module**: Rooms

**Preconditions**: 
- Logged in as admin
- Rooms with different statuses exist

**Test Steps**:
1. Navigate to `/admin/rooms`
2. Select "Vacant" from status filter
3. Select "Occupied" from status filter

**Expected Results**:
- ✅ "Vacant" shows only vacant rooms
- ✅ "Occupied" shows only occupied rooms
- ✅ Status badges display correctly
- ✅ "All" shows all rooms

**Status**: ⏳ Pending

---

### TC-025: Assign Tenant to Room
**Priority**: Critical  
**Module**: Rooms

**Preconditions**: 
- Logged in as admin
- Vacant room exists
- Tenant without room assignment exists

**Test Steps**:
1. Navigate to `/admin/rooms`
2. Click "Assign Tenant" on a vacant room
3. Select tenant from dropdown
4. Enter lease details:
   - Lease start date
   - Deposit months: 2
   - Advance months: 1
5. Click "Assign" button

**Expected Results**:
- ✅ Assignment form opens
- ✅ Tenant dropdown populates
- ✅ Deposit/advance calculations show total in PHP (₱)
- ✅ Assignment created successfully
- ✅ Success notification appears
- ✅ Room status changes to "Occupied"
- ✅ Tenant name displays on room card

**Status**: ⏳ Pending

---

### TC-026: View Room Detail Page
**Priority**: Medium  
**Module**: Rooms

**Preconditions**: 
- Logged in as admin
- Room exists

**Test Steps**:
1. Navigate to `/admin/rooms`
2. Click "View Details" on a room
3. Observe detail page

**Expected Results**:
- ✅ Redirects to `/admin/rooms/[id]`
- ✅ Room details display correctly
- ✅ Current tenant info shows (if occupied)
- ✅ "Create Invoice" button visible (if occupied)
- ✅ Breadcrumb navigation works

**Status**: ⏳ Pending

---

### TC-027: Create Invoice from Room Page
**Priority**: High  
**Module**: Rooms

**Preconditions**: 
- Logged in as admin
- Occupied room exists

**Test Steps**:
1. Navigate to room detail page
2. Click "Create Invoice" button
3. Observe invoice form

**Expected Results**:
- ✅ Redirects to `/admin/financial/invoices/new`
- ✅ Room ID pre-filled in URL (`?roomId=...&tenantId=...`)
- ✅ Tenant and room fields auto-populated
- ✅ Form ready to add line items

**Status**: ⏳ Pending

---

### TC-028: Delete Room
**Priority**: Medium  
**Module**: Rooms

**Preconditions**: 
- Logged in as admin
- Vacant room exists

**Test Steps**:
1. Navigate to `/admin/rooms`
2. Click "Delete" on a vacant room
3. Confirm deletion

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Room is deleted successfully
- ✅ Success notification appears
- ✅ Room removed from list

**Status**: ⏳ Pending

---

### TC-029: Vacancy Overview Stats
**Priority**: Medium  
**Module**: Rooms

**Preconditions**: 
- Logged in as admin
- Mix of vacant and occupied rooms exist

**Test Steps**:
1. Navigate to `/admin/rooms`
2. Observe vacancy overview section

**Expected Results**:
- ✅ Total rooms count is correct
- ✅ Vacant rooms count is correct
- ✅ Occupied rooms count is correct
- ✅ Vacancy rate calculates correctly
- ✅ All numbers display (not NaN)

**Status**: ⏳ Pending

---

## 👥 TENANTS MODULE TEST CASES

### TC-030: View Tenants List
**Priority**: High  
**Module**: Tenants

**Preconditions**: 
- Logged in as admin
- Tenants exist

**Test Steps**:
1. Navigate to `/admin/tenants`
2. Observe tenants list

**Expected Results**:
- ✅ Page loads successfully
- ✅ Tenants display in cards/table
- ✅ Each tenant shows: name, email, phone, assigned room, status
- ✅ Tenant stats display correctly
- ✅ "Add Tenant" button is visible

**Status**: ⏳ Pending

---

### TC-031: Create New Tenant
**Priority**: Critical  
**Module**: Tenants

**Preconditions**: 
- Logged in as admin

**Test Steps**:
1. Navigate to `/admin/tenants`
2. Click "Add Tenant" button
3. Fill in form:
   - First Name: "John"
   - Last Name: "Doe"
   - Email: "john.doe@example.com"
   - Phone: "09171234567"
   - ID Type: "Government ID"
   - ID Number: "123456789"
4. Optionally check "Create User Account"
5. Click "Save" button

**Expected Results**:
- ✅ Form validation works
- ✅ Tenant created successfully
- ✅ Success notification appears
- ✅ New tenant appears in list
- ✅ If user account checked, user is created
- ✅ Modal closes or redirects to tenant detail

**Status**: ⏳ Pending

---

### TC-032: Edit Tenant Information
**Priority**: High  
**Module**: Tenants

**Preconditions**: 
- Logged in as admin
- Tenant exists

**Test Steps**:
1. Navigate to `/admin/tenants`
2. Click "Edit" on a tenant
3. Change phone number
4. Click "Save" button

**Expected Results**:
- ✅ Edit modal opens with pre-filled data
- ✅ Tenant updates successfully
- ✅ Success notification appears
- ✅ Updated phone displays in list
- ✅ Changes persist after refresh

**Status**: ⏳ Pending

---

### TC-033: View Tenant Profile
**Priority**: High  
**Module**: Tenants

**Preconditions**: 
- Logged in as admin
- Tenant exists

**Test Steps**:
1. Navigate to `/admin/tenants`
2. Click "View Profile" on a tenant
3. Observe profile page

**Expected Results**:
- ✅ Redirects to `/admin/tenants/[id]`
- ✅ Tenant details display correctly
- ✅ Current assignment shows (if any)
- ✅ Tabs work (Overview, Payments, Invoices, Documents)
- ✅ Payment history displays in PHP (₱)
- ✅ Breadcrumb navigation works

**Status**: ⏳ Pending

---

### TC-034: Add Payment from Tenant Profile
**Priority**: High  
**Module**: Tenants

**Preconditions**: 
- Logged in as admin
- Tenant exists

**Test Steps**:
1. Navigate to tenant profile page
2. Click "Add Payment" button
3. Observe payment form

**Expected Results**:
- ✅ Redirects to `/admin/financial/payments/new`
- ✅ Tenant ID pre-filled in URL (`?tenantId=...`)
- ✅ Tenant field auto-populated
- ✅ Form ready to enter payment details

**Status**: ⏳ Pending

---

### TC-035: Search Tenants
**Priority**: Medium  
**Module**: Tenants

**Preconditions**: 
- Logged in as admin
- Multiple tenants exist

**Test Steps**:
1. Navigate to `/admin/tenants`
2. Enter tenant name in search box
3. Observe results

**Expected Results**:
- ✅ Search filters list in real-time
- ✅ Matching tenants display
- ✅ Search works for name, email, phone
- ✅ Clear search restores full list

**Status**: ⏳ Pending

---

### TC-036: Filter Tenants by Status
**Priority**: Medium  
**Module**: Tenants

**Preconditions**: 
- Logged in as admin
- Tenants with different statuses exist

**Test Steps**:
1. Navigate to `/admin/tenants`
2. Select "Active" from status filter
3. Select "Inactive" from status filter

**Expected Results**:
- ✅ "Active" shows only active tenants
- ✅ "Inactive" shows only inactive tenants
- ✅ Status badges display correctly
- ✅ "All" shows all tenants

**Status**: ⏳ Pending

---

### TC-037: Delete Tenant
**Priority**: Medium  
**Module**: Tenants

**Preconditions**: 
- Logged in as admin
- Tenant without active assignment exists

**Test Steps**:
1. Navigate to `/admin/tenants`
2. Click "Delete" on a tenant
3. Confirm deletion

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Tenant is deleted successfully
- ✅ Success notification appears
- ✅ Tenant removed from list

**Status**: ⏳ Pending

---

### TC-038: Tenant Stats Display
**Priority**: Medium  
**Module**: Tenants

**Preconditions**: 
- Logged in as admin
- Tenants exist

**Test Steps**:
1. Navigate to `/admin/tenants`
2. Observe tenant stats

**Expected Results**:
- ✅ Active tenants count is correct
- ✅ Total tenants count is correct
- ✅ All numbers display (not NaN)

**Status**: ⏳ Pending

---

## 💰 PAYMENTS MODULE TEST CASES

### TC-039: View Payments List
**Priority**: High  
**Module**: Payments

**Preconditions**: 
- Logged in as admin
- Payments exist

**Test Steps**:
1. Navigate to `/admin/financial/payments`
2. Observe payments list

**Expected Results**:
- ✅ Page loads successfully
- ✅ Payments display in table
- ✅ Payment stats show in PHP (₱)
- ✅ Each payment shows: date, tenant, amount (₱), type, method, status
- ✅ "Record Payment" button is visible

**Status**: ⏳ Pending

---

### TC-040: Record New Payment
**Priority**: Critical  
**Module**: Payments

**Preconditions**: 
- Logged in as admin
- At least one tenant exists

**Test Steps**:
1. Navigate to `/admin/financial/payments`
2. Click "Record Payment" button
3. Fill in form:
   - Tenant: Select tenant
   - Room: Select room (auto-filtered by tenant)
   - Amount: 15000
   - Payment Type: "Rent"
   - Payment Method: "Bank Transfer"
   - Payment Date: Today's date
   - Reference Number: "REF-001"
4. Click "Save Payment" button

**Expected Results**:
- ✅ Form loads with tenant/room dropdowns
- ✅ Room dropdown filters based on tenant
- ✅ Amount accepts numbers only
- ✅ Currency symbol shows ₱
- ✅ Form validation works
- ✅ Payment created successfully
- ✅ Success notification appears
- ✅ Redirects to payments list
- ✅ New payment appears in table

**Status**: ⏳ Pending

---

### TC-041: View Payment Detail
**Priority**: Medium  
**Module**: Payments

**Preconditions**: 
- Logged in as admin
- Payment exists

**Test Steps**:
1. Navigate to `/admin/financial/payments`
2. Click "View Details" on a payment
3. Observe detail page

**Expected Results**:
- ✅ Redirects to `/admin/financial/payments/[id]`
- ✅ Payment details display correctly
- ✅ Amount shows in PHP (₱)
- ✅ Tenant and room links work
- ✅ "Edit Payment" button visible
- ✅ "Print Receipt" button visible

**Status**: ⏳ Pending

---

### TC-042: Filter Payments by Date Range
**Priority**: Medium  
**Module**: Payments

**Preconditions**: 
- Logged in as admin
- Payments from different dates exist

**Test Steps**:
1. Navigate to `/admin/financial/payments`
2. Select date range (e.g., last 30 days)
3. Observe filtered results

**Expected Results**:
- ✅ Only payments within date range display
- ✅ Stats update to reflect filtered data
- ✅ Clear filter restores full list

**Status**: ⏳ Pending

---

### TC-043: Filter Payments by Type
**Priority**: Medium  
**Module**: Payments

**Preconditions**: 
- Logged in as admin
- Payments of different types exist

**Test Steps**:
1. Navigate to `/admin/financial/payments`
2. Select "Rent" from type filter
3. Select "Deposit" from type filter

**Expected Results**:
- ✅ Filter shows only selected type
- ✅ All payment types accessible
- ✅ "All Types" shows all payments

**Status**: ⏳ Pending

---

### TC-044: Edit Payment
**Priority**: High  
**Module**: Payments

**Preconditions**: 
- Logged in as admin
- Payment exists

**Test Steps**:
1. Navigate to payment detail page
2. Click "Edit Payment" button
3. Change payment method to "Cash"
4. Click "Save" button

**Expected Results**:
- ✅ Edit modal opens with pre-filled data
- ✅ Payment updates successfully
- ✅ Success notification appears
- ✅ Updated method displays
- ✅ Changes persist after refresh

**Status**: ⏳ Pending

---

### TC-045: Delete Payment
**Priority**: Medium  
**Module**: Payments

**Preconditions**: 
- Logged in as admin
- Payment exists

**Test Steps**:
1. Navigate to payment detail page
2. Click "Delete Payment" button
3. Confirm deletion

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Payment is deleted successfully
- ✅ Success notification appears
- ✅ Redirects to payments list
- ✅ Payment removed from table

**Status**: ⏳ Pending

---

## 📄 INVOICES MODULE TEST CASES

### TC-046: View Invoices List
**Priority**: High  
**Module**: Invoices

**Preconditions**: 
- Logged in as admin
- Invoices exist

**Test Steps**:
1. Navigate to `/admin/financial/invoices`
2. Observe invoices list

**Expected Results**:
- ✅ Page loads successfully
- ✅ Invoices display in table
- ✅ Invoice stats show in PHP (₱)
- ✅ Each invoice shows: number, tenant, dates, amount (₱), status
- ✅ "Create Invoice" button is visible

**Status**: ⏳ Pending

---

### TC-047: Create New Invoice
**Priority**: Critical  
**Module**: Invoices

**Preconditions**: 
- Logged in as admin
- Tenant exists

**Test Steps**:
1. Navigate to `/admin/financial/invoices`
2. Click "Create Invoice" button
3. Fill in form:
   - Tenant: Select tenant
   - Room: Select room
   - Issue Date: Today
   - Due Date: 7 days from now
   - Add line item:
     * Description: "Monthly Rent"
     * Quantity: 1
     * Unit Price: 15000
4. Add another line item:
     * Description: "Water Bill"
     * Quantity: 1
     * Unit Price: 500
5. Click "Create Invoice" button

**Expected Results**:
- ✅ Form loads correctly
- ✅ Tenant/room dropdowns populate
- ✅ Line items can be added/removed
- ✅ Subtotal auto-calculates (₱15,500)
- ✅ Tax auto-calculates (if applicable)
- ✅ Total auto-calculates correctly
- ✅ All amounts in PHP (₱)
- ✅ Form validation works
- ✅ Invoice created successfully
- ✅ Success notification appears
- ✅ Redirects to invoice detail page

**Status**: ⏳ Pending

---

### TC-048: Pre-fill Invoice from Room Page
**Priority**: High  
**Module**: Invoices

**Preconditions**: 
- Logged in as admin
- Occupied room exists

**Test Steps**:
1. Navigate to room detail page
2. Click "Create Invoice" button
3. Observe invoice form

**Expected Results**:
- ✅ Invoice form opens
- ✅ Room ID in URL (`?roomId=...&tenantId=...`)
- ✅ Tenant field is auto-populated
- ✅ Room field is auto-populated
- ✅ Fields are editable if needed

**Status**: ⏳ Pending

---

### TC-049: View Invoice Detail
**Priority**: High  
**Module**: Invoices

**Preconditions**: 
- Logged in as admin
- Invoice exists

**Test Steps**:
1. Navigate to `/admin/financial/invoices`
2. Click "View" on an invoice
3. Observe invoice detail page

**Expected Results**:
- ✅ Redirects to `/admin/financial/invoices/[id]`
- ✅ Invoice displays in professional format
- ✅ All line items show correctly
- ✅ Subtotal, tax, total display in PHP (₱)
- ✅ Status badge shows correct color
- ✅ Action buttons visible

**Status**: ⏳ Pending

---

### TC-050: Mark Invoice as Paid
**Priority**: High  
**Module**: Invoices

**Preconditions**: 
- Logged in as admin
- Unpaid invoice exists

**Test Steps**:
1. Navigate to invoice detail page
2. Click "Mark as Paid" button
3. Confirm action

**Expected Results**:
- ✅ Status updates to "Paid"
- ✅ Success notification appears
- ✅ Status badge changes to green
- ✅ Change persists after refresh

**Status**: ⏳ Pending

---

### TC-051: Record Payment from Invoice
**Priority**: High  
**Module**: Invoices

**Preconditions**: 
- Logged in as admin
- Unpaid invoice exists

**Test Steps**:
1. Navigate to invoice detail page
2. Click "Record Payment" button
3. Observe payment form

**Expected Results**:
- ✅ Redirects to payment form
- ✅ Invoice ID pre-filled in URL
- ✅ Amount auto-populated with invoice total
- ✅ Tenant auto-populated

**Status**: ⏳ Pending

---

### TC-052: Filter Invoices by Status
**Priority**: Medium  
**Module**: Invoices

**Preconditions**: 
- Logged in as admin
- Invoices with different statuses exist

**Test Steps**:
1. Navigate to `/admin/financial/invoices`
2. Select "Paid" from status filter
3. Select "Unpaid" from status filter

**Expected Results**:
- ✅ Filter shows only selected status
- ✅ Stats update accordingly
- ✅ "All" shows all invoices

**Status**: ⏳ Pending

---

### TC-053: Download Invoice PDF
**Priority**: Low  
**Module**: Invoices

**Preconditions**: 
- Logged in as admin
- Invoice exists

**Test Steps**:
1. Navigate to invoice detail page
2. Click "Download PDF" button

**Expected Results**:
- ✅ PDF generates successfully
- ✅ PDF downloads to browser
- ✅ PDF contains all invoice information

**Status**: ⏳ Pending

---

## 💸 EXPENSES MODULE TEST CASES

### TC-054: View Expenses List
**Priority**: High  
**Module**: Expenses

**Preconditions**: 
- Logged in as admin
- Expenses exist

**Test Steps**:
1. Navigate to `/admin/financial/expenses`
2. Observe expenses list

**Expected Results**:
- ✅ Page loads successfully
- ✅ Expenses display in table
- ✅ Expense stats show in PHP (₱)
- ✅ Each expense shows: date, description, category, building, amount (₱), vendor
- ✅ "Add Expense" button is visible

**Status**: ⏳ Pending

---

### TC-055: Add New Expense
**Priority**: Critical  
**Module**: Expenses

**Preconditions**: 
- Logged in as admin

**Test Steps**:
1. Navigate to `/admin/financial/expenses`
2. Click "Add Expense" button
3. Fill in form:
   - Description: "Plumbing Repair"
   - Category: "Maintenance"
   - Amount: 5000
   - Date: Today
   - Building: Select building
   - Vendor: "ABC Plumbing"
   - Payment Method: "Cash"
4. Click "Save" button

**Expected Results**:
- ✅ Form loads correctly
- ✅ Amount accepts numbers only
- ✅ Currency symbol shows ₱
- ✅ Form validation works
- ✅ Expense created successfully
- ✅ Success notification appears
- ✅ New expense appears in list

**Status**: ⏳ Pending

---

### TC-056: Filter Expenses by Category
**Priority**: Medium  
**Module**: Expenses

**Preconditions**: 
- Logged in as admin
- Expenses in multiple categories exist

**Test Steps**:
1. Navigate to `/admin/financial/expenses`
2. Select "Maintenance" from category filter
3. Select "Utilities" from category filter

**Expected Results**:
- ✅ Filter shows only selected category
- ✅ Stats update accordingly
- ✅ "All Categories" shows all expenses

**Status**: ⏳ Pending

---

### TC-057: Filter Expenses by Date Range
**Priority**: Medium  
**Module**: Expenses

**Preconditions**: 
- Logged in as admin
- Expenses from different dates exist

**Test Steps**:
1. Navigate to `/admin/financial/expenses`
2. Select date range (e.g., this month)
3. Observe filtered results

**Expected Results**:
- ✅ Only expenses within date range display
- ✅ Stats update to reflect filtered data
- ✅ Clear filter restores full list

**Status**: ⏳ Pending

---

### TC-058: View Expense Detail
**Priority**: Medium  
**Module**: Expenses

**Preconditions**: 
- Logged in as admin
- Expense exists

**Test Steps**:
1. Navigate to `/admin/financial/expenses`
2. Click "View" on an expense
3. Observe detail page

**Expected Results**:
- ✅ Redirects to `/admin/financial/expenses/[id]`
- ✅ Expense details display correctly
- ✅ Amount shows in PHP (₱)
- ✅ Receipt/attachment shows if uploaded
- ✅ "Edit" and "Delete" buttons visible

**Status**: ⏳ Pending

---

## 🔧 MAINTENANCE MODULE TEST CASES

### TC-059: Tenant - Submit Maintenance Request
**Priority**: Critical  
**Module**: Maintenance

**Preconditions**: 
- Logged in as tenant
- Tenant has room assignment

**Test Steps**:
1. Navigate to `/tenant/maintenance`
2. Click "Submit New Request" button
3. Fill in form:
   - Title: "Leaking Faucet"
   - Description: "Kitchen faucet is leaking"
   - Category: "Plumbing"
   - Priority: "High"
4. Click "Submit" button

**Expected Results**:
- ✅ Form opens correctly
- ✅ All fields are editable
- ✅ Category dropdown has options
- ✅ Form validation works
- ✅ Request submitted successfully
- ✅ Success notification appears
- ✅ New request appears in tenant's list
- ✅ Stats update (active requests count)

**Status**: ⏳ Pending

---

### TC-060: Admin - View All Maintenance Requests
**Priority**: Critical  
**Module**: Maintenance

**Preconditions**: 
- Logged in as admin
- Maintenance requests exist

**Test Steps**:
1. Navigate to `/admin/maintenance`
2. Observe maintenance requests list

**Expected Results**:
- ✅ Page loads successfully
- ✅ All requests from all tenants display
- ✅ Stats cards show correct counts
- ✅ Table shows: request, property, tenant, category, priority, status, date
- ✅ Tenant and property info displays correctly
- ✅ Status and priority badges show correct colors

**Status**: ⏳ Pending

---

### TC-061: Admin - Update Maintenance Request
**Priority**: Critical  
**Module**: Maintenance

**Preconditions**: 
- Logged in as admin
- Open maintenance request exists

**Test Steps**:
1. Navigate to `/admin/maintenance`
2. Click "Update" on a request
3. In modal:
   - Change status to "In Progress"
   - Change priority to "Urgent"
   - Set scheduled date to tomorrow
   - Add note: "Plumber assigned"
   - Enter assigned to: "John Smith"
4. Click "Save Changes" button

**Expected Results**:
- ✅ Update modal opens with request details
- ✅ All form fields are editable
- ✅ Status dropdown has all options
- ✅ Priority dropdown works
- ✅ Date pickers work
- ✅ Notes textarea accepts text
- ✅ Request updates successfully
- ✅ Success notification appears
- ✅ Changes display immediately in table
- ✅ Changes persist after refresh

**Status**: ⏳ Pending

---

### TC-062: Admin - Filter Maintenance by Status
**Priority**: High  
**Module**: Maintenance

**Preconditions**: 
- Logged in as admin
- Requests with different statuses exist

**Test Steps**:
1. Navigate to `/admin/maintenance`
2. Select "Open" from status filter
3. Select "In Progress" from status filter
4. Select "Completed" from status filter

**Expected Results**:
- ✅ Each filter shows only matching requests
- ✅ Stats update to reflect filtered data
- ✅ "All Status" shows all requests

**Status**: ⏳ Pending

---

### TC-063: Admin - Filter Maintenance by Priority
**Priority**: High  
**Module**: Maintenance

**Preconditions**: 
- Logged in as admin
- Requests with different priorities exist

**Test Steps**:
1. Navigate to `/admin/maintenance`
2. Select "Urgent" from priority filter
3. Select "High" from priority filter

**Expected Results**:
- ✅ Each filter shows only matching requests
- ✅ Urgent requests appear first (sorting)
- ✅ "All Priority" shows all requests

**Status**: ⏳ Pending

---

### TC-064: Admin - Filter Maintenance by Category
**Priority**: Medium  
**Module**: Maintenance

**Preconditions**: 
- Logged in as admin
- Requests in different categories exist

**Test Steps**:
1. Navigate to `/admin/maintenance`
2. Select "Plumbing" from category filter
3. Select "Electrical" from category filter

**Expected Results**:
- ✅ Each filter shows only matching requests
- ✅ All categories accessible
- ✅ "All Categories" shows all requests

**Status**: ⏳ Pending

---

### TC-065: Admin - Search Maintenance Requests
**Priority**: Medium  
**Module**: Maintenance

**Preconditions**: 
- Logged in as admin
- Multiple requests exist

**Test Steps**:
1. Navigate to `/admin/maintenance`
2. Enter search term (e.g., "faucet", tenant name, building name)
3. Observe results

**Expected Results**:
- ✅ Search filters list in real-time
- ✅ Matches title, description, tenant, building, room
- ✅ Clear search restores full list

**Status**: ⏳ Pending

---

### TC-066: Tenant - View Own Maintenance Requests
**Priority**: High  
**Module**: Maintenance

**Preconditions**: 
- Logged in as tenant
- Tenant has submitted requests

**Test Steps**:
1. Navigate to `/tenant/maintenance`
2. Observe requests list

**Expected Results**:
- ✅ Page loads successfully
- ✅ Only tenant's own requests display
- ✅ Stats show (active, total)
- ✅ Each request shows: title, category, priority, status, date
- ✅ Status updates from admin are visible

**Status**: ⏳ Pending

---

### TC-067: Maintenance Stats Calculation
**Priority**: Medium  
**Module**: Maintenance

**Preconditions**: 
- Logged in as admin
- Requests with various statuses exist

**Test Steps**:
1. Navigate to `/admin/maintenance`
2. Observe stats cards

**Expected Results**:
- ✅ Total requests count is correct
- ✅ Open requests count is correct
- ✅ In Progress count is correct
- ✅ Completed count is correct
- ✅ Urgent and High priority counts are correct
- ✅ All numbers display (not NaN)

**Status**: ⏳ Pending

---

### TC-068: Maintenance Request Persistence
**Priority**: High  
**Module**: Maintenance

**Preconditions**: 
- Maintenance request exists
- Admin has updated it

**Test Steps**:
1. Note request details
2. Refresh page (F5)
3. Logout and login again
4. Navigate to maintenance page

**Expected Results**:
- ✅ Request details persist after refresh
- ✅ Request persists after logout/login
- ✅ Status updates persist
- ✅ Notes persist
- ✅ Scheduled dates persist

**Status**: ⏳ Pending

---

## 📊 ANALYTICS MODULE TEST CASES

### TC-069: Analytics Page Load
**Priority**: High  
**Module**: Analytics

**Preconditions**: 
- Logged in as admin
- Database has data

**Test Steps**:
1. Navigate to `/admin/analytics`
2. Wait for page to load

**Expected Results**:
- ✅ Page loads successfully (not stuck on "Loading...")
- ✅ All 8 charts render
- ✅ No console errors
- ✅ Date range selector is visible

**Status**: ⏳ Pending

---

### TC-070: Analytics - All Charts Display
**Priority**: Critical  
**Module**: Analytics

**Preconditions**: 
- Logged in as admin
- On analytics page

**Test Steps**:
1. Scroll through page
2. Verify each chart:
   - Revenue Trend
   - Expense Breakdown
   - Occupancy Trend
   - Payment Status
   - Tenant Distribution
   - Financial Summary
   - Maintenance Stats
   - Asset Utilization

**Expected Results**:
- ✅ All 8 charts render successfully
- ✅ Each chart has title and legend
- ✅ Data displays in charts
- ✅ All currency amounts in PHP (₱)
- ✅ Charts are interactive (hover shows tooltips)

**Status**: ⏳ Pending

---

### TC-071: Analytics - Date Range Filter
**Priority**: High  
**Module**: Analytics

**Preconditions**: 
- Logged in as admin
- On analytics page

**Test Steps**:
1. Select "Last 30 Days" from date range
2. Select "Last 90 Days" from date range
3. Select "This Year" from date range

**Expected Results**:
- ✅ Charts update when date range changes
- ✅ Data reflects selected time period
- ✅ No loading errors

**Status**: ⏳ Pending

---

### TC-072: Analytics - Chart Interactions
**Priority**: Medium  
**Module**: Analytics

**Preconditions**: 
- Logged in as admin
- On analytics page with rendered charts

**Test Steps**:
1. Hover over data points in Revenue Trend chart
2. Hover over pie slices in Expense Breakdown
3. Click on legend items

**Expected Results**:
- ✅ Tooltips appear on hover
- ✅ Tooltips show correct data values
- ✅ Legend items are clickable (toggle visibility)
- ✅ Charts remain responsive

**Status**: ⏳ Pending

---

## 📈 REPORTS MODULE TEST CASES

### TC-073: Reports Page Load
**Priority**: High  
**Module**: Reports

**Preconditions**: 
- Logged in as admin

**Test Steps**:
1. Navigate to `/admin/reports`
2. Observe page

**Expected Results**:
- ✅ Page loads successfully
- ✅ Report cards/buttons display
- ✅ All report types are listed
- ✅ No console errors

**Status**: ⏳ Pending

---

### TC-074: Financial Reports Page
**Priority**: High  
**Module**: Reports

**Preconditions**: 
- Logged in as admin

**Test Steps**:
1. Navigate to `/admin/financial/reports`
2. Observe default report

**Expected Results**:
- ✅ Page loads successfully
- ✅ Report tabs or selector visible
- ✅ Default report displays
- ✅ Date range filter visible

**Status**: ⏳ Pending

---

### TC-075: Revenue Report
**Priority**: High  
**Module**: Reports

**Preconditions**: 
- Logged in as admin
- Revenue data exists

**Test Steps**:
1. Navigate to `/admin/financial/reports`
2. Select "Revenue Report"
3. Select date range

**Expected Results**:
- ✅ Revenue report displays
- ✅ Total revenue shown in PHP (₱)
- ✅ Breakdown by month, building, category
- ✅ Data matches selected date range

**Status**: ⏳ Pending

---

### TC-076: Expense Report
**Priority**: High  
**Module**: Reports

**Preconditions**: 
- Logged in as admin
- Expense data exists

**Test Steps**:
1. Navigate to `/admin/financial/reports`
2. Select "Expense Report"
3. Select date range

**Expected Results**:
- ✅ Expense report displays
- ✅ Total expenses shown in PHP (₱)
- ✅ Breakdown by category and vendor
- ✅ Data matches selected date range

**Status**: ⏳ Pending

---

### TC-077: Profit & Loss Statement
**Priority**: High  
**Module**: Reports

**Preconditions**: 
- Logged in as admin
- Financial data exists

**Test Steps**:
1. Navigate to `/admin/financial/reports`
2. Select "Profit & Loss"
3. Select date range

**Expected Results**:
- ✅ P&L statement displays
- ✅ Revenue section shows all income
- ✅ Expenses section shows all costs
- ✅ Net income calculates correctly
- ✅ Profit margin displays
- ✅ All amounts in PHP (₱)

**Status**: ⏳ Pending

---

## 🏷️ UTILITIES MODULE TEST CASES

### TC-078: View Utilities List
**Priority**: High  
**Module**: Utilities

**Preconditions**: 
- Logged in as admin
- Utility bills exist

**Test Steps**:
1. Navigate to `/admin/utilities` or `/utilities`
2. Observe utilities list

**Expected Results**:
- ✅ Page loads successfully
- ✅ Utility bills display in table
- ✅ Stats show in PHP (₱)
- ✅ Each bill shows: period, building, type, provider, amount (₱), due date, status
- ✅ "Add Utility Bill" button is visible

**Status**: ⏳ Pending

---

### TC-079: Add Utility Bill
**Priority**: High  
**Module**: Utilities

**Preconditions**: 
- Logged in as admin
- Building exists

**Test Steps**:
1. Navigate to utilities page
2. Click "Add Utility Bill" button
3. Fill in form:
   - Building: Select building
   - Utility Type: "Electricity"
   - Provider: "Meralco"
   - Amount: 5000
   - Billing Period Start: First of month
   - Billing Period End: End of month
   - Due Date: 15 days from now
4. Click "Save" button

**Expected Results**:
- ✅ Form loads correctly
- ✅ All fields work
- ✅ Amount accepts numbers only
- ✅ Currency shows ₱
- ✅ Bill created successfully
- ✅ Success notification appears
- ✅ New bill appears in list

**Status**: ⏳ Pending

---

### TC-080: Filter Utilities by Type
**Priority**: Medium  
**Module**: Utilities

**Preconditions**: 
- Logged in as admin
- Bills for different utility types exist

**Test Steps**:
1. Navigate to utilities page
2. Select "Electricity" from type filter
3. Select "Water" from type filter

**Expected Results**:
- ✅ Filter shows only selected type
- ✅ Stats update accordingly
- ✅ "All Types" shows all bills

**Status**: ⏳ Pending

---

### TC-081: Mark Utility Bill as Paid
**Priority**: High  
**Module**: Utilities

**Preconditions**: 
- Logged in as admin
- Unpaid utility bill exists

**Test Steps**:
1. Navigate to utility detail page or list
2. Click "Mark as Paid" or "Pay" button
3. Confirm action

**Expected Results**:
- ✅ Status updates to "Paid"
- ✅ Success notification appears
- ✅ Change persists

**Status**: ⏳ Pending

---

### TC-082: View Utility Detail
**Priority**: Medium  
**Module**: Utilities

**Preconditions**: 
- Logged in as admin
- Utility bill exists

**Test Steps**:
1. Navigate to utilities list
2. Click "View" on a bill
3. Observe detail page

**Expected Results**:
- ✅ Redirects to utility detail page
- ✅ All bill details display correctly
- ✅ Amount shows in PHP (₱)
- ✅ Meter readings show (if applicable)
- ✅ Action buttons visible

**Status**: ⏳ Pending

---

## 🏷️ ASSETS MODULE TEST CASES

### TC-083: View Assets List
**Priority**: High  
**Module**: Assets

**Preconditions**: 
- Logged in as admin
- Assets exist

**Test Steps**:
1. Navigate to `/admin/assets`
2. Observe assets list

**Expected Results**:
- ✅ Page loads successfully
- ✅ Assets display in cards/table
- ✅ Asset stats display correctly
- ✅ Each asset shows: name, category, condition, status, assigned to, value (₱)
- ✅ "Add Asset" button is visible

**Status**: ⏳ Pending

---

### TC-084: Add New Asset
**Priority**: High  
**Module**: Assets

**Preconditions**: 
- Logged in as admin

**Test Steps**:
1. Navigate to `/admin/assets`
2. Click "Add Asset" button
3. Fill in form:
   - Name: "Air Conditioner"
   - Category: "Appliance"
   - Condition: "Excellent"
   - Status: "Available"
   - Purchase Date: 6 months ago
   - Value: 25000
4. Click "Save" button

**Expected Results**:
- ✅ Form loads correctly
- ✅ Value accepts numbers only
- ✅ Currency shows ₱
- ✅ Asset created successfully
- ✅ Success notification appears
- ✅ New asset appears in list

**Status**: ⏳ Pending

---

### TC-085: Assign Asset to Room
**Priority**: High  
**Module**: Assets

**Preconditions**: 
- Logged in as admin
- Available asset exists
- Room exists

**Test Steps**:
1. Navigate to asset detail page
2. Click "Assign to Room" button
3. Select room from dropdown
4. Click "Assign" button

**Expected Results**:
- ✅ Assignment form opens
- ✅ Room dropdown populates
- ✅ Assignment created successfully
- ✅ Success notification appears
- ✅ Asset status changes to "In Use"
- ✅ Assigned room displays on asset card

**Status**: ⏳ Pending

---

### TC-086: View Asset Assignment History
**Priority**: Medium  
**Module**: Assets

**Preconditions**: 
- Logged in as admin
- Asset with assignment history exists

**Test Steps**:
1. Navigate to asset detail page
2. Observe assignment history section

**Expected Results**:
- ✅ Assignment history displays
- ✅ Shows all past and current assignments
- ✅ Dates and rooms display correctly

**Status**: ⏳ Pending

---

### TC-087: Filter Assets by Category
**Priority**: Medium  
**Module**: Assets

**Preconditions**: 
- Logged in as admin
- Assets in multiple categories exist

**Test Steps**:
1. Navigate to `/admin/assets`
2. Select "Furniture" from category filter
3. Select "Appliance" from category filter

**Expected Results**:
- ✅ Filter shows only selected category
- ✅ Stats update accordingly
- ✅ "All Categories" shows all assets

**Status**: ⏳ Pending

---

### TC-088: Filter Assets by Status
**Priority**: Medium  
**Module**: Assets

**Preconditions**: 
- Logged in as admin
- Assets with different statuses exist

**Test Steps**:
1. Navigate to `/admin/assets`
2. Select "Available" from status filter
3. Select "In Use" from status filter

**Expected Results**:
- ✅ Filter shows only selected status
- ✅ "All Status" shows all assets

**Status**: ⏳ Pending

---

## 👤 TENANT PORTAL TEST CASES

### TC-089: Tenant Dashboard Load
**Priority**: Critical  
**Module**: Tenant Portal

**Preconditions**: 
- Logged in as tenant
- Tenant has room assignment

**Test Steps**:
1. Navigate to `/tenant` dashboard
2. Observe dashboard

**Expected Results**:
- ✅ Dashboard loads successfully
- ✅ Welcome message with tenant name displays
- ✅ Current unit info shows (building, room)
- ✅ Stats show (next payment, balance, requests)
- ✅ All amounts in PHP (₱), not NaN
- ✅ Quick action buttons visible

**Status**: ⏳ Pending

---

### TC-090: Tenant - View Payment History
**Priority**: High  
**Module**: Tenant Portal

**Preconditions**: 
- Logged in as tenant
- Tenant has payment history

**Test Steps**:
1. Navigate to `/tenant/payments`
2. Observe payments page

**Expected Results**:
- ✅ Page loads successfully
- ✅ Summary cards show amounts in PHP (₱), not NaN
- ✅ Total paid displays correctly
- ✅ Outstanding balance displays
- ✅ Next payment due shows (date and amount)
- ✅ Payment history table displays
- ✅ All amounts in PHP (₱)

**Status**: ⏳ Pending

---

### TC-091: Tenant - View Documents
**Priority**: Medium  
**Module**: Tenant Portal

**Preconditions**: 
- Logged in as tenant
- Documents exist for tenant

**Test Steps**:
1. Navigate to `/tenant/documents`
2. Observe documents list

**Expected Results**:
- ✅ Page loads successfully
- ✅ Documents list displays
- ✅ Each document shows: name, type, date
- ✅ "View" and "Download" buttons work
- ✅ Empty state shows if no documents

**Status**: ⏳ Pending

---

### TC-092: Tenant - Download Document
**Priority**: Medium  
**Module**: Tenant Portal

**Preconditions**: 
- Logged in as tenant
- Documents exist

**Test Steps**:
1. Navigate to `/tenant/documents`
2. Click "Download" on a document

**Expected Results**:
- ✅ Document downloads successfully
- ✅ File is accessible
- ✅ No errors occur

**Status**: ⏳ Pending

---

### TC-093: Tenant - Submit and View Maintenance Request (Full Flow)
**Priority**: Critical  
**Module**: Tenant Portal

**Preconditions**: 
- Logged in as tenant

**Test Steps**:
1. Navigate to `/tenant/maintenance`
2. Click "Submit New Request"
3. Fill form and submit (see TC-059)
4. Verify request appears in list
5. Note request ID
6. Logout
7. Login as admin
8. Navigate to `/admin/maintenance`
9. Find and update the request (see TC-061)
10. Logout
11. Login as tenant again
12. Navigate to `/tenant/maintenance`
13. Verify status update is visible

**Expected Results**:
- ✅ Tenant can submit request successfully
- ✅ Request appears in tenant's list immediately
- ✅ Admin can see the request
- ✅ Admin can update the request
- ✅ Tenant sees status updates from admin
- ✅ All data persists correctly
- ✅ Full flow works end-to-end

**Status**: ⏳ Pending

---

### TC-094: Tenant - Dashboard Quick Actions
**Priority**: Medium  
**Module**: Tenant Portal

**Preconditions**: 
- Logged in as tenant

**Test Steps**:
1. On tenant dashboard
2. Click "Make Payment" button
3. Go back, click "View Documents" button
4. Go back, click "Submit Maintenance Request" button

**Expected Results**:
- ✅ "Make Payment" navigates to payments page
- ✅ "View Documents" navigates to documents page
- ✅ "Submit Maintenance Request" navigates to maintenance page
- ✅ All pages load correctly

**Status**: ⏳ Pending

---

### TC-095: Tenant - Sidebar Navigation
**Priority**: Medium  
**Module**: Tenant Portal

**Preconditions**: 
- Logged in as tenant

**Test Steps**:
1. Click each item in sidebar navigation
2. Verify each page loads

**Expected Results**:
- ✅ All sidebar links work
- ✅ Pages load without errors
- ✅ Active page is highlighted

**Status**: ⏳ Pending

---

### TC-096: Tenant - Data Isolation (Security Test)
**Priority**: Critical  
**Module**: Tenant Portal

**Preconditions**: 
- Two tenant accounts exist
- Both have payment/maintenance data

**Test Steps**:
1. Login as Tenant A
2. Note visible payments and maintenance requests
3. Logout
4. Login as Tenant B
5. Note visible payments and maintenance requests

**Expected Results**:
- ✅ Tenant A only sees their own data
- ✅ Tenant B only sees their own data
- ✅ No data leakage between tenants
- ✅ Each tenant's data is isolated

**Status**: ⏳ Pending

---

## 📝 END-TO-END TEST SCENARIOS

### TC-097: Complete Tenant Onboarding Flow
**Priority**: Critical  
**Module**: End-to-End

**Test Steps**:
1. Admin creates building
2. Admin creates room in that building
3. Admin creates tenant (with user account)
4. Admin assigns tenant to room
5. Admin creates invoice for tenant
6. Admin records payment from tenant
7. Tenant logs in
8. Tenant views dashboard and sees current unit
9. Tenant views payment history
10. Tenant submits maintenance request
11. Admin logs in
12. Admin views and updates maintenance request
13. Tenant logs in again
14. Tenant sees updated maintenance request

**Expected Results**:
- ✅ All steps complete without errors
- ✅ Data flows correctly through system
- ✅ All notifications appear
- ✅ All redirects work
- ✅ Data persists correctly
- ✅ Full workflow functions end-to-end

**Status**: ⏳ Pending

---

### TC-098: Complete Property Lifecycle
**Priority**: Critical  
**Module**: End-to-End

**Test Steps**:
1. Create building → Add rooms → List building
2. Create tenant → Assign to room
3. Generate monthly invoice
4. Record rent payment
5. Tenant submits maintenance request
6. Admin updates request to completed
7. Record maintenance cost as expense
8. View analytics to see all data reflected
9. Generate P&L report showing revenue and expenses

**Expected Results**:
- ✅ All operations complete successfully
- ✅ Analytics reflect all transactions
- ✅ Reports show accurate data
- ✅ All amounts in PHP (₱)
- ✅ Complete property lifecycle works

**Status**: ⏳ Pending

---

## 📊 SUMMARY

**Total Test Cases**: 98  
**Critical Priority**: 23  
**High Priority**: 32  
**Medium Priority**: 35  
**Low Priority**: 8  

**Status**: ⏳ All Pending - Ready for Execution

---

## 🎯 NEXT STEPS

1. **Execute Tests**: Go through each test case systematically
2. **Mark Status**: Update status (✅ Pass | ❌ Fail) as you test
3. **Document Issues**: Record any failures with:
   - Screenshot
   - Steps to reproduce
   - Expected vs Actual result
   - Error messages
4. **Report Bugs**: Create bug list for failed tests
5. **Re-test**: After fixes, re-run failed tests

---

## 🤖 AUTOMATED TESTING

These test cases can be automated using:
- **Playwright** (recommended)
- **Cypress**
- **Jest + Testing Library**

Would you like me to set up automated E2E tests?

---

**Happy Testing! 🚀**






