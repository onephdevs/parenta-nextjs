# 🧪 Systematic UI Verification Test Flow

**Test Date**: October 30, 2025  
**Version**: 1.1.0  
**Tester**: Automated + Manual  
**App URL**: http://localhost:3030

---

## Testing Methodology

For each page, we verify:
1. ✅ **Page Load** - Does the page render without errors?
2. ✅ **APIs Called** - Which endpoints are used and do they work?
3. ✅ **UI Elements** - What buttons/forms/links exist?
4. ✅ **Interactions** - Do clicks, submissions, redirects work?
5. ✅ **Data Display** - Is data showing correctly (no NaN, no errors)?

**Status Legend**:
- ✅ PASS - Works as expected
- ⚠️ WARNING - Works but has issues
- ❌ FAIL - Does not work
- ⏳ PENDING - Not yet tested

---

## 🏠 PUBLIC PAGES

### 1. Landing Page
**URL**: `http://localhost:3030`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/buildings` - Fetch featured buildings (top 6)

**UI Elements**:
- Hero section with CTA buttons
- Featured buildings cards (max 6)
- "Login as Admin" button → `/auth/admin/signin`
- "Login as Tenant" button → `/auth/tenant/signin`
- "View All Properties" button (if exists)
- Building cards with images and details

**Expected Behavior**:
- Page loads with hero section
- Shows up to 6 featured buildings
- Building cards display: name, address, units, image
- Login buttons redirect correctly
- No console errors

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

## 🔐 AUTHENTICATION PAGES

### 2. Admin Login
**URL**: `http://localhost:3030/auth/admin/signin`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `POST /api/auth/signin` - NextAuth signin (on form submit)

**UI Elements**:
- Email input field
- Password input field
- "Sign In" button
- "Back to Home" link → `/`
- Error message display area

**Expected Behavior**:
- Form displays correctly
- Email validation works
- Password field is masked
- Valid credentials redirect to `/admin`
- Invalid credentials show error message
- "Back to Home" link works

**Test Credentials**: `admin@parenta.com` / `admin123`

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 3. Tenant Login
**URL**: `http://localhost:3030/auth/tenant/signin`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `POST /api/auth/signin` - NextAuth signin (on form submit)

**UI Elements**:
- Email input field
- Password input field
- "Sign In" button
- "Back to Home" link → `/`
- Error message display area

**Expected Behavior**:
- Form displays correctly
- Valid credentials redirect to `/tenant`
- Invalid credentials show error message
- "Back to Home" link works

**Test Credentials**: `tenant@parenta.com` / `tenant123`

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 4. Staff Login
**URL**: `http://localhost:3030/auth/staff/signin`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `POST /api/auth/signin` - NextAuth signin (on form submit)

**UI Elements**:
- Email input field
- Password input field
- "Sign In" button
- "Back to Home" link → `/`

**Expected Behavior**:
- Form displays correctly
- Valid credentials redirect to `/admin` (staff portal)
- Invalid credentials show error message

**Test Credentials**: `staff@parenta.com` / `staff123`

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

## 👨‍💼 ADMIN PORTAL

### 5. Admin Dashboard
**URL**: `http://localhost:3030/admin`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/dashboard/stats` - Dashboard statistics

**UI Elements**:
- Sidebar navigation
- Stats cards (Total Buildings, Total Rooms, Total Tenants, etc.)
- Quick action buttons:
  - "Add Building" → `/admin/buildings` (opens modal or redirects)
  - "Add Room" → `/admin/rooms` (opens modal or redirects)
  - "Add Tenant" → `/admin/tenants` (opens modal or redirects)
  - "Record Payment" → `/admin/financial/payments/new`
- Recent activity section
- Occupancy chart/stats

**Expected Behavior**:
- All stats show numbers (not NaN)
- Sidebar links work
- Quick action buttons open modals or redirect
- Recent activity displays if data exists

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 6. Buildings List
**URL**: `http://localhost:3030/admin/buildings`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/buildings` - List all buildings

**UI Elements**:
- "Add Building" button → Opens modal
- Building cards/table with:
  - Building name
  - Address
  - Total units
  - Occupancy rate
  - "View Details" button → `/admin/buildings/[id]`
  - "Edit" button → Opens edit modal
  - "Delete" button → Shows confirmation, calls DELETE API
- Search/filter inputs

**Expected Behavior**:
- Buildings display in cards/grid
- Stats show correctly (not NaN)
- "Add Building" opens modal with form
- "View Details" redirects to detail page
- "Edit" opens modal with pre-filled data
- "Delete" shows confirmation and removes building

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 7. Building Detail
**URL**: `http://localhost:3030/admin/buildings/[id]`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/buildings/[id]` - Get building details
- `GET /api/rooms?buildingId=[id]` - Get rooms in this building

**UI Elements**:
- Breadcrumb: Admin > Buildings > [Building Name]
- Building information display
- "Edit Building" button → Opens edit modal
- Tabs: Overview, Rooms, Financials
- List of rooms in this building
- Room cards with:
  - Room number
  - Status (vacant/occupied)
  - Monthly rate
  - "View Room" button → `/admin/rooms/[roomId]`

**Expected Behavior**:
- Building details display correctly
- Tabs switch content
- Rooms list shows all rooms in building
- "Edit Building" opens modal
- "View Room" redirects correctly
- Breadcrumb links work

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 8. Rooms List
**URL**: `http://localhost:3030/admin/rooms`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/rooms` - List all rooms
- `GET /api/buildings` - For building filter dropdown

**UI Elements**:
- "Add Room" button → Opens modal
- Vacancy overview stats
- Filter dropdowns:
  - Building filter
  - Status filter (All, Vacant, Occupied)
- Room cards/table with:
  - Room number
  - Building name
  - Status badge
  - Monthly rate (₱)
  - Square footage
  - "View Details" button → `/admin/rooms/[id]`
  - "Edit" button → Opens edit modal
  - "Assign Tenant" button → Opens assign modal (if vacant)

**Expected Behavior**:
- Rooms display with correct data
- Vacancy stats calculate correctly
- Filters work and update the list
- "Add Room" opens modal
- "View Details" redirects correctly
- "Edit" opens pre-filled modal
- "Assign Tenant" shows tenant selection form

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 9. Room Detail
**URL**: `http://localhost:3030/admin/rooms/[id]`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/rooms/[id]` - Get room details
- `GET /api/tenants?roomId=[id]` - Get current tenant (if occupied)

**UI Elements**:
- Breadcrumb: Admin > Rooms > Room [Number]
- Room information display
- "Edit Room" button → Opens edit modal
- Current tenant section (if occupied):
  - Tenant name
  - Lease details
  - "View Tenant Profile" button → `/admin/tenants/[tenantId]`
  - "Create Invoice" button → `/admin/financial/invoices/new?roomId=[id]`
- Payment history for this room
- Maintenance requests for this room
- Assets assigned to this room

**Expected Behavior**:
- Room details display correctly
- Tenant info shows if occupied
- "Edit Room" opens modal
- "View Tenant Profile" redirects correctly
- "Create Invoice" redirects with pre-filled room
- Lists show relevant data

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 10. Tenants List
**URL**: `http://localhost:3030/admin/tenants`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/tenants` - List all tenants

**UI Elements**:
- "Add Tenant" button → `/admin/tenants/new` or opens modal
- Tenant stats (Active, Total, etc.)
- Filter/search:
  - Search by name/email
  - Filter by status (Active/Inactive)
- Tenant cards/table with:
  - Tenant name
  - Email
  - Phone
  - Assigned room (if any)
  - Status badge
  - "View Profile" button → `/admin/tenants/[id]`
  - "Edit" button → Opens edit modal

**Expected Behavior**:
- Tenants display correctly
- Stats calculate correctly
- Search filters the list
- Status filter works
- "Add Tenant" redirects or opens form
- "View Profile" redirects correctly
- "Edit" opens pre-filled modal

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 11. Tenant Detail
**URL**: `http://localhost:3030/admin/tenants/[id]`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/tenants/[id]` - Get tenant details
- `GET /api/payments?tenantId=[id]` - Get tenant's payments
- `GET /api/invoices?tenantId=[id]` - Get tenant's invoices

**UI Elements**:
- Breadcrumb: Admin > Tenants > [Tenant Name]
- Tenant profile information
- "Edit Tenant" button → Opens edit modal
- "Add Payment" button → `/admin/financial/payments/new?tenantId=[id]`
- Tabs: Overview, Payments, Invoices, Documents
- Current assignment section:
  - Building name
  - Room number
  - Lease details
  - "View Room" button → `/admin/rooms/[roomId]`
- Payment history table
- Invoices list

**Expected Behavior**:
- Tenant details display correctly
- Tabs switch content
- "Edit Tenant" opens modal
- "Add Payment" redirects with pre-filled tenant
- Payment history shows with correct currency (₱)
- "View Room" redirects correctly
- All amounts show in PHP (₱), not NaN

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 12. Payments List
**URL**: `http://localhost:3030/admin/financial/payments`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/payments` - List all payments

**UI Elements**:
- "Record Payment" button → `/admin/financial/payments/new`
- Payment stats (Total Collected, This Month, etc.)
- Filter options:
  - Date range picker
  - Payment type filter
  - Building/Tenant filter
- Payments table with:
  - Date
  - Tenant name
  - Amount (₱)
  - Payment type
  - Payment method
  - Status
  - "View Details" button → `/admin/financial/payments/[id]`

**Expected Behavior**:
- Payments display in table
- Stats calculate correctly in PHP (₱)
- Filters update the table
- Date picker works
- "Record Payment" redirects to form
- "View Details" redirects correctly
- All amounts in PHP (₱), not NaN

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 13. Record Payment (New)
**URL**: `http://localhost:3030/admin/financial/payments/new`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/tenants` - For tenant dropdown
- `GET /api/rooms` - For room dropdown
- `POST /api/payments` - Create payment (on submit)

**UI Elements**:
- Payment form with:
  - Tenant dropdown (searchable)
  - Room dropdown (filtered by tenant)
  - Amount input (₱)
  - Payment type dropdown (Rent, Deposit, Utility, etc.)
  - Payment method dropdown (Cash, Bank Transfer, etc.)
  - Payment date picker
  - Reference number input
  - Notes textarea
- "Save Payment" button → Redirects to payments list on success
- "Cancel" button → Back to payments list

**Expected Behavior**:
- Form displays correctly
- Tenant dropdown populates
- Room dropdown filters based on tenant
- Amount accepts numbers only
- Currency symbol shows ₱
- Date picker works
- Validation shows for required fields
- Save redirects to payments list with success toast
- Cancel goes back without saving

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 14. Payment Detail
**URL**: `http://localhost:3030/admin/financial/payments/[id]`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/payments/[id]` - Get payment details

**UI Elements**:
- Breadcrumb: Admin > Financial > Payments > [Payment ID]
- Payment information display:
  - Tenant name (clickable → tenant profile)
  - Room number (clickable → room detail)
  - Amount (₱)
  - Date
  - Payment type
  - Payment method
  - Reference number
  - Status
- "Edit Payment" button → Opens edit modal
- "Print Receipt" button → Generates receipt
- "Delete Payment" button → Confirmation, deletes payment

**Expected Behavior**:
- Payment details display correctly
- Amount shows in PHP (₱)
- Links to tenant/room work
- "Edit Payment" opens pre-filled modal
- "Print Receipt" generates PDF or preview
- "Delete Payment" shows confirmation

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 15. Invoices List
**URL**: `http://localhost:3030/admin/financial/invoices`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/invoices` - List all invoices

**UI Elements**:
- "Create Invoice" button → `/admin/financial/invoices/new`
- Invoice stats (Total Invoiced, Paid, Unpaid, Overdue)
- Filter options:
  - Status filter (All, Paid, Unpaid, Overdue)
  - Date range
  - Tenant filter
- Invoices table with:
  - Invoice number
  - Tenant name
  - Issue date
  - Due date
  - Amount (₱)
  - Status badge
  - "View" button → `/admin/financial/invoices/[id]`
  - "Send" button → Email invoice to tenant

**Expected Behavior**:
- Invoices display in table
- Stats calculate correctly in PHP (₱)
- Filters work
- Status badges show correct colors
- "Create Invoice" redirects to form
- "View" redirects to detail page
- "Send" shows confirmation

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 16. Create Invoice (New)
**URL**: `http://localhost:3030/admin/financial/invoices/new`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/tenants` - For tenant dropdown
- `GET /api/rooms` - For room dropdown
- `POST /api/invoices` - Create invoice (on submit)

**UI Elements**:
- Invoice form with:
  - Tenant dropdown
  - Room dropdown (auto-filled if from room page)
  - Issue date picker
  - Due date picker
  - Line items section:
    - Description input
    - Quantity input
    - Unit price input (₱)
    - Amount (auto-calculated)
    - "Add Line Item" button
    - "Remove" button for each item
  - Subtotal (auto-calculated, ₱)
  - Tax percentage input
  - Tax amount (auto-calculated, ₱)
  - Total (auto-calculated, ₱)
  - Notes textarea
- "Create Invoice" button → Redirects to invoice detail on success
- "Cancel" button → Back to invoices list

**Expected Behavior**:
- Form displays correctly
- Tenant/room dropdowns populate
- If `?roomId=X&tenantId=Y` in URL, pre-fill those fields
- Line items can be added/removed
- Calculations update automatically
- All amounts show in PHP (₱)
- Validation works
- Save creates invoice and redirects
- Cancel goes back without saving

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 17. Invoice Detail
**URL**: `http://localhost:3030/admin/financial/invoices/[id]`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/invoices/[id]` - Get invoice details

**UI Elements**:
- Breadcrumb: Admin > Financial > Invoices > [Invoice Number]
- Invoice display (styled like a real invoice):
  - Invoice number
  - Issue date
  - Due date
  - Tenant details
  - Line items table
  - Subtotal, Tax, Total (₱)
  - Payment status
- Action buttons:
  - "Edit Invoice" button → Opens edit modal
  - "Send to Tenant" button → Email invoice
  - "Download PDF" button → Generate PDF
  - "Mark as Paid" button → Update status
  - "Record Payment" button → `/admin/financial/payments/new?invoiceId=[id]`
  - "Delete Invoice" button → Confirmation, deletes

**Expected Behavior**:
- Invoice displays in professional format
- All amounts show in PHP (₱)
- Status badge shows correct color
- "Edit" opens pre-filled modal
- "Send" shows confirmation
- "Download PDF" generates file
- "Mark as Paid" updates status
- "Record Payment" pre-fills invoice info

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 18. Expenses List
**URL**: `http://localhost:3030/admin/financial/expenses`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/expenses` - List all expenses

**UI Elements**:
- "Add Expense" button → Opens modal or redirects
- Expense stats (Total Expenses, This Month, By Category)
- Filter options:
  - Date range
  - Category filter
  - Building filter
- Expenses table with:
  - Date
  - Description
  - Category
  - Building/Room (if applicable)
  - Amount (₱)
  - Vendor
  - "View" button → `/admin/financial/expenses/[id]`
  - "Edit" button → Opens edit modal
  - "Delete" button → Confirmation

**Expected Behavior**:
- Expenses display in table
- Stats calculate correctly in PHP (₱)
- Filters work
- "Add Expense" opens form
- "View" redirects to detail page
- "Edit" opens pre-filled modal
- "Delete" shows confirmation

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 19. Expense Detail
**URL**: `http://localhost:3030/admin/financial/expenses/[id]`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/expenses/[id]` - Get expense details

**UI Elements**:
- Breadcrumb: Admin > Financial > Expenses > [Expense ID]
- Expense information:
  - Date
  - Description
  - Category
  - Amount (₱)
  - Vendor
  - Building/Room
  - Payment method
  - Receipt/attachment
- Action buttons:
  - "Edit Expense" button
  - "Delete Expense" button

**Expected Behavior**:
- Expense details display correctly
- Amount shows in PHP (₱)
- Receipt/attachment shows if uploaded
- "Edit" opens pre-filled modal
- "Delete" shows confirmation

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 20. Financial Reports
**URL**: `http://localhost:3030/admin/financial/reports`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/reports/revenue` - Revenue report
- `GET /api/reports/expenses` - Expense report
- `GET /api/reports/rent-roll` - Rent roll
- `GET /api/reports/profit-loss` - P&L statement

**UI Elements**:
- Report type selector/tabs:
  - Revenue Report
  - Expense Report
  - Rent Roll
  - Profit & Loss
- Filter options:
  - Date range picker
  - Building filter
- Report display area with tables/charts
- "Export to PDF" button
- "Export to Excel" button

**Expected Behavior**:
- Page loads without errors
- Report tabs/selector works
- Default report displays
- Filters update report data
- All amounts show in PHP (₱)
- Export buttons work (or show "coming soon")
- Charts render if applicable

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 21. Analytics Dashboard
**URL**: `http://localhost:3030/admin/analytics`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/analytics` - All analytics data

**UI Elements**:
- Date range selector
- 8 Chart sections:
  1. Revenue Trend (line/bar chart)
  2. Expense Breakdown (pie chart)
  3. Occupancy Trend (line chart)
  4. Payment Status (donut chart)
  5. Tenant Distribution (bar chart)
  6. Financial Summary (multi-line chart)
  7. Maintenance Stats (bar chart)
  8. Asset Utilization (horizontal bar chart)
- Each chart has:
  - Title
  - Chart canvas
  - Legend
  - Data summary

**Expected Behavior**:
- Page loads without errors
- All 8 charts render
- Data displays correctly
- Date range selector updates charts
- All currency amounts in PHP (₱)
- No "Loading..." stuck states
- Charts are interactive (hover shows details)

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 22. Maintenance Requests List
**URL**: `http://localhost:3030/admin/maintenance`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/maintenance` - List all maintenance requests

**UI Elements**:
- "Add Request" button → Opens modal (admin can create on behalf)
- Maintenance stats (Open, In Progress, Completed)
- Filter options:
  - Status filter
  - Priority filter
  - Building filter
  - Category filter
- Requests table with:
  - Title
  - Category
  - Priority badge
  - Status badge
  - Tenant name
  - Room number
  - Date submitted
  - "View Details" button → `/admin/maintenance/[id]`

**Expected Behavior**:
- Requests display in table
- Stats calculate correctly
- Filters work
- Status/priority badges show correct colors
- "Add Request" opens form
- "View Details" redirects correctly

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 23. Maintenance Request Detail
**URL**: `http://localhost:3030/admin/maintenance/[id]`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/maintenance/[id]` - Get request details
- `PUT /api/maintenance/[id]` - Update request (on status change)

**UI Elements**:
- Breadcrumb: Admin > Maintenance > [Request ID]
- Request information:
  - Title
  - Description
  - Category
  - Priority
  - Status
  - Tenant (clickable → tenant profile)
  - Room (clickable → room detail)
  - Date submitted
- Update section:
  - Status dropdown (Open, In Progress, Completed, Cancelled)
  - Priority dropdown
  - Assigned to dropdown (staff)
  - Scheduled date picker
  - Notes textarea
  - "Update Status" button
- Updates history
- "Record Cost" button → Links to expenses

**Expected Behavior**:
- Request details display correctly
- Status dropdown shows current status
- Links to tenant/room work
- "Update Status" saves changes and shows toast
- Updates history displays
- "Record Cost" redirects to expense form

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 24. Utilities List
**URL**: `http://localhost:3030/admin/utilities`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/utilities` - List all utility bills

**UI Elements**:
- "Add Utility Bill" button → Opens modal
- Utility stats (Total Bills, Total Amount, By Type)
- Filter options:
  - Utility type filter (Electricity, Water, Gas, etc.)
  - Building filter
  - Date range
- Utilities table with:
  - Billing period
  - Building name
  - Utility type
  - Provider
  - Amount (₱)
  - Due date
  - Status
  - "View" button → `/admin/utilities/[id]`
  - "Edit" button
  - "Pay" button

**Expected Behavior**:
- Utilities display in table
- Stats calculate correctly in PHP (₱)
- Filters work
- "Add Utility Bill" opens form
- "View" redirects to detail page
- "Edit" opens pre-filled modal
- "Pay" updates status

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 25. Utility Detail
**URL**: `http://localhost:3030/admin/utilities/[id]`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/utilities/[id]` - Get utility details

**UI Elements**:
- Breadcrumb: Admin > Utilities > [Utility ID]
- Utility information:
  - Billing period
  - Building
  - Utility type
  - Provider
  - Account number
  - Amount (₱)
  - Due date
  - Status
  - Meter readings (if applicable)
- Action buttons:
  - "Edit" button
  - "Mark as Paid" button
  - "Delete" button

**Expected Behavior**:
- Utility details display correctly
- Amount shows in PHP (₱)
- "Edit" opens pre-filled modal
- "Mark as Paid" updates status
- "Delete" shows confirmation

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 26. Assets List
**URL**: `http://localhost:3030/admin/assets`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/assets` - List all assets

**UI Elements**:
- "Add Asset" button → Opens modal
- Asset stats (Total Assets, By Category, Utilization)
- Filter options:
  - Category filter
  - Status filter (Available, In Use, Maintenance)
  - Building filter
- Assets table/cards with:
  - Asset name
  - Category
  - Condition
  - Status
  - Assigned to (building/room)
  - Purchase date
  - Value (₱)
  - "View" button → `/admin/assets/[id]`
  - "Edit" button
  - "Assign" button

**Expected Behavior**:
- Assets display in table/cards
- Stats calculate correctly
- Filters work
- "Add Asset" opens form
- "View" redirects to detail page
- "Edit" opens pre-filled modal
- "Assign" shows assignment form

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 27. Asset Detail
**URL**: `http://localhost:3030/admin/assets/[id]`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/assets/[id]` - Get asset details

**UI Elements**:
- Breadcrumb: Admin > Assets > [Asset Name]
- Asset information:
  - Name
  - Category
  - Condition
  - Status
  - Purchase date
  - Value (₱)
  - Warranty expiry
  - Current assignment (if any)
- Assignment history
- Maintenance history
- Action buttons:
  - "Edit Asset" button
  - "Assign to Room" button
  - "Remove Assignment" button
  - "Delete Asset" button

**Expected Behavior**:
- Asset details display correctly
- Value shows in PHP (₱)
- Assignment history shows
- "Edit" opens pre-filled modal
- "Assign to Room" shows room selection
- "Remove Assignment" unassigns asset
- "Delete" shows confirmation

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 28. Reports Page
**URL**: `http://localhost:3030/admin/reports`

**Page Load**: ⏳ PENDING

**APIs Called**:
- Varies based on selected report

**UI Elements**:
- Report cards/buttons:
  - Revenue Report → `/admin/financial/reports?type=revenue`
  - Expense Report → `/admin/financial/reports?type=expenses`
  - Rent Roll → `/admin/financial/reports?type=rent-roll`
  - Profit & Loss → `/admin/financial/reports?type=profit-loss`
  - Occupancy Report
  - Maintenance Report
  - Tenant Report
  - Custom Report Builder

**Expected Behavior**:
- Page loads without errors
- Report cards/buttons display
- Clicking each redirects to correct report
- All links work

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

## 👤 TENANT PORTAL

### 29. Tenant Dashboard
**URL**: `http://localhost:3030/tenant`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/tenant/dashboard` - Dashboard data

**UI Elements**:
- Welcome message with tenant name
- Current unit information card:
  - Building name
  - Room number
  - Lease start/end date
- Quick stats:
  - Next payment due
  - Outstanding balance (₱)
  - Active maintenance requests
- Quick action buttons:
  - "Make Payment" → `/tenant/payments`
  - "View Documents" → `/tenant/documents`
  - "Submit Maintenance Request" → `/tenant/maintenance`
- Recent activity

**Expected Behavior**:
- Dashboard loads without errors
- Current unit info displays
- Stats show correct values (not NaN)
- Currency shows PHP (₱)
- Quick action buttons redirect correctly
- Recent activity displays if data exists

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 30. Tenant Payments
**URL**: `http://localhost:3030/tenant/payments`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/tenant/payments` - Get tenant's payment history

**UI Elements**:
- Payment summary cards:
  - Total Paid (₱)
  - Outstanding Balance (₱)
  - Next Payment Due (date and amount)
- Recent payments table:
  - Date
  - Description
  - Amount (₱)
  - Payment method
  - Status
- "View All Payments" button (if paginated)
- Payment instructions/info

**Expected Behavior**:
- Page loads without errors
- Summary cards show correct amounts in PHP (₱), not NaN
- Payment table displays history
- All amounts formatted correctly
- No console errors

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 31. Tenant Documents
**URL**: `http://localhost:3030/tenant/documents`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/tenant/documents` - Get tenant's documents

**UI Elements**:
- Documents list/grid:
  - Lease Agreement
  - Payment Receipts
  - Property Rules
  - Other documents
- Each document with:
  - Document name
  - Type
  - Date uploaded
  - "View" button → Opens/downloads document
  - "Download" button

**Expected Behavior**:
- Page loads without errors
- Documents display in list/grid
- "View" opens document in new tab or modal
- "Download" downloads the file
- Empty state shows if no documents

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

### 32. Tenant Maintenance
**URL**: `http://localhost:3030/tenant/maintenance`

**Page Load**: ⏳ PENDING

**APIs Called**:
- `GET /api/tenant/maintenance` - Get tenant's maintenance requests
- `POST /api/tenant/maintenance` - Submit new request

**UI Elements**:
- "Submit New Request" button → Opens form/modal
- Request stats:
  - Active requests
  - Total requests
- Requests list with:
  - Title
  - Category
  - Priority
  - Status badge
  - Date submitted
  - Last update
  - "View Details" button (expand or modal)
- New request form (modal or section):
  - Title input
  - Description textarea
  - Category dropdown
  - Priority dropdown
  - "Submit" button
  - "Cancel" button

**Expected Behavior**:
- Page loads without errors
- Stats show correct numbers
- Requests list displays tenant's requests
- "Submit New Request" opens form
- Form submission works
- Success toast shows after submission
- List refreshes with new request

**Test Results**: ⏳ PENDING

**Issues Found**: None yet

---

## 📝 SUMMARY

### Total Pages to Test: 32

**Breakdown**:
- Public Pages: 1
- Authentication Pages: 3
- Admin Portal Pages: 24
- Tenant Portal Pages: 4

### Test Progress: 0/32 (0%)

**Status**:
- ✅ PASS: 0
- ⚠️ WARNING: 0
- ❌ FAIL: 0
- ⏳ PENDING: 32

---

## 🔄 Next Steps

1. Start automated testing of API endpoints
2. Manually navigate through each page
3. Test all buttons and interactions
4. Document results in this file
5. Fix any issues found
6. Re-test failed items
7. Mark complete when all pass

---

**Test Started**: ⏳ PENDING  
**Test Completed**: ⏳ PENDING  
**Total Time**: ⏳ PENDING

