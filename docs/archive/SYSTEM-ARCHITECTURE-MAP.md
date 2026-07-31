# 🏢 Parenta Property Management System - Architecture & Relationship Map

> Complete system scope showing how every component connects from UI to Database

---

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PARENTA PROPERTY MANAGEMENT                     │
│                                                                     │
│  Landing Page → Authentication → Role-Based Portals → Database     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Entity Relationships (Database Level)

### **Primary Hierarchy**

```
BUILDINGS (Properties)
    │
    ├── ROOMS (Units/Spaces)
    │     │
    │     ├── TENANT_ASSIGNMENTS (Occupancy)
    │     │     │
    │     │     └── TENANTS (People)
    │     │           │
    │     │           ├── PAYMENTS (Money In)
    │     │           ├── INVOICES (Bills)
    │     │           └── MAINTENANCE_REQUESTS (Issues)
    │     │
    │     └── ASSETS (Equipment assigned to room)
    │
    ├── UTILITY_BILLS (Building-level utilities)
    ├── EXPENSES (Building-level costs)
    └── MAINTENANCE_REQUESTS (Building-level issues)
```

---

## 🗄️ Complete Database Schema Map

### **1. CORE PROPERTY MODULE**

```
┌─────────────────────────────────────────────────────────────────┐
│                         BUILDINGS                               │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • name                    → "Sunset Apartments"                 │
│ • address                 → Full address details                │
│ • building_type           → "residential", "commercial"         │
│ • total_floors                                                  │
│ • amenities[]             → ["pool", "gym", "parking"]         │
│ • is_active                                                     │
│ • created_at, updated_at                                        │
└─────────────────────────────────────────────────────────────────┘
         │
         │ HAS MANY
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                           ROOMS                                 │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • building_id (FK) ────────┐                                   │
│ • room_number               │ → Points to BUILDINGS            │
│ • floor_number              │                                  │
│ • room_type                 │ → "studio", "1BR", "2BR"        │
│ • square_footage            │                                  │
│ • monthly_rate              │ → ₱15,000 (rent price)          │
│ • room_status               │ → "vacant", "occupied"          │
│ • amenities[]               │                                  │
│ • created_at, updated_at    │                                  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              │ BELONGS TO
                              └─────────────► BUILDINGS
```

### **2. TENANT & OCCUPANCY MODULE**

```
┌─────────────────────────────────────────────────────────────────┐
│                          USERS                                  │
│                    (Authentication)                             │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • email                   → "tenant@parenta.com"                │
│ • password_hash           → Encrypted                           │
│ • full_name                                                     │
│ • role                    → "admin", "tenant", "staff"         │
│ • is_active                                                     │
│ • created_at, updated_at                                        │
└─────────────────────────────────────────────────────────────────┘
         │
         │ HAS ONE (if tenant)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         TENANTS                                 │
│                    (Profile Information)                        │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • user_id (FK) ────────────────┐                               │
│ • first_name, last_name         │ → Links to USERS            │
│ • email, phone                  │                              │
│ • date_of_birth                 │                              │
│ • occupation                    │                              │
│ • monthly_income                │                              │
│ • emergency_contact_name        │                              │
│ • emergency_contact_phone       │                              │
│ • id_type, id_number            │ → Government ID             │
│ • move_in_date                  │                              │
│ • tenant_status                 │ → "active", "inactive"      │
│ • created_at, updated_at        │                              │
└─────────────────────────────────┼───────────────────────────────┘
                                  │
                                  │ BELONGS TO
                                  └───────────► USERS
         │
         │ HAS MANY
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TENANT_ASSIGNMENTS                            │
│               (Links Tenants to Rooms)                          │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • tenant_id (FK) ──────────────┐                               │
│ • room_id (FK) ────────────────┼───┐                           │
│ • start_date                    │   │                           │
│ • end_date (nullable)           │   │ → Active if NULL        │
│ • monthly_rent                  │   │                           │
│ • security_deposit              │   │                           │
│ • deposit_amount                │   │                           │
│ • advance_amount                │   │                           │
│ • lease_term_months             │   │                           │
│ • assignment_status             │   │ → "active", "ended"     │
│ • created_at, updated_at        │   │                           │
└─────────────────────────────────┼───┼───────────────────────────┘
                                  │   │
                    BELONGS TO ◄──┘   └──► BELONGS TO
                      TENANTS              ROOMS
```

### **3. FINANCIAL MODULE**

```
┌─────────────────────────────────────────────────────────────────┐
│                         PAYMENTS                                │
│                    (Money Received)                             │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • tenant_id (FK) ──────────────┐                               │
│ • room_id (FK)                  │                               │
│ • invoice_id (FK, nullable)     │                               │
│ • amount                        │ → ₱15,000                     │
│ • payment_date                  │                               │
│ • payment_method                │ → "cash", "bank_transfer"   │
│ • payment_type                  │ → "rent", "deposit"         │
│ • reference_number              │                               │
│ • status                        │ → "completed", "pending"    │
│ • description                   │                               │
│ • created_at, updated_at        │                               │
└─────────────────────────────────┼───────────────────────────────┘
                                  │
                    BELONGS TO ◄──┘
                      TENANTS

┌─────────────────────────────────────────────────────────────────┐
│                         INVOICES                                │
│                    (Bills to Tenants)                           │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • tenant_id (FK)                                                │
│ • room_id (FK)                                                  │
│ • invoice_number        → "INV-2025-001"                       │
│ • issue_date                                                    │
│ • due_date                                                      │
│ • subtotal                                                      │
│ • tax_amount                                                    │
│ • total_amount          → ₱15,000                              │
│ • amount_paid           → ₱15,000                              │
│ • status                → "paid", "sent", "overdue"           │
│ • description                                                   │
│ • created_at, updated_at                                        │
└─────────────────────────────────────────────────────────────────┘
         │
         │ HAS MANY
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INVOICE_LINE_ITEMS                          │
│                   (Detailed Charges)                            │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • invoice_id (FK)                                               │
│ • description           → "Monthly Rent - Room 101"           │
│ • quantity              → 1                                     │
│ • unit_price            → ₱15,000                              │
│ • amount                → ₱15,000                              │
│ • created_at                                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         EXPENSES                                │
│                    (Money Spent)                                │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • building_id (FK, nullable)                                    │
│ • room_id (FK, nullable)                                        │
│ • category              → "maintenance", "utilities", "tax"   │
│ • amount                → ₱5,000                               │
│ • expense_date                                                  │
│ • vendor_name           → "ABC Plumbing"                       │
│ • description                                                   │
│ • receipt_url                                                   │
│ • status                → "paid", "pending"                   │
│ • created_at, updated_at                                        │
└─────────────────────────────────────────────────────────────────┘
```

### **4. MAINTENANCE MODULE**

```
┌─────────────────────────────────────────────────────────────────┐
│                   MAINTENANCE_REQUESTS                          │
│                    (Issues & Repairs)                           │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • tenant_id (FK)                                                │
│ • room_id (FK)                                                  │
│ • building_id (FK)                                              │
│ • title                 → "Leaking faucet"                     │
│ • description           → Detailed issue                        │
│ • category              → "plumbing", "electrical", "hvac"    │
│ • priority              → "low", "medium", "high", "urgent"   │
│ • status                → "open", "in_progress", "completed"  │
│ • request_date                                                  │
│ • scheduled_date                                                │
│ • completed_date                                                │
│ • assigned_to (FK, nullable)                                    │
│ • cost                  → ₱2,500 (repair cost)                 │
│ • notes                                                         │
│ • created_at, updated_at                                        │
└─────────────────────────────────────────────────────────────────┘
         │
         │ HAS MANY
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 MAINTENANCE_UPDATES                             │
│                    (Progress Notes)                             │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • request_id (FK)                                               │
│ • user_id (FK)          → Staff who updated                    │
│ • update_text                                                   │
│ • status_change         → New status if changed                │
│ • created_at                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### **5. UTILITIES MODULE**

```
┌─────────────────────────────────────────────────────────────────┐
│                      UTILITY_BILLS                              │
│                (Electricity, Water, etc.)                       │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • building_id (FK)                                              │
│ • room_id (FK, nullable)                                        │
│ • utility_type          → "electricity", "water", "gas"       │
│ • billing_period_start                                          │
│ • billing_period_end                                            │
│ • previous_reading                                              │
│ • current_reading                                               │
│ • consumption           → Calculated (current - previous)      │
│ • rate_per_unit         → ₱10 per kWh                          │
│ • amount                → ₱2,000                               │
│ • due_date                                                      │
│ • status                → "paid", "pending", "overdue"        │
│ • provider_name         → "Meralco"                            │
│ • account_number                                                │
│ • created_at, updated_at                                        │
└─────────────────────────────────────────────────────────────────┘
         │
         │ HAS MANY
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     METER_READINGS                              │
│                   (Historical Data)                             │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • building_id (FK)                                              │
│ • room_id (FK, nullable)                                        │
│ • utility_type                                                  │
│ • reading_value                                                 │
│ • reading_date                                                  │
│ • recorded_by (FK)      → User who recorded                    │
│ • created_at                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### **6. ASSETS MODULE**

```
┌─────────────────────────────────────────────────────────────────┐
│                          ASSETS                                 │
│                (Furniture, Appliances)                          │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • building_id (FK, nullable)                                    │
│ • room_id (FK, nullable)                                        │
│ • asset_name            → "Air Conditioner"                    │
│ • asset_type            → "appliance", "furniture"            │
│ • category              → "cooling", "seating"                │
│ • brand                                                         │
│ • model                                                         │
│ • serial_number                                                 │
│ • purchase_date                                                 │
│ • purchase_price        → ₱25,000                              │
│ • current_value         → ₱20,000                              │
│ • condition             → "excellent", "good", "fair"         │
│ • warranty_expiry                                               │
│ • status                → "active", "maintenance", "retired"  │
│ • created_at, updated_at                                        │
└─────────────────────────────────────────────────────────────────┘
```

### **7. DOCUMENTS MODULE**

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOCUMENTS                                │
│                (Contracts, Receipts, etc.)                      │
├─────────────────────────────────────────────────────────────────┤
│ • id (PK)                                                       │
│ • tenant_id (FK, nullable)                                      │
│ • building_id (FK, nullable)                                    │
│ • room_id (FK, nullable)                                        │
│ • document_type         → "lease", "payment_receipt"          │
│ • document_name         → "Lease Agreement 2025"              │
│ • description                                                   │
│ • file_path             → "/uploads/docs/..."                 │
│ • file_size             → In bytes                             │
│ • mime_type             → "application/pdf"                   │
│ • uploaded_by (FK)      → User who uploaded                    │
│ • created_at, updated_at                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ UI Architecture & Page Hierarchy

### **Landing Page (Public)**

```
/ (Landing Page)
├── Hero Section
├── Featured Properties (6 buildings)
├── Key Features
├── Testimonials
└── Links to Login Pages
```

### **Admin Portal**

```
/admin
│
├── Dashboard
│   ├── Stats Cards (Revenue, Occupancy, Tenants)
│   ├── Quick Actions
│   │   ├── Add Building
│   │   ├── Add Room
│   │   ├── Add Tenant
│   │   └── Record Payment
│   ├── Recent Activity
│   └── Alerts
│
├── Buildings Module
│   ├── /admin/buildings
│   │   ├── Building List (Cards with stats)
│   │   ├── Add Building Modal
│   │   └── Search & Filters
│   └── /admin/buildings/[id]
│       ├── Building Details
│       ├── Rooms List
│       ├── Financials
│       ├── Maintenance
│       ├── Documents
│       └── Edit Building
│
├── Rooms Module
│   ├── /admin/rooms
│   │   ├── Rooms List (All properties)
│   │   ├── Add Room
│   │   ├── Vacancy Overview
│   │   └── Filters (by building, status)
│   └── /admin/rooms/[id]
│       ├── Room Details
│       ├── Current Tenant
│       ├── Assignment History
│       ├── Assets
│       ├── Maintenance History
│       ├── Documents
│       ├── Assign Tenant
│       └── Edit Room
│
├── Tenants Module
│   ├── /admin/tenants
│   │   ├── Tenant List
│   │   ├── Add Tenant
│   │   ├── Stats (Total, Active, Inactive)
│   │   └── Search & Filters
│   └── /admin/tenants/[id]
│       ├── Tenant Profile
│       ├── Current Room Assignment
│       ├── Payment History
│       ├── Invoices
│       ├── Maintenance Requests
│       ├── Documents
│       ├── Assignment History
│       └── Edit Tenant
│
├── Financial Module
│   ├── /admin/financial/payments
│   │   ├── Payments List
│   │   ├── Record New Payment
│   │   ├── Payment Summary Stats
│   │   └── Filters & Search
│   ├── /admin/financial/payments/new
│   │   └── Payment Form
│   ├── /admin/financial/invoices
│   │   ├── Invoices List
│   │   ├── Create Invoice
│   │   ├── Invoice Summary
│   │   └── Filters
│   ├── /admin/financial/invoices/new
│   │   └── Invoice Form (with line items)
│   ├── /admin/financial/expenses
│   │   ├── Expenses List
│   │   ├── Record Expense
│   │   ├── Expense Summary
│   │   └── Filters (by category, building)
│   └── /admin/financial/reports
│       ├── Revenue Report
│       ├── Expense Report
│       ├── Rent Roll
│       ├── Profit & Loss Statement
│       └── Outstanding Balances
│
├── Analytics & Reports
│   ├── /admin/analytics
│   │   ├── Overview Tab
│   │   │   ├── Financial Metrics
│   │   │   ├── Occupancy Trends
│   │   │   └── Key Performance Indicators
│   │   ├── Financial Tab
│   │   │   ├── Revenue Trend Chart
│   │   │   ├── Expense Breakdown
│   │   │   └── Cash Flow Analysis
│   │   ├── Occupancy Tab
│   │   │   ├── Occupancy Rate Over Time
│   │   │   ├── Vacancy Analysis
│   │   │   └── Turnover Rate
│   │   └── Buildings Tab
│   │       ├── Per-Building Performance
│   │       └── Comparison Charts
│   └── /admin/reports
│       ├── Generate Reports
│       ├── Export Options (PDF, Excel)
│       └── Schedule Reports
│
├── Maintenance Module
│   ├── /admin/maintenance
│   │   ├── Requests List
│   │   ├── Create Request
│   │   ├── Status Overview
│   │   └── Filters (status, priority, building)
│   └── /admin/maintenance/[id]
│       ├── Request Details
│       ├── Progress Updates
│       ├── Assign Staff
│       ├── Record Cost
│       └── Complete Request
│
├── Utilities Module
│   ├── /admin/utilities
│   │   ├── Bills List
│   │   ├── Record Bill
│   │   ├── Stats (consumption, costs)
│   │   └── Filters
│   ├── /admin/utilities/meters
│   │   ├── Meter Readings
│   │   ├── Record Reading
│   │   └── Trends
│   └── /admin/utilities/[id]
│       ├── Bill Details
│       ├── Payment Status
│       └── Edit Bill
│
└── Assets Module
    ├── /admin/assets
    │   ├── Assets List
    │   ├── Add Asset
    │   ├── Summary Stats
    │   └── Filters (by type, location, status)
    └── /admin/assets/[id]
        ├── Asset Details
        ├── Maintenance History
        ├── Assign to Room
        └── Edit Asset
```

### **Tenant Portal**

```
/tenant
│
├── Dashboard
│   ├── Welcome Card (Room info)
│   ├── Summary Cards
│   │   ├── Next Payment Due
│   │   ├── Payments Made
│   │   ├── Active Requests
│   │   └── Documents
│   ├── Quick Actions
│   │   ├── Pay Rent
│   │   ├── Request Maintenance
│   │   ├── View Documents
│   │   └── Payment History
│   ├── Recent Payments
│   └── Maintenance Requests
│
├── Payments
│   ├── /tenant/payments
│   │   ├── Payment Summary Cards
│   │   │   ├── Total Paid
│   │   │   ├── Next Due
│   │   │   └── Outstanding
│   │   ├── Make Payment Section
│   │   ├── Payment History Table
│   │   └── Filters & Search
│   └── Features
│       ├── View Receipt
│       ├── Download Receipt
│       └── Payment Methods Info
│
├── Documents
│   ├── /tenant/documents
│   │   ├── Documents Count
│   │   ├── Documents List
│   │   │   ├── Lease Agreement
│   │   │   ├── Payment Receipts
│   │   │   ├── Property Rules
│   │   │   └── Other Documents
│   │   └── Filters (by category)
│   └── Features
│       ├── View Document
│       └── Download Document
│
└── Maintenance
    ├── /tenant/maintenance
    │   ├── Active Requests Count
    │   ├── Submit New Request Button
    │   ├── Requests List
    │   │   ├── Status Indicator
    │   │   ├── Priority Badge
    │   │   ├── Category
    │   │   └── Dates (created, scheduled, completed)
    │   └── Filters
    │       ├── By Status
    │       ├── By Priority
    │       └── Search
    └── Submit Request Modal
        ├── Title
        ├── Description
        ├── Category Dropdown
        └── Priority Dropdown
```

---

## 🔄 Data Flow Examples

### **Example 1: Tenant Onboarding Flow**

```
ADMIN CREATES NEW TENANT
         │
         ▼
1. Admin goes to /admin/tenants
2. Clicks "Add Tenant"
3. Fills TenantForm:
   ├── Personal Info (name, email, phone)
   ├── Contact Info (emergency contact)
   ├── Employment (occupation, income)
   ├── ID Information (government ID)
   ├── Lease Details (deposit months, advance months)
   └── Create User Account? (Yes/No)
         │
         ▼
4. Form submits to /api/tenants (POST)
         │
         ▼
5. Backend creates:
   ├── USER record (if option selected)
   │   └── Links via user_id
   └── TENANT record
         │
         ▼
6. Redirect to /admin/tenants/[new-tenant-id]
7. Admin can now:
   ├── Assign to Room
   ├── Generate Invoice
   └── Add Documents
```

### **Example 2: Room Assignment Flow**

```
ASSIGN TENANT TO ROOM
         │
         ▼
1. Admin at /admin/rooms/[room-id]
2. Clicks "Assign Tenant"
3. Selects:
   ├── Tenant (dropdown)
   ├── Start Date
   ├── Monthly Rent (₱)
   ├── Deposit Amount (₱)
   ├── Advance Amount (₱)
   └── Lease Term (months)
         │
         ▼
4. Form submits to /api/rooms/[room-id]/assign (POST)
         │
         ▼
5. Backend creates TENANT_ASSIGNMENT:
   ├── Links tenant_id → room_id
   ├── Sets start_date
   ├── Stores financial terms
   └── Updates room_status to "occupied"
         │
         ▼
6. Database Updates:
   ├── ROOMS.room_status = "occupied"
   ├── TENANTS.tenant_status = "active"
   └── TENANT_ASSIGNMENTS.assignment_status = "active"
         │
         ▼
7. Tenant can now:
   ├── Login to tenant portal
   ├── See their room details
   ├── Make payments
   └── Submit maintenance requests
```

### **Example 3: Payment Processing Flow**

```
TENANT MAKES PAYMENT
         │
         ▼
1. Tenant goes to /tenant/payments
2. Clicks "Pay Now" (future feature)
   OR
   Admin records payment at /admin/financial/payments/new
         │
         ▼
3. Payment Form:
   ├── Select Tenant
   ├── Select Room (auto-filled if from tenant portal)
   ├── Amount (₱)
   ├── Payment Method
   ├── Payment Type (rent, deposit, utility)
   ├── Reference Number
   └── Description
         │
         ▼
4. Form submits to /api/payments (POST)
         │
         ▼
5. Backend creates PAYMENT record:
   ├── Links to tenant_id
   ├── Links to room_id
   ├── Links to invoice_id (if applicable)
   ├── Records amount
   └── Sets status to "completed"
         │
         ▼
6. If linked to INVOICE:
   ├── Updates INVOICE.amount_paid
   ├── Calculates remaining balance
   └── Updates INVOICE.status if fully paid
         │
         ▼
7. System generates:
   ├── Payment Receipt (PDF)
   └── Document record in DOCUMENTS table
         │
         ▼
8. Updates displayed in:
   ├── Admin Dashboard (revenue stats)
   ├── Tenant Dashboard (payment history)
   ├── Financial Reports
   └── Analytics Charts
```

### **Example 4: Maintenance Request Flow**

```
TENANT SUBMITS MAINTENANCE REQUEST
         │
         ▼
1. Tenant at /tenant/maintenance
2. Clicks "Submit New Request"
3. Fills form:
   ├── Title ("Leaking faucet")
   ├── Description (details)
   ├── Category (plumbing)
   └── Priority (medium)
         │
         ▼
4. Form submits to /api/tenant/maintenance (POST)
         │
         ▼
5. Backend creates MAINTENANCE_REQUEST:
   ├── Gets tenant_id from session
   ├── Gets room_id from TENANT_ASSIGNMENTS
   ├── Gets building_id from ROOMS
   ├── Sets status = "open"
   └── Records request_date
         │
         ▼
6. Admin receives notification (future feature)
         │
         ▼
7. Admin at /admin/maintenance sees new request
8. Admin can:
   ├── View details
   ├── Update status → "in_progress"
   ├── Assign to staff
   ├── Schedule date
   ├── Add notes/updates
   ├── Record cost
   └── Complete request
         │
         ▼
9. Each update creates MAINTENANCE_UPDATES record
         │
         ▼
10. When completed:
    ├── Status → "completed"
    ├── Cost recorded in EXPENSES
    ├── Tenant sees status in their portal
    └── Request appears in history
```

### **Example 5: Financial Reporting Flow**

```
GENERATE FINANCIAL REPORT
         │
         ▼
1. Admin goes to /admin/financial/reports
2. Selects date range
3. System queries:
   ├── PAYMENTS (revenue)
   ├── EXPENSES (costs)
   ├── INVOICES (receivables)
   └── UTILITY_BILLS (utilities)
         │
         ▼
4. Backend at /api/reports/profit-loss (GET)
         │
         ▼
5. Calculates:
   ├── Total Revenue
   │   ├── Rent payments
   │   ├── Deposit payments
   │   └── Other income
   │
   ├── Total Expenses
   │   ├── Maintenance costs
   │   ├── Utility bills
   │   ├── Taxes
   │   └── Other expenses
   │
   ├── Net Income = Revenue - Expenses
   └── Profit Margin = (Net Income / Revenue) × 100
         │
         ▼
6. Groups data by:
   ├── Category
   ├── Building
   ├── Time period
   └── Tenant
         │
         ▼
7. Displays in UI:
   ├── Summary cards
   ├── Charts (revenue trend, expense breakdown)
   ├── Tables (detailed transactions)
   └── Export buttons (PDF, Excel)
         │
         ▼
8. Data flows to /admin/analytics for:
   ├── Dashboard widgets
   ├── Trend charts
   └── Performance metrics
```

---

## 🔗 Module Dependencies & Integration Points

### **Buildings → Everything**

```
BUILDINGS are the foundation
    │
    ├─► ROOMS (all rooms in a building)
    ├─► EXPENSES (building-level costs)
    ├─► UTILITY_BILLS (building utilities)
    ├─► MAINTENANCE_REQUESTS (building issues)
    └─► Analytics (per-building performance)
```

### **Rooms → Occupancy & Finance**

```
ROOMS connect to:
    │
    ├─► TENANT_ASSIGNMENTS (who lives here)
    │       └─► TENANTS (profile)
    │
    ├─► PAYMENTS (rent received)
    ├─► INVOICES (bills sent)
    ├─► ASSETS (equipment in room)
    ├─► MAINTENANCE_REQUESTS (room issues)
    └─► UTILITY_BILLS (room utilities, if metered)
```

### **Tenants → All Activities**

```
TENANTS interact with:
    │
    ├─► TENANT_ASSIGNMENTS (their room)
    ├─► PAYMENTS (money they pay)
    ├─► INVOICES (bills they receive)
    ├─► MAINTENANCE_REQUESTS (issues they report)
    ├─► DOCUMENTS (their files)
    └─► USERS (their login account)
```

### **Financial Integration**

```
PAYMENTS connect:
    │
    ├─► TENANTS (who paid)
    ├─► ROOMS (for which room)
    ├─► INVOICES (which bill)
    └─► Reports (revenue tracking)

EXPENSES connect:
    │
    ├─► BUILDINGS (where spent)
    ├─► ROOMS (specific unit)
    ├─► MAINTENANCE_REQUESTS (repair costs)
    └─► Reports (cost tracking)

INVOICES connect:
    │
    ├─► TENANTS (who to bill)
    ├─► ROOMS (for what)
    ├─► PAYMENTS (what's paid)
    └─► Reports (receivables)
```

---

## 📱 API Endpoints Map

### **Buildings**
- `GET /api/buildings` - List all buildings
- `GET /api/buildings/:id` - Get building details
- `POST /api/buildings` - Create building
- `PUT /api/buildings/:id` - Update building
- `DELETE /api/buildings/:id` - Delete building

### **Rooms**
- `GET /api/rooms` - List all rooms (with filters)
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room
- `POST /api/rooms/:id/assign` - Assign tenant to room

### **Tenants**
- `GET /api/tenants` - List all tenants
- `GET /api/tenants/:id` - Get tenant details
- `POST /api/tenants` - Create tenant (+ optional user)
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

### **Payments**
- `GET /api/payments` - List payments (with filters)
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments` - Record payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### **Invoices**
- `GET /api/invoices` - List invoices (with filters)
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### **Expenses**
- `GET /api/expenses` - List expenses (with filters)
- `GET /api/expenses/:id` - Get expense details
- `POST /api/expenses` - Record expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### **Maintenance**
- `GET /api/maintenance` - List requests (admin)
- `GET /api/maintenance/:id` - Get request details
- `POST /api/maintenance` - Create request
- `PUT /api/maintenance/:id` - Update request
- `GET /api/tenant/maintenance` - Tenant's requests
- `POST /api/tenant/maintenance` - Tenant submits request

### **Utilities**
- `GET /api/utilities` - List utility bills
- `GET /api/utilities/:id` - Get bill details
- `POST /api/utilities` - Record bill
- `PUT /api/utilities/:id` - Update bill
- `GET /api/utilities/stats` - Usage statistics

### **Assets**
- `GET /api/assets` - List assets
- `GET /api/assets/:id` - Get asset details
- `POST /api/assets` - Create asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### **Reports**
- `GET /api/reports/revenue` - Revenue report
- `GET /api/reports/expenses` - Expense report
- `GET /api/reports/rent-roll` - Rent roll
- `GET /api/reports/profit-loss` - P&L statement

### **Analytics**
- `GET /api/analytics?type=dashboard` - Dashboard metrics
- `GET /api/analytics?type=financial-trends` - Financial charts
- `GET /api/analytics?type=occupancy-trends` - Occupancy data
- `GET /api/analytics?type=cash-flow` - Cash flow analysis

---

## 🎨 Component Architecture

### **Shared Components**

```
src/components/
│
├── ui/
│   ├── Breadcrumb.tsx         → Navigation breadcrumbs
│   ├── Button.tsx             → Reusable button
│   ├── Input.tsx              → Form input
│   ├── Modal.tsx              → Modal wrapper
│   └── Card.tsx               → Card container
│
├── features/
│   ├── BuildingCard.tsx       → Building display card
│   ├── RoomCard.tsx           → Room display card
│   ├── TenantCard.tsx         → Tenant display card
│   ├── PaymentForm.tsx        → Record payment
│   ├── TenantForm.tsx         → Add/edit tenant
│   ├── AddRoomForm.tsx        → Add room
│   ├── AddBuildingModal.tsx   → Add building
│   ├── CreateInvoiceForm.tsx  → Create invoice
│   ├── ExpenseForm.tsx        → Record expense
│   └── [30+ more components]
│
└── Providers.tsx              → SessionProvider + Notifications
```

### **Page Components**

Each page is either:
- **Server Component** (default) - Fetches data on server
- **Client Component** ('use client') - Interactive UI

---

## 💾 Database Relationships Summary

```
BUILDINGS (1) ────── (many) ROOMS
    │                      │
    │                      └─── (many) TENANT_ASSIGNMENTS
    │                                     │
    │                                     └─── (1) TENANTS
    │                                              │
    ├─── (many) EXPENSES                          ├─── (1) USERS
    ├─── (many) UTILITY_BILLS                     ├─── (many) PAYMENTS
    ├─── (many) MAINTENANCE_REQUESTS              ├─── (many) INVOICES
    └─── (many) ASSETS                            ├─── (many) DOCUMENTS
                                                  └─── (many) MAINTENANCE_REQUESTS

PAYMENTS (many) ───── (1) INVOICES
EXPENSES (many) ───── (1) MAINTENANCE_REQUESTS (optional)
ASSETS (many) ──────── (1) ROOMS (when assigned)
DOCUMENTS (many) ───── (1) TENANTS/BUILDINGS/ROOMS
```

---

## 🔐 Authentication & Authorization Flow

```
1. USER LOGIN
   └─► NextAuth validates credentials
       └─► Creates JWT session with role
           │
           ├─► role = "admin"
           │   └─► Access to /admin/** pages
           │
           ├─► role = "tenant"
           │   └─► Access to /tenant/** pages
           │       └─► Can only see their own data
           │
           └─► role = "staff"
               └─► Access to specific admin pages

2. API AUTHORIZATION
   └─► Each API route checks:
       ├─► getServerSession() - Is user logged in?
       ├─► session.user.role - What role?
       └─► Data access - Can they access this data?
           └─► Tenants: Only their tenant_id
           └─► Admin: All data
```

---

## 📊 Key Metrics & Calculations

### **Occupancy Rate**
```
Occupancy Rate = (Occupied Rooms / Total Rooms) × 100

Example:
- Total Rooms: 50
- Occupied: 42
- Occupancy Rate: 84%
```

### **Revenue Calculation**
```
Total Revenue = Sum of all PAYMENTS where status = "completed"

By Type:
- Rent Revenue: PAYMENTS where payment_type = "rent"
- Deposit Revenue: PAYMENTS where payment_type = "deposit"
- Other Revenue: PAYMENTS where payment_type = "other"
```

### **Expense Tracking**
```
Total Expenses = Sum of all EXPENSES where status = "paid"

By Category:
- Maintenance: category = "maintenance"
- Utilities: category = "utilities"
- Operating: category = "operating"
```

### **Net Income**
```
Net Income = Total Revenue - Total Expenses
Profit Margin = (Net Income / Total Revenue) × 100
```

### **Outstanding Balance**
```
Per Tenant:
Outstanding = Sum(INVOICES.total_amount - INVOICES.amount_paid)
              WHERE tenant_id = X AND status != "paid"
```

---

## 🚀 Future Enhancements (Mentioned in System)

1. **Online Payment Integration**
   - Payment gateway (Stripe, PayPal)
   - Tenant pays directly from portal

2. **Automated Notifications**
   - Email/SMS alerts for:
     - Payment due reminders
     - Maintenance updates
     - Lease expiry warnings

3. **Document Generation**
   - Auto-generate lease agreements
   - Generate receipts automatically
   - Export reports in multiple formats

4. **Mobile App**
   - Native iOS/Android apps
   - Push notifications

5. **Advanced Analytics**
   - Predictive analytics
   - Tenant retention forecasting
   - Maintenance cost trends

---

## 📝 Summary

This Parenta Property Management System is a **comprehensive, multi-tenant application** that manages the complete lifecycle of property management:

**Core Flow:**
```
Buildings → Rooms → Tenants → Assignments → Payments/Invoices → Reports
                                         └→ Maintenance → Expenses
```

**Key Features:**
- ✅ Multi-building support
- ✅ Tenant & room management
- ✅ Financial tracking (payments, invoices, expenses)
- ✅ Maintenance request system
- ✅ Utility bill management
- ✅ Asset tracking
- ✅ Document management
- ✅ Analytics & reporting
- ✅ Role-based access (Admin, Tenant, Staff)
- ✅ Philippine Peso (₱) currency
- ✅ Responsive design

**Architecture:**
- Next.js 15 with App Router
- PostgreSQL database (via Supabase)
- NextAuth for authentication
- Server & Client Components
- RESTful API structure

---

*Last Updated: October 30, 2025*

