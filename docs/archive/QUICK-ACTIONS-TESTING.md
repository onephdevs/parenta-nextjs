# Quick Actions - Comprehensive Testing Plan

**Testing Date**: 2025-10-28  
**Environment**: Development (localhost:3001)  
**Admin User**: estopaceadrian@gmail.com

---

## 📋 Quick Actions Overview

This document covers systematic testing for ALL Quick Actions modules visible in the admin dashboard.

```
Quick Actions Panel:
┌─────────────────────────────────────────────────────────────┐
│ 1. Manage Buildings       2. Manage Rooms                   │
│ 3. Manage Tenants         4. Financial Management           │
│ 5. Financial Reports      6. Utilities Management           │
│ 7. Asset Management       8. Analytics & Reports            │
│ 9. Document Templates    10. Advanced Export                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Methodology

For each module, we will:
1. **Access Test**: Verify module loads and is accessible
2. **CRUD Operations**: Test Create, Read, Update, Delete
3. **Data Flow**: Verify data propagates correctly
4. **Integration**: Test connections with related modules
5. **UI/UX**: Verify user experience and error handling

---

## 1️⃣ MANAGE BUILDINGS

### Module Information
- **Route**: `/admin/buildings`
- **API Endpoints**: 
  - `GET /api/buildings` - List all buildings
  - `POST /api/buildings` - Create building
  - `GET /api/buildings/[id]` - Get building details
  - `PUT /api/buildings/[id]` - Update building
  - `DELETE /api/buildings/[id]` - Delete building

### Test Cases

#### TC-BUILD-001: Access Building Management
**Steps**:
1. Navigate to `/admin/buildings`
2. Verify page loads
3. Check buildings list displays

**Expected**:
- Page loads without errors
- Buildings table/grid visible
- "Add Building" button present

**Status**: ✅ PASS (Building "Sunset Apartments" visible)

---

#### TC-BUILD-002: Create New Building
**Steps**:
1. Click "Add Building" button
2. Fill building form:
   - Name: "Greenfield Residences"
   - Address: "456 Oak Avenue, Makati"
   - Type: "Residential"
   - Floors: 10
   - Amenities: Pool, Gym, Parking
3. Submit form

**Expected**:
- Building created successfully
- Toast notification appears
- Redirects to building detail page
- Building appears in list

**API Test**:
```bash
curl -X POST http://localhost:3001/api/buildings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Greenfield Residences",
    "addressLine1": "456 Oak Avenue",
    "city": "Makati",
    "state": "Metro Manila",
    "postalCode": "1200",
    "country": "Philippines",
    "buildingType": "residential",
    "totalFloors": 10,
    "amenities": ["Pool", "Gym", "Parking", "Security"]
  }'
```

**Status**: ✅ PASS

---

#### TC-BUILD-003: View Building Details
**Steps**:
1. Click on "Sunset Apartments" in building list
2. Verify detail page loads
3. Check all information displayed

**Expected**:
- Building details visible
- Room list shown
- Occupancy statistics displayed
- Edit/Delete buttons present

**Status**: ⏸️ PENDING

---

#### TC-BUILD-004: Edit Building
**Steps**:
1. Open building detail page
2. Click "Edit" button
3. Modify building information
4. Save changes

**Expected**:
- Edit form pre-populated
- Changes save successfully
- Updated data reflects immediately

**Status**: ⏸️ PENDING

---

#### TC-BUILD-005: Building Statistics
**Steps**:
1. View building detail page
2. Check statistics panel

**Expected**:
- Total rooms count accurate
- Occupied rooms correct
- Vacancy rate calculated
- Revenue metrics shown

**Status**: ⏸️ PENDING

---

## 2️⃣ MANAGE ROOMS

### Module Information
- **Route**: `/admin/rooms`
- **API Endpoints**:
  - `GET /api/rooms` - List all rooms
  - `GET /api/rooms?buildingId=[id]` - Filter by building
  - `POST /api/rooms` - Create room
  - `GET /api/rooms/[id]` - Get room details
  - `PUT /api/rooms/[id]` - Update room
  - `DELETE /api/rooms/[id]` - Delete room
  - `POST /api/rooms/[id]/assign` - Assign tenant

### Test Cases

#### TC-ROOM-001: Access Room Management
**Steps**:
1. Navigate to `/admin/rooms`
2. Verify rooms list loads

**Expected**:
- All rooms displayed
- Filter by building works
- Room status visible

**Status**: ✅ PASS (4 rooms visible)

---

#### TC-ROOM-002: Create New Room
**Steps**:
1. Click "Add Room"
2. Select building
3. Fill room details:
   - Number: "301"
   - Floor: 3
   - Type: "Two Bedroom"
   - Rate: ₱25,000
   - Status: "Vacant"
4. Submit

**Expected**:
- Room created successfully
- Linked to correct building
- Appears in room list

**API Test**:
```bash
curl -X POST http://localhost:3001/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "buildingId": "e33738b9-4cbb-4683-aa5b-e3a711132078",
    "roomNumber": "301",
    "floorNumber": 3,
    "roomType": "two_bedroom",
    "squareFootage": 650,
    "monthlyRate": 25000,
    "depositAmount": 25000,
    "roomStatus": "vacant"
  }'
```

**Status**: ✅ PASS

---

#### TC-ROOM-003: View Room Details
**Steps**:
1. Click on Room 101
2. Verify details page

**Expected**:
- Room information displayed
- Current tenant shown (Juan Dela Cruz)
- Lease details visible
- Assignment history shown

**Status**: ⏸️ PENDING

---

#### TC-ROOM-004: Update Room Status
**Steps**:
1. Edit room
2. Change status to "maintenance"
3. Save

**Expected**:
- Status updates
- Room unavailable for assignment
- Status reflected in lists

**Status**: ⏸️ PENDING

---

## 3️⃣ MANAGE TENANTS

### Module Information
- **Route**: `/admin/tenants`
- **API Endpoints**:
  - `GET /api/tenants` - List tenants
  - `POST /api/tenants` - Create tenant
  - `GET /api/tenants/[id]` - Get tenant details
  - `PUT /api/tenants/[id]` - Update tenant
  - `DELETE /api/tenants/[id]` - Delete tenant

### Test Cases

#### TC-TENANT-001: Access Tenant Management
**Steps**:
1. Navigate to `/admin/tenants`
2. Verify tenant list loads

**Expected**:
- Tenants displayed
- Status filters work
- Search functionality

**Status**: ✅ PASS (Juan Dela Cruz visible)

---

#### TC-TENANT-002: Create New Tenant
**Steps**:
1. Click "Add Tenant"
2. Fill tenant form:
   - Name: "Maria Santos"
   - Email: "maria.santos@email.com"
   - Phone: "+63 917 222 3333"
   - Employment: Employed
   - Income: ₱60,000
3. Submit

**Expected**:
- Tenant profile created
- All fields saved
- Appears in tenant list

**API Test**:
```bash
curl -X POST http://localhost:3001/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Maria",
    "lastName": "Santos",
    "email": "maria.santos@email.com",
    "phone": "+63 917 222 3333",
    "dateOfBirth": "1985-05-20",
    "employmentStatus": "employed",
    "monthlyIncome": 60000,
    "tenantStatus": "pending"
  }'
```

**Status**: ✅ PASS

---

#### TC-TENANT-003: View Tenant Profile
**Steps**:
1. Click on tenant name
2. View complete profile

**Expected**:
- Personal information displayed
- Current assignment shown
- Payment history visible
- Documents listed

**Status**: ⏸️ PENDING

---

#### TC-TENANT-004: Assign Tenant to Room
**Steps**:
1. From tenant profile, click "Assign to Room"
2. Select available room
3. Set lease terms
4. Confirm assignment

**Expected**:
- Assignment created
- Tenant status → "active"
- Room status → "occupied"
- Lease dates recorded

**Status**: ✅ PASS (Juan → Room 101)

---

## 4️⃣ FINANCIAL MANAGEMENT

### Module Information
- **Route**: `/admin/financial`
- **Sub-modules**:
  - Payments
  - Invoices
  - Expenses

### Test Cases

#### TC-FIN-001: Access Financial Module
**Steps**:
1. Navigate to `/admin/financial`
2. Verify financial dashboard loads

**Expected**:
- Overview of finances
- Quick stats visible
- Navigation to sub-modules

**Status**: ⏸️ PENDING

---

#### TC-FIN-002: Record Payment
**Steps**:
1. Go to Payments section
2. Click "Record Payment"
3. Select tenant
4. Enter payment details:
   - Amount: ₱15,000
   - Type: Rent
   - Method: Bank Transfer
   - Date: Current date
5. Submit

**Expected**:
- Payment recorded
- Linked to tenant and room
- Balance updated
- Receipt generated

**API Test**:
```bash
curl -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "d87a4d66-0b1b-4548-8a58-ff8f2c2b8bc7",
    "roomId": "a907dfd9-0230-4072-937d-a3458adfcb98",
    "amount": 15000,
    "paymentType": "rent",
    "paymentMethod": "bank_transfer",
    "paymentDate": "2025-11-01",
    "paymentStatus": "paid"
  }'
```

**Status**: ✅ PASS

---

#### TC-FIN-003: Create Invoice
**Steps**:
1. Navigate to Invoices
2. Click "Create Invoice"
3. Select tenant
4. Add line items:
   - Rent: ₱15,000
   - Utilities: ₱2,000
5. Generate invoice

**Expected**:
- Invoice created
- Sent to tenant
- Tracks payment status
- Can download PDF

**Status**: ⏸️ PENDING (Needs endpoint implementation)

---

#### TC-FIN-004: Record Expense
**Steps**:
1. Go to Expenses
2. Click "Add Expense"
3. Fill details:
   - Category: Maintenance
   - Amount: ₱5,000
   - Description: "AC repair Room 101"
   - Date: Current date
4. Submit

**Expected**:
- Expense recorded
- Categorized correctly
- Can attach receipt
- Reflected in reports

**Status**: ⏸️ PENDING (Needs endpoint implementation)

---

## 5️⃣ FINANCIAL REPORTS

### Module Information
- **Route**: `/admin/financial/reports`
- **Report Types**:
  - Revenue reports
  - Expense reports
  - Profit & Loss
  - Cash flow
  - Rent roll

### Test Cases

#### TC-REP-001: Access Reports Module
**Steps**:
1. Navigate to `/admin/financial/reports`
2. Verify reports dashboard

**Expected**:
- List of available reports
- Date range filters
- Export options

**Status**: ⏸️ PENDING

---

#### TC-REP-002: Generate Revenue Report
**Steps**:
1. Select "Revenue Report"
2. Choose date range (Last month)
3. Generate report

**Expected**:
- Report displays:
  - Total revenue
  - By property
  - By payment type
  - Trends

**Status**: ⏸️ PENDING

---

#### TC-REP-003: Export Report
**Steps**:
1. Generate any report
2. Click "Export"
3. Select format (PDF/Excel)
4. Download

**Expected**:
- File downloads successfully
- Contains accurate data
- Properly formatted

**Status**: ⏸️ PENDING

---

## 6️⃣ UTILITIES MANAGEMENT

### Module Information
- **Route**: `/admin/utilities`
- **Features**:
  - Utility bills
  - Meter readings
  - Cost allocation
  - Tenant billing

### Test Cases

#### TC-UTIL-001: Access Utilities Module
**Steps**:
1. Navigate to `/admin/utilities`
2. Verify utilities dashboard

**Expected**:
- Utility bills list
- Meter readings section
- Cost allocation rules

**Status**: ⏸️ PENDING

---

#### TC-UTIL-002: Record Utility Bill
**Steps**:
1. Click "Add Utility Bill"
2. Fill details:
   - Type: Electricity
   - Provider: Meralco
   - Amount: ₱12,000
   - Usage: 1200 kWh
   - Period: October 2025
   - Building: Sunset Apartments
3. Submit

**Expected**:
- Bill recorded
- Ready for allocation
- Usage tracked

**API Test**:
```bash
curl -X POST http://localhost:3001/api/utility-bills \
  -H "Content-Type: application/json" \
  -d '{
    "buildingId": "e33738b9-4cbb-4683-aa5b-e3a711132078",
    "utilityType": "electricity",
    "provider": "Meralco",
    "billingPeriodStart": "2025-10-01",
    "billingPeriodEnd": "2025-10-31",
    "amountDue": 12000,
    "usage": 1200,
    "usageUnit": "kWh",
    "billStatus": "paid"
  }'
```

**Status**: ⏸️ PENDING (Needs endpoint check)

---

#### TC-UTIL-003: Allocate Utility Costs
**Steps**:
1. Select utility bill
2. Click "Allocate Costs"
3. Choose allocation method:
   - Equal split
   - By square footage
   - By meter reading
4. Calculate

**Expected**:
- Costs distributed to tenants
- Tenant bills generated
- Common area costs allocated

**Status**: ⏸️ PENDING

---

## 7️⃣ ASSET MANAGEMENT

### Module Information
- **Route**: `/admin/assets`
- **Features**:
  - Asset inventory
  - Asset assignments
  - Asset billing
  - Maintenance tracking

### Test Cases

#### TC-ASSET-001: Access Asset Module
**Steps**:
1. Navigate to `/admin/assets`
2. Verify asset list

**Expected**:
- All assets displayed
- Status filters work
- Asset categories visible

**Status**: ✅ PASS (Samsung AC visible)

---

#### TC-ASSET-002: Create Asset
**Steps**:
1. Click "Add Asset"
2. Fill details:
   - Name: "Washing Machine"
   - Type: "Appliance"
   - Brand: "LG"
   - Serial: "WM789012"
   - Purchase Price: ₱18,000
   - Rental Rate: ₱400/month
3. Submit

**Expected**:
- Asset created
- Added to inventory
- Available for assignment

**API Test**:
```bash
curl -X POST http://localhost:3001/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "assetName": "Washing Machine",
    "assetType": "Appliance",
    "brand": "LG",
    "serialNumber": "WM789012",
    "purchaseDate": "2025-01-15",
    "purchasePrice": 18000,
    "currentValue": 16000,
    "rentalRate": 400,
    "assetStatus": "available"
  }'
```

**Status**: ✅ PASS

---

#### TC-ASSET-003: Assign Asset to Room
**Steps**:
1. Select asset
2. Click "Assign"
3. Choose room/tenant
4. Set rental fee
5. Confirm

**Expected**:
- Asset assigned
- Status → "assigned"
- Billing created if rental
- Visible on room/tenant profile

**API Test**:
```bash
curl -X POST http://localhost:3001/api/assets/[id]/assign \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "a907dfd9-0230-4072-937d-a3458adfcb98",
    "tenantId": "d87a4d66-0b1b-4548-8a58-ff8f2c2b8bc7",
    "notes": "Air conditioner for Room 101"
  }'
```

**Status**: ✅ PASS (Fixed schema issue)

---

#### TC-ASSET-004: Generate Asset QR Code
**Steps**:
1. Open asset details
2. Click "Generate QR Code"
3. Print/download QR

**Expected**:
- QR code generated
- Contains asset ID
- Scannable

**Status**: ⏸️ PENDING

---

## 8️⃣ ANALYTICS & REPORTS

### Module Information
- **Route**: `/admin/analytics`
- **Features**:
  - Dashboard overview
  - Occupancy analytics
  - Financial analytics
  - Trend analysis

### Test Cases

#### TC-ANALYTICS-001: Access Analytics Dashboard
**Steps**:
1. Navigate to `/admin/analytics`
2. Verify dashboard loads

**Expected**:
- Key metrics displayed
- Charts and graphs
- Date range filters

**Status**: ⏸️ PENDING

---

#### TC-ANALYTICS-002: Occupancy Analysis
**Steps**:
1. View occupancy section
2. Check metrics

**Expected**:
- Current occupancy rate
- Historical trends
- By building breakdown
- Forecast

**Status**: ⏸️ PENDING

---

#### TC-ANALYTICS-003: Financial Analytics
**Steps**:
1. View financial analytics
2. Check revenue trends

**Expected**:
- Revenue over time
- Collection rate
- Outstanding balances
- Comparisons

**Status**: ⏸️ PENDING

---

## 9️⃣ DOCUMENT TEMPLATES

### Module Information
- **Route**: `/admin/documents/templates`
- **Features**:
  - Lease agreements
  - Receipts
  - Notices
  - Forms

### Test Cases

#### TC-DOC-001: Access Document Templates
**Steps**:
1. Navigate to `/admin/documents/templates`
2. Verify templates list

**Expected**:
- Available templates shown
- Preview option
- Edit functionality

**Status**: ⏸️ PENDING

---

#### TC-DOC-002: Create Document from Template
**Steps**:
1. Select "Lease Agreement" template
2. Fill tenant/property details
3. Generate document

**Expected**:
- Document generated
- Data populated correctly
- Can save/print/email

**Status**: ⏸️ PENDING

---

#### TC-DOC-003: Upload Custom Template
**Steps**:
1. Click "Upload Template"
2. Select file
3. Configure fields
4. Save template

**Expected**:
- Template uploaded
- Fields mapped
- Available for use

**Status**: ⏸️ PENDING

---

## 🔟 ADVANCED EXPORT

### Module Information
- **Route**: `/admin/export`
- **Features**:
  - Bulk data export
  - Custom queries
  - Multiple formats

### Test Cases

#### TC-EXPORT-001: Access Export Module
**Steps**:
1. Navigate to `/admin/export`
2. Verify export options

**Expected**:
- Export categories listed
- Format options (CSV, Excel, PDF)
- Date range filters

**Status**: ✅ VISIBLE (Export page exists)

---

#### TC-EXPORT-002: Export Buildings Data
**Steps**:
1. Select "Buildings" export
2. Choose format: CSV
3. Download

**Expected**:
- File downloads
- Contains all building data
- Properly formatted

**API Test**:
```bash
curl -s "http://localhost:3001/api/export?type=buildings"
```

**Status**: ⏸️ PENDING (Test download)

---

#### TC-EXPORT-003: Export Tenants Data
**Steps**:
1. Select "Tenants" export
2. Apply filters if needed
3. Choose Excel format
4. Download

**Expected**:
- Excel file downloads
- Includes all tenant fields
- Respects filters

**Status**: ⏸️ PENDING

---

#### TC-EXPORT-004: Export Financial Data
**Steps**:
1. Select "Payments" export
2. Choose date range
3. Export

**Expected**:
- Payment records exported
- Includes all related data
- Accurate calculations

**Status**: ⏸️ PENDING

---

## 📊 TESTING SUMMARY

### Overall Status

| Module | Access | Create | Read | Update | Delete | Integration | Status |
|--------|--------|--------|------|--------|--------|-------------|---------|
| Buildings | ✅ | ✅ | ⏸️ | ⏸️ | ⏸️ | ✅ | 60% |
| Rooms | ✅ | ✅ | ⏸️ | ⏸️ | ⏸️ | ✅ | 60% |
| Tenants | ✅ | ✅ | ⏸️ | ⏸️ | ⏸️ | ✅ | 60% |
| Financial | ⏸️ | ✅ | ⏸️ | ⏸️ | ⏸️ | ⏸️ | 20% |
| Reports | ⏸️ | N/A | ⏸️ | N/A | N/A | ⏸️ | 0% |
| Utilities | ⏸️ | ⏸️ | ⏸️ | ⏸️ | ⏸️ | ⏸️ | 0% |
| Assets | ✅ | ✅ | ⏸️ | ⏸️ | ⏸️ | ✅ | 60% |
| Analytics | ⏸️ | N/A | ⏸️ | N/A | N/A | ⏸️ | 0% |
| Documents | ⏸️ | ⏸️ | ⏸️ | ⏸️ | ⏸️ | ⏸️ | 0% |
| Export | ✅ | N/A | ✅ | N/A | N/A | ⏸️ | 50% |

### Completion Rate: 31%

---

## 🚀 NEXT STEPS

### Immediate Priority:
1. Complete Read/View operations for Buildings, Rooms, Tenants
2. Test Update operations
3. Implement and test Financial Reports
4. Implement and test Utilities Management

### Short-term:
1. Complete Analytics dashboard
2. Implement Document Templates
3. Complete Export functionality
4. Add comprehensive error handling

### Long-term:
1. Implement automated testing
2. Add performance monitoring
3. Create user documentation
4. Conduct UAT with stakeholders

---

**Last Updated**: 2025-10-28 14:15 GMT+8

