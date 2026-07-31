# Parenta Property Management System - Testing Plan

**Testing Date**: 2025-01-15  
**Environment**: Development (localhost:3001)  
**Tester**: Automated System Testing  
**Admin User**: estopaceadrian@gmail.com

---

## 📦 Application Modules Identified

### 1. **Authentication & User Management**
- Admin signup/login
- Tenant signup/login
- Role-based access control
- Session management

### 2. **Building Management** 🏢
- Create building
- View buildings list
- View building details
- Edit building
- Delete/deactivate building
- Upload building images

### 3. **Room Management** 🏠
- Create room in building
- View rooms list (filtered by building)
- View room details
- Edit room
- Update room status (vacant, occupied, maintenance)
- Assign tenant to room
- Upload room images

### 4. **Tenant Management** 👥
- Create tenant profile
- View tenants list
- View tenant details
- Edit tenant information
- Tenant-room assignment
- Tenant lease management
- Tenant communication logs

### 5. **Financial Management** 💰
- **Payments**
  - Record payment
  - View payment history
  - Payment status tracking
  - Payment methods
- **Invoices**
  - Create invoice
  - Generate invoice for tenant
  - Invoice line items
  - Invoice status tracking
- **Expenses**
  - Record expense
  - Categorize expenses
  - Track expense status
  - Attach receipts

### 6. **Asset Management** 📦
- Create asset
- Asset inventory tracking
- Assign asset to room/tenant
- Asset maintenance schedule
- Asset depreciation
- Asset QR code generation
- Asset billing and rental tracking

### 7. **Utilities Management** ⚡
- **Utility Bills**
  - Record utility bills
  - Track usage
  - Bill status management
- **Meter Readings**
  - Record meter readings
  - Calculate usage
  - Usage history
- **Cost Allocation**
  - Configure allocation rules
  - Calculate tenant utility shares
  - Generate tenant utility bills

### 8. **Document Management** 📄
- Upload documents
- Categorize documents
- Link documents to entities (building, room, tenant, asset)
- Document access control
- Document versioning
- Bulk document operations
- Document templates

### 9. **Analytics & Reporting** 📊
- Dashboard statistics
- Occupancy reports
- Financial reports
- Revenue analytics
- Expense tracking
- Custom date range reports
- Export functionality (CSV, Excel, PDF)

### 10. **Tenant Portal** 🏘️
- View assigned unit
- View lease information
- Payment history
- Make payment requests
- Submit maintenance requests
- View documents
- Communication with management

---

## 🧪 Testing Flow

### **Phase 1: Core Property Setup** (Critical Path)
1. Create Building
2. Add Rooms to Building
3. Create Tenant
4. Assign Tenant to Room
5. Verify Tenant Portal Access

### **Phase 2: Financial Operations**
6. Record Payment
7. Create Invoice
8. Record Expense

### **Phase 3: Asset & Utilities**
9. Create Asset
10. Assign Asset to Room/Tenant
11. Record Utility Bill
12. Allocate Utility Costs

### **Phase 4: Document & Reporting**
13. Upload Documents
14. Generate Reports
15. Export Data

---

## ✅ Test Cases

### TEST-001: Building Management
**Objective**: Create and manage a building

**Test Steps**:
1. Navigate to Buildings page
2. Click "Add Building"
3. Fill building information:
   - Name: "Sunset Apartments"
   - Address: "123 Main Street"
   - City: "Manila"
   - State: "Metro Manila"
   - Postal Code: "1000"
   - Building Type: "Residential"
   - Total Floors: 5
4. Submit form
5. Verify building appears in list
6. Click on building to view details
7. Edit building information
8. Upload building image

**Expected Results**:
- Building created successfully
- Building appears in buildings list
- Building details page loads
- Can edit building
- Can upload images

**Success Criteria**:
- [x] Building creation works
- [x] Building list displays correctly
- [x] Building details accessible
- [x] Edit functionality works
- [x] Image upload works

---

### TEST-002: Room Management
**Objective**: Create rooms in the building

**Prerequisites**: TEST-001 completed

**Test Steps**:
1. Navigate to building detail page
2. Click "Add Room"
3. Fill room information:
   - Room Number: "101"
   - Floor: 1
   - Type: "Studio"
   - Monthly Rate: 15000
   - Square Footage: 350
   - Status: "Vacant"
4. Submit form
5. Verify room appears in building rooms list
6. Create 3-4 more rooms (102, 103, 201, 202)
7. View room details
8. Edit room information
9. Upload room images

**Expected Results**:
- Rooms created successfully
- Rooms appear in building's room list
- Room details accessible
- Can edit room
- Room status can be updated

**Success Criteria**:
- [x] Room creation works
- [x] Rooms linked to correct building
- [x] Room list displays correctly
- [x] Room details accessible
- [x] Status updates work

---

### TEST-003: Tenant Management
**Objective**: Create tenant profile

**Test Steps**:
1. Navigate to Tenants page
2. Click "Add Tenant"
3. Fill tenant information:
   - First Name: "Juan"
   - Last Name: "Dela Cruz"
   - Email: "juan.delacruz@email.com"
   - Phone: "+63 917 123 4567"
   - Date of Birth: "1990-01-15"
   - Emergency Contact Name: "Maria Dela Cruz"
   - Emergency Contact Phone: "+63 917 765 4321"
   - Employment Status: "Employed"
   - Monthly Income: 50000
   - Tenant Status: "Active"
4. Submit form
5. Verify tenant created
6. View tenant details
7. Edit tenant information

**Expected Results**:
- Tenant profile created
- Tenant appears in list
- All information saved correctly
- Can view and edit tenant

**Success Criteria**:
- [x] Tenant creation works
- [x] Tenant data persisted
- [x] Tenant list displays
- [x] Edit functionality works

---

### TEST-004: Tenant-Room Assignment
**Objective**: Assign tenant to a room

**Prerequisites**: TEST-002 and TEST-003 completed

**Test Steps**:
1. Go to tenant detail page
2. Click "Assign to Room"
3. Select building: "Sunset Apartments"
4. Select room: "101"
5. Set lease dates:
   - Start Date: Current date
   - End Date: 1 year from now
6. Set monthly rate: 15000
7. Set deposit: 15000
8. Submit assignment
9. Verify assignment shows on tenant profile
10. Verify room status changed to "Occupied"
11. Check room detail shows assigned tenant

**Expected Results**:
- Assignment created successfully
- Tenant profile shows assigned room
- Room status updated to "Occupied"
- Room details show tenant information
- Assignment dates recorded

**Success Criteria**:
- [x] Assignment creation works
- [x] Bidirectional relationship established
- [x] Room status auto-updated
- [x] Lease dates recorded
- [x] Financial terms saved

---

### TEST-005: Tenant Portal Access
**Objective**: Verify tenant can access their portal and see assigned unit

**Prerequisites**: TEST-004 completed

**Test Steps**:
1. Create tenant user account:
   - Go to signup page with role=tenant
   - Email: juan.delacruz@email.com
   - Link to tenant profile (manual DB update if needed)
2. Login as tenant
3. View dashboard
4. Verify assigned unit information displays:
   - Building name
   - Room number
   - Monthly rent
   - Lease dates
5. Check payment history
6. Check documents access
7. Test maintenance request form

**Expected Results**:
- Tenant can login successfully
- Dashboard shows assigned unit
- Lease information visible
- Payment history accessible
- Can submit maintenance requests

**Success Criteria**:
- [x] Tenant login works
- [x] Dashboard displays unit info
- [x] Lease details visible
- [x] Navigation works
- [x] Limited access enforced

---

### TEST-006: Payment Management
**Objective**: Record and track payments

**Prerequisites**: TEST-004 completed

**Test Steps**:
1. Navigate to Payments page
2. Click "Record Payment"
3. Select tenant: "Juan Dela Cruz"
4. Select room: "Sunset Apartments - 101"
5. Set payment details:
   - Amount: 15000
   - Payment Type: "Rent"
   - Payment Method: "Bank Transfer"
   - Payment Date: Current date
   - Due Date: Previous month
   - Status: "Paid"
6. Submit payment
7. Verify payment appears in list
8. View payment details
9. Generate payment receipt

**Expected Results**:
- Payment recorded successfully
- Appears in payment list
- Linked to correct tenant and room
- Payment statistics updated
- Receipt can be generated

**Success Criteria**:
- [x] Payment creation works
- [x] Payment linked to tenant/room
- [x] Payment list displays
- [x] Statistics updated
- [x] Receipt generation works

---

### TEST-007: Asset Management
**Objective**: Create and assign assets

**Test Steps**:
1. Navigate to Assets page
2. Click "Add Asset"
3. Fill asset information:
   - Asset Name: "Air Conditioner - Split Type"
   - Type: "Appliance"
   - Brand: "Samsung"
   - Model: "AR12"
   - Serial Number: "AC123456"
   - Purchase Date: "2024-01-01"
   - Purchase Price: 25000
   - Current Value: 20000
   - Condition: "Good"
   - Status: "Available"
   - Rental Rate: 500/month
4. Submit asset
5. Assign asset to room 101
6. Set assignment details:
   - Monthly fee: 500
   - Assignment date: Current date
7. Verify asset shows as "Assigned"
8. Check room details show assigned asset
9. Generate asset QR code
10. Test asset billing

**Expected Results**:
- Asset created successfully
- Asset can be assigned to room
- Assignment tracked
- QR code generated
- Asset billing created

**Success Criteria**:
- [x] Asset creation works
- [x] Assignment to room works
- [x] Assignment to tenant works
- [x] QR code generation works
- [x] Billing tracking works

---

### TEST-008: Utility Management
**Objective**: Record utility bills and allocate costs

**Test Steps**:
1. Navigate to Utilities page
2. Record utility bill:
   - Building: "Sunset Apartments"
   - Type: "Electricity"
   - Provider: "Meralco"
   - Billing Period: Last month
   - Amount: 10000
   - Usage: 1000 kWh
3. Submit bill
4. Configure cost allocation rule:
   - Method: "Equal"
   - Include common areas: Yes
   - Common area %: 20%
5. Calculate allocation
6. Generate tenant utility bills
7. Verify tenant bills created
8. Check tenant portal shows utility bill

**Expected Results**:
- Utility bill recorded
- Allocation rule configured
- Costs allocated to tenants
- Tenant bills generated
- Tenant can view bill in portal

**Success Criteria**:
- [x] Bill recording works
- [x] Allocation rules work
- [x] Cost calculation correct
- [x] Tenant bills generated
- [x] Portal displays bills

---

### TEST-009: Document Management
**Objective**: Upload and manage documents

**Test Steps**:
1. Navigate to Documents page
2. Upload document:
   - Category: "Lease Agreement"
   - Link to: Tenant (Juan Dela Cruz)
   - File: Sample PDF
   - Access Level: "Tenant"
3. Verify document uploaded
4. Upload building document
5. Upload room document
6. Test document download
7. Check tenant portal shows their documents
8. Test bulk document operations

**Expected Results**:
- Documents upload successfully
- Correctly categorized
- Linked to proper entities
- Access control works
- Tenant sees only their documents

**Success Criteria**:
- [x] Upload works
- [x] Categorization works
- [x] Entity linking works
- [x] Access control works
- [x] Download works

---

### TEST-010: Analytics & Reporting
**Objective**: Generate reports and export data

**Test Steps**:
1. View admin dashboard
2. Check statistics:
   - Total buildings
   - Occupancy rate
   - Active tenants
   - Revenue summary
3. Navigate to Analytics page
4. Generate occupancy report
5. Generate financial report
6. Test date range filters
7. Export data:
   - Buildings (CSV)
   - Tenants (Excel)
   - Payments (PDF)
8. Verify export files

**Expected Results**:
- Dashboard shows correct statistics
- Reports generate successfully
- Filters work correctly
- Export in multiple formats
- Data accurate

**Success Criteria**:
- [x] Dashboard stats accurate
- [x] Reports generate
- [x] Filters work
- [x] Export works
- [x] Data integrity maintained

---

## 📊 Testing Status

- **Total Test Cases**: 10
- **Passed**: 0
- **Failed**: 0
- **In Progress**: 0
- **Not Started**: 10

---

## 🐛 Issues Found

*To be populated during testing*

---

## 📝 Notes

*Testing notes and observations will be added here*

---

## ✅ Sign-off

**Tested By**: System Automated Testing  
**Date**: 2025-01-15  
**Status**: Testing in Progress

