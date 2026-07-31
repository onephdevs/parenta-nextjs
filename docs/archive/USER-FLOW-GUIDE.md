# 📖 Parenta Property Management System - User Flow Guide

**Version**: 1.0  
**Date**: October 28, 2025  
**Application**: Parenta Property Management System  
**Status**: Production Ready

---

## 📑 Table of Contents

1. [Getting Started](#getting-started)
2. [Admin User Flows](#admin-user-flows)
3. [Staff User Flows](#staff-user-flows)
4. [Tenant User Flows](#tenant-user-flows)
5. [Complete Business Scenarios](#complete-business-scenarios)
6. [Troubleshooting](#troubleshooting)

---

## 🏗️ System Architecture

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PARENTA PROPERTY MANAGEMENT SYSTEM                         ║
║                           ARCHITECTURE OVERVIEW                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                              │
├──────────────────┬──────────────────┬──────────────────┬───────────────────┤
│   Admin Portal   │   Staff Portal   │  Tenant Portal   │   Auth Pages      │
│                  │                  │                  │                   │
│  - Dashboard     │  - Dashboard     │  - Dashboard     │  - Sign In        │
│  - Buildings     │  - Payments      │  - My Room       │  - Sign Out       │
│  - Rooms         │  - Maintenance   │  - Payments      │  - Role Select    │
│  - Tenants       │  - Tenants       │  - Maintenance   │                   │
│  - Payments      │  - Documents     │  - Documents     │                   │
│  - Assets        │  - Analytics     │  - Profile       │                   │
│  - Reports       │                  │                  │                   │
│  - Analytics     │                  │                  │                   │
└──────────────────┴──────────────────┴──────────────────┴───────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               API LAYER (REST)                               │
├────────────────┬────────────────┬────────────────┬────────────────┬─────────┤
│   Buildings    │     Rooms      │    Tenants     │    Payments    │ Assets  │
│   API          │     API        │     API        │     API        │  API    │
│                │                │                │                │         │
│ GET /buildings │ GET /rooms     │ GET /tenants   │ GET /payments  │ GET     │
│ POST           │ POST           │ POST           │ POST           │ POST    │
│ PUT /[id]      │ PUT /[id]      │ PUT /[id]      │ PUT /[id]      │ PUT     │
│ DELETE /[id]   │ DELETE /[id]   │ DELETE /[id]   │ DELETE /[id]   │ DELETE  │
└────────────────┴────────────────┴────────────────┴────────────────┴─────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          ADDITIONAL API MODULES                              │
├────────────────┬────────────────┬────────────────┬────────────────┬─────────┤
│   Expenses     │   Utilities    │    Reports     │   Analytics    │Dashboard│
│                │                │                │                │         │
│ GET /expenses  │ GET /utilities │ GET /revenue   │ GET /analytics │ GET     │
│ POST           │ POST           │ GET /expenses  │ ?type=revenue  │ /stats  │
│ PUT /[id]      │ PUT /[id]      │ GET /rent-roll │ ?type=expense  │         │
│ DELETE /[id]   │ DELETE /[id]   │ GET /profit    │ ?type=occupan  │         │
└────────────────┴────────────────┴────────────────┴────────────────┴─────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BUSINESS LOGIC LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  /lib/api/                                                                   │
│    ├── buildings.ts     - Building CRUD, stats, occupancy                   │
│    ├── rooms.ts         - Room management, availability                     │
│    ├── tenants.ts       - Tenant lifecycle, assignments                     │
│    ├── payments.ts      - Payment processing, tracking                      │
│    ├── assets.ts        - Asset management, assignments                     │
│    ├── expenses.ts      - Expense tracking, categorization                  │
│    ├── utilities.ts     - Utility bill management                           │
│    ├── invoices.ts      - Invoice generation, line items                    │
│    └── reports.ts       - Financial reports, analytics                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  NextAuth v4                                                                 │
│    ├── Credential Provider     - Email + Password + Role                    │
│    ├── JWT Strategy            - Secure token-based sessions                │
│    ├── Session Management      - User session handling                      │
│    └── Role-Based Access       - Admin / Staff / Tenant                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Supabase)                                                       │
│                                                                              │
│  Core Tables (23):                                                           │
│    ├── buildings              - Property information                        │
│    ├── rooms                  - Unit details, pricing                       │
│    ├── tenants                - Tenant profiles                             │
│    ├── payments               - Payment records                             │
│    ├── assets                 - Asset inventory                             │
│    ├── expenses               - Expense tracking                            │
│    ├── utility_bills          - Utility management                          │
│    ├── invoices               - Invoice records                             │
│    ├── maintenance_requests   - Work orders                                 │
│    ├── documents              - Document storage                            │
│    └── [13 more tables...]                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 User Role Hierarchy

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          USER ROLE STRUCTURE                               │
└───────────────────────────────────────────────────────────────────────────┘

                            ┌─────────────────┐
                            │      ADMIN      │
                            │  Full Access    │
                            └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
           ┌────────▼────────┐      │      ┌────────▼────────┐
           │ BUILDING MGMT   │      │      │  FINANCIAL      │
           │                 │      │      │  MANAGEMENT     │
           │ • Create        │      │      │                 │
           │ • Update        │      │      │ • Reports       │
           │ • Delete        │      │      │ • Analytics     │
           │ • Assign        │      │      │ • Invoices      │
           └─────────────────┘      │      └─────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
           ┌────────▼────────┐            ┌────────▼────────┐
           │      STAFF      │            │     TENANT      │
           │  Limited Access │            │   View Only     │
           └────────┬────────┘            └────────┬────────┘
                    │                              │
        ┌───────────┼───────────┐         ┌────────┼────────┐
        │           │           │         │        │        │
  ┌─────▼─────┬────▼────┬─────▼─────┐ ┌──▼───┬───▼───┬───▼────┐
  │ Payments  │ Tenants │Maintenanc │ │ Room │Payment│Mainten │
  │ Recording │  View   │  Tracking │ │ Info │History│Requests│
  └───────────┴─────────┴───────────┘ └──────┴───────┴────────┘

PERMISSIONS MATRIX:
┌────────────────────┬──────────┬──────────┬──────────┐
│      Module        │  Admin   │  Staff   │  Tenant  │
├────────────────────┼──────────┼──────────┼──────────┤
│ Buildings          │  CRUD    │  Read    │  None    │
│ Rooms              │  CRUD    │  Read    │  Read*   │
│ Tenants            │  CRUD    │  Read    │  Self*   │
│ Payments           │  CRUD    │  Create  │  Read*   │
│ Assets             │  CRUD    │  Read    │  None    │
│ Reports            │  All     │  Limited │  None    │
│ Analytics          │  All     │  Basic   │  None    │
│ Maintenance        │  CRUD    │  CRUD    │  Create  │
└────────────────────┴──────────┴──────────┴──────────┘
    * = Own records only
```

---

## 🚀 Getting Started

### System Access

**URL**: `http://localhost:3001` (Development) or `https://your-domain.com` (Production)

### User Roles

The system supports three user roles:

| Role | Access Level | Primary Functions |
|------|--------------|-------------------|
| **Admin** | Full System Access | Complete property management, user management, financial reports |
| **Staff** | Limited Access | Day-to-day operations, tenant management, maintenance |
| **Tenant** | View Only | Personal dashboard, payment history, maintenance requests |

---

## 🎫 How Tenants Get Access

### Important: No Self-Registration

**Tenants do NOT register themselves.** This is a managed property system where:
- ✅ Admin creates tenant accounts
- ✅ Admin provides login credentials
- ❌ Tenants cannot self-register

This ensures proper verification and security.

### Tenant Onboarding Process

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        TENANT ACCESS CREATION FLOW                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

STEP 1: ADMIN CREATES TENANT PROFILE + USER ACCOUNT
┌──────────────┐
│    ADMIN     │ Navigates to: /admin/tenants → "Add Tenant"
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  TENANT INFORMATION FORM                                                     │
│                                                                              │
│  Personal Information:                                                       │
│  ├─ First Name: Juan                                                        │
│  ├─ Last Name: Dela Cruz                                                    │
│  ├─ Email: juan.delacruz@email.com  ← This becomes login username          │
│  ├─ Phone: +63 917 123 4567                                                 │
│  └─ Date of Birth: MM/DD/YYYY                                               │
│                                                                              │
│  ⚠️  CREATE USER ACCOUNT (checked by default)                               │
│  ├─ ✅ Create portal login for this tenant                                  │
│  ├─ Password: [auto-generated OR admin sets]                                │
│  └─ Send Welcome Email: ☑ (with login credentials)                          │
│                                                                              │
│  Additional Details:                                                         │
│  ├─ Emergency Contact                                                        │
│  ├─ Employment Info                                                          │
│  └─ Security Deposit                                                         │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           ▼ ADMIN CLICKS "CREATE TENANT"
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/tenants                                                           │
│  {                                                                           │
│    "createUserAccount": true,    ← Creates both user + tenant               │
│    "email": "juan.delacruz@email.com",                                      │
│    "password": "Welcome2024!",   ← Admin sets or auto-generated             │
│    "firstName": "Juan",                                                      │
│    "lastName": "Dela Cruz",                                                  │
│    // ... other tenant details                                              │
│  }                                                                           │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           ▼ SYSTEM CREATES IN DATABASE
┌─────────────────────────────────────────────────────────────────────────────┐
│  TRANSACTION (Both tables in one operation):                                │
│                                                                              │
│  1. INSERT INTO users                       2. INSERT INTO tenants          │
│     ├─ email: juan.delacruz@email.com         ├─ user_id: [link to user]   │
│     ├─ password_hash: [bcrypt hashed]         ├─ first_name: Juan          │
│     ├─ role: 'tenant'                          ├─ last_name: Dela Cruz     │
│     ├─ first_name: Juan                        ├─ email: same as user      │
│     └─ last_name: Dela Cruz                    └─ status: 'pending'        │
│                                                                              │
│  3. Link: tenants.user_id → users.id                                        │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           ▼ STEP 2: CREDENTIALS DELIVERY
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADMIN PROVIDES CREDENTIALS TO TENANT:                                      │
│                                                                              │
│  Option A: Email (Automatic)                                                │
│  ├─ System sends welcome email                                              │
│  ├─ Contains: Login URL, Email, Temporary Password                          │
│  └─ Instructions to change password                                         │
│                                                                              │
│  Option B: In Person (Manual)                                               │
│  ├─ Admin prints welcome packet                                             │
│  ├─ Hands to tenant during lease signing                                    │
│  └─ Contains: Portal URL, Login credentials                                 │
│                                                                              │
│  Option C: SMS/WhatsApp                                                     │
│  ├─ Admin sends message with credentials                                    │
│  └─ Tenant confirms receipt                                                 │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           ▼ STEP 3: TENANT FIRST LOGIN
┌──────────────┐
│   TENANT     │ Visits: http://localhost:3001/auth/tenant/signin
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  TENANT LOGIN FORM                                                           │
│                                                                              │
│  Email: juan.delacruz@email.com    ← From welcome email                     │
│  Password: Welcome2024!            ← From admin                              │
│                                                                              │
│  [ Sign In to My Account ]                                                  │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           ▼ AUTHENTICATION SUCCESS
┌─────────────────────────────────────────────────────────────────────────────┐
│  Redirect to: /tenant (Tenant Dashboard)                                    │
│                                                                              │
│  Dashboard Shows:                                                            │
│  ├─ Welcome, Juan!                                                          │
│  ├─ Your Room: [Assignment info]                                            │
│  ├─ Next Payment Due: [Amount & Date]                                       │
│  ├─ Payment History                                                          │
│  └─ Quick Actions (Pay Rent, Maintenance, Documents)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Summary of Tenant Account Creation

| Step | Who | What Happens |
|------|-----|--------------|
| 1 | **Admin** | Creates tenant profile + user account via admin portal |
| 2 | **System** | Creates records in both `users` and `tenants` tables (linked) |
| 3 | **Admin** | Delivers login credentials to tenant (email/in-person/SMS) |
| 4 | **Tenant** | Receives credentials and logs in for the first time |
| 5 | **Tenant** | Accesses personal dashboard with all their information |

### Why Admin-Controlled?

1. **Security**: Ensures only verified tenants get access
2. **Data Integrity**: Admin enters complete information upfront
3. **Lease Link**: Account created when lease is signed
4. **No Duplicates**: Prevents multiple accounts for same person
5. **Proper Onboarding**: Tenant receives proper welcome and orientation

---

### First Time Login

#### For Admins (Self-Login):
1. Navigate to `http://localhost:3001/auth/admin/signin`
2. Enter credentials
3. Click "Sign In"

**Default Admin Credentials** (Change immediately after first login):
- Email: `admin@parenta.com`
- Password: `admin123`
- Role: `Admin`

#### For Tenants (Provided by Admin):
1. Receive credentials from property admin
2. Navigate to `http://localhost:3001/auth/tenant/signin`
3. Enter provided email and password
4. Click "Sign In to My Account"
5. (Optional) Change password after first login

**Demo Tenant Credentials** (For testing only):
- Email: `tenant@parenta.com`
- Password: `tenant123`
- Role: `Tenant`

---

## 👨‍💼 Admin User Flows

### Flow 1: Initial System Setup

**Objective**: Set up the property management system from scratch

#### Step 1: Login as Admin
```
1. Go to /auth/signin
2. Select "Admin" role
3. Enter credentials
4. Access Admin Dashboard
```

#### Step 2: Create First Building
```
Path: Admin Dashboard → "Add Building"

Required Information:
- Building Name: e.g., "Sunrise Apartments"
- Address: Full street address
- City: City name
- Total Floors: Number of floors
- Total Units: Number of rental units
- Building Type: Residential/Commercial
- Year Built: Construction year
- Manager Name: Building manager
- Contact Number: Manager's phone

Action: Click "Create Building"
Result: Building created, redirected to building details
```

#### Step 3: Add Rooms to Building
```
Path: Building Details → "Add Room"

For each room:
- Room Number: e.g., "101", "201A"
- Floor Number: Which floor
- Room Type: Studio/1BR/2BR/3BR
- Square Meters: Room size
- Rent Amount: Monthly rent
- Room Status: Available/Occupied/Maintenance
- Number of Bedrooms: 0-4
- Number of Bathrooms: 1-3
- Amenities: AC, Parking, Balcony, etc.

Action: Click "Add Room" for each unit
Result: Rooms added to building inventory
```

---

### Flow 2: Tenant Onboarding

**Objective**: Add new tenant and assign to a room

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                      TENANT ONBOARDING DATA FLOW                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌──────────────┐
│    ADMIN     │ Creates Tenant Profile
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────┐
│  POST /api/tenants                  │
│                                     │
│  Payload:                           │
│  • Personal Info                    │
│  • Emergency Contact                │
│  • Employment Details               │
│  • Financial Info                   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Database: tenants table            │
│  INSERT new tenant record           │
│  Status: "pending"                  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Tenant Created Successfully        │
│  Returns: Tenant ID                 │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────┐
│    ADMIN     │ Assigns Tenant to Room
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────┐
│  POST /api/rooms/[id]/assign        │
│                                     │
│  Payload:                           │
│  • tenantId                         │
│  • roomId                           │
│  • moveInDate                       │
│  • leaseEndDate                     │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Database Transaction:              │
│  1. tenant_room_assignments table   │
│  2. Update tenant status → "active" │
│  3. Update room status → "occupied" │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Assignment Complete                │
│  • Lease generated                  │
│  • First payment created            │
│  • Tenant notified                  │
└─────────────────────────────────────┘
```

#### Step 1: Create Tenant Profile
```
Path: Admin Dashboard → "Tenants" → "Add Tenant"

Personal Information:
- First Name: Juan
- Last Name: Dela Cruz
- Email: juan.delacruz@email.com
- Phone: +63 917 123 4567
- Date of Birth: MM/DD/YYYY

Emergency Contact:
- Name: Emergency contact name
- Phone: Emergency contact number
- Relationship: Wife/Husband/Parent/Sibling

Employment Information:
- Employment Status: Employed/Self-employed/Student
- Employer Name: Company name
- Monthly Income: Income amount
- Previous Address: Previous residence

Financial Information:
- Security Deposit: Amount paid
- Move-in Date: Start date

Action: Click "Create Tenant"
Result: Tenant profile created
```

#### Step 2: Assign Tenant to Room
```
Path: Tenant Details → "Assign to Room"

Assignment Details:
- Select Building: Choose from dropdown
- Select Room: Choose available room
- Move-in Date: Lease start date
- Lease End Date: Lease end date
- Monthly Rent: Confirm rent amount
- Special Terms: Any special conditions

Action: Click "Assign Room"
Result: 
- Tenant assigned to room
- Room status changes to "Occupied"
- Lease agreement generated
- First payment record created
```

---

### Flow 3: Payment Management

**Objective**: Track and manage tenant payments

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        PAYMENT PROCESSING FLOW                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌──────────────┐
│  STAFF/ADMIN │ Records Payment
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/payments                                                          │
│                                                                              │
│  Payload:                          Validation:                              │
│  • tenantId                        ✓ Tenant exists                          │
│  • amount                          ✓ Amount > 0                             │
│  • paymentType                     ✓ Valid payment type                     │
│  • paymentMethod                   ✓ Valid payment method                   │
│  • paymentDate                     ✓ Date not in future                     │
│  • referenceNumber                 ✓ Reference unique (optional)            │
│  • notes                                                                     │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Database: payments table                                                    │
│  INSERT payment record                                                       │
│  Status: "paid"                                                              │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           ├──────────────────────────┬──────────────────────┬─────────────────┐
           │                          │                      │                 │
           ▼                          ▼                      ▼                 ▼
    ┌─────────────┐          ┌─────────────┐        ┌─────────────┐   ┌──────────────┐
    │ Update      │          │ Generate    │        │ Send Email  │   │ Update       │
    │ Tenant      │          │ Receipt     │        │ Notification│   │ Dashboard    │
    │ Balance     │          │ (PDF)       │        │ to Tenant   │   │ Statistics   │
    └─────────────┘          └─────────────┘        └─────────────┘   └──────────────┘
           │                          │                      │                 │
           └──────────────────────────┴──────────────────────┴─────────────────┘
                                      │
                                      ▼
                              ┌─────────────────┐
                              │ Payment Success │
                              │ Status: 200     │
                              └─────────────────┘

PAYMENT STATUS LIFECYCLE:
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌──────────┐
│ PENDING ├────►│  PAID   ├────►│VERIFIED ├────►│ ARCHIVED │
└─────────┘     └────┬────┘     └─────────┘     └──────────┘
                     │
                     │ (if past due date)
                     ▼
                ┌─────────┐
                │OVERDUE  │
                └─────────┘
```

#### Viewing Payments Dashboard
```
Path: Admin Dashboard → "Payments"

Dashboard Shows:
- Total Payments Due: Current month
- Paid Payments: Completed transactions
- Pending Payments: Awaiting payment
- Overdue Payments: Past due date
- Total Revenue: This month/year

Filters Available:
- By Status: Paid/Pending/Overdue
- By Tenant: Select specific tenant
- By Building: Filter by property
- By Date Range: Custom date range
```

#### Recording a Payment
```
Path: Payments → "Record Payment"

Payment Information:
- Select Tenant: From dropdown
- Payment Type: Rent/Deposit/Late Fee/Utility/Other
- Amount: Payment amount
- Payment Method: Cash/Bank Transfer/Check/Online
- Payment Date: Transaction date
- Reference Number: Transaction reference
- Notes: Additional information

Action: Click "Record Payment"
Result: 
- Payment recorded in system
- Tenant account updated
- Receipt generated
- Email notification sent to tenant
```

#### Updating Payment Status
```
Path: Payments → Select Payment → "Update Status"

Status Options:
- Pending: Awaiting payment
- Paid: Payment received
- Overdue: Past due date
- Cancelled: Payment cancelled

Action: Update status and save
Result: Payment status updated, notifications sent
```

---

### Flow 4: Asset Management

**Objective**: Track property assets and their assignments

#### Adding an Asset
```
Path: Admin Dashboard → "Assets" → "Add Asset"

Asset Information:
- Asset Name: e.g., "Air Conditioner Unit"
- Asset Category: Furniture/Appliance/Electronics/Vehicle/Other
- Asset Type: Specific type within category
- Building: Where asset is located
- Purchase Date: When acquired
- Purchase Price: Original cost
- Current Value: Current valuation
- Condition: Excellent/Good/Fair/Poor
- Serial Number: Manufacturer serial
- Warranty: Warranty expiration date
- Notes: Additional details

Action: Click "Create Asset"
Result: Asset added to inventory
```

#### Assigning Asset to Room
```
Path: Assets → Select Asset → "Assign"

Assignment Details:
- Select Room: Choose room
- Select Tenant: Optional tenant assignment
- Assignment Date: When assigned
- Expected Return: If temporary
- Notes: Assignment notes

Action: Click "Assign Asset"
Result: 
- Asset status changed to "Assigned"
- Room shows asset in inventory
- Asset history updated
```

---

### Flow 5: Financial Reports

**Objective**: Generate and analyze financial reports

#### Revenue Report
```
Path: Admin Dashboard → "Reports" → "Revenue Report"

Configuration:
- Date Range: Start and end date
- Building: All or specific building
- Payment Type: All or specific type

Report Shows:
- Total Revenue: Paid payments
- Pending Revenue: Awaiting payment
- Overdue Revenue: Past due
- Revenue by Month: 12-month trend
- Revenue by Building: Building comparison
- Revenue by Category: Payment type breakdown

Actions:
- Export to PDF
- Export to Excel
- Print Report
- Email Report
```

#### Expense Report
```
Path: Admin Dashboard → "Reports" → "Expense Report"

Configuration:
- Date Range: Start and end date
- Building: All or specific building
- Category: All or specific category

Report Shows:
- Total Expenses: All expenses
- Expenses by Month: Monthly trend
- Expenses by Category: Category breakdown
- Expenses by Building: Building comparison
- Top Vendors: Vendor analysis

Actions:
- Export/Print/Email options
```

#### Profit & Loss Statement
```
Path: Admin Dashboard → "Reports" → "P&L Statement"

Configuration:
- Date Range: Fiscal period
- Building: All or specific

Report Shows:
- Revenue Section:
  - Rent Revenue
  - Other Revenue
  - Total Revenue
  
- Expense Section:
  - Maintenance
  - Utilities
  - Supplies
  - Services
  - Insurance
  - Taxes
  - Other
  - Total Expenses

- Summary:
  - Net Income: Revenue - Expenses
  - Profit Margin: (Net Income / Revenue) × 100%

Actions:
- Export/Print/Email options
```

#### Rent Roll Report
```
Path: Admin Dashboard → "Reports" → "Rent Roll"

Configuration:
- Building: Specific or all buildings

Report Shows:
- Total Units: Number of rooms
- Occupied Units: Current occupancy
- Vacant Units: Available rooms
- Occupancy Rate: Percentage occupied
- Total Monthly Rent: Expected income
- Unit Details:
  - Room Number
  - Tenant Name
  - Rent Amount
  - Lease Start/End
  - Status

Actions:
- Export/Print/Email options
```

---

### Flow 6: Utilities Management

**Objective**: Track utility bills and allocate costs

#### Creating Utility Bill
```
Path: Admin Dashboard → "Utilities" → "Add Bill"

Bill Information:
- Building: Select building
- Room: Optional specific room
- Utility Type: Electricity/Water/Gas/Internet/Cable/Waste
- Billing Period: Start and end date
- Due Date: Payment deadline
- Amount: Bill amount
- Provider: Utility company
- Account Number: Provider account
- Meter Reading: Current reading
- Status: Pending/Paid/Overdue
- Notes: Additional information

Action: Click "Create Bill"
Result: 
- Utility bill recorded
- Can be allocated to tenants
- Payment tracking enabled
```

#### Managing Utility Bills
```
Path: Utilities → View Bills

Available Actions:
- Mark as Paid: Update status
- Edit Bill: Modify details
- Delete Bill: Remove record
- Allocate to Tenants: Divide costs
- View History: Past bills

Filters:
- By Type: Electricity, Water, etc.
- By Status: Pending/Paid/Overdue
- By Building: Specific property
- By Date: Date range
```

---

### Flow 7: Analytics Dashboard

**Objective**: Monitor key performance indicators

#### Accessing Analytics
```
Path: Admin Dashboard → "Analytics"

Available Charts:

1. Revenue Trend
   - Monthly breakdown
   - Paid vs Pending vs Overdue
   - 12-month historical data

2. Expense Breakdown
   - By category with percentages
   - Monthly trends
   - Top expense categories

3. Occupancy Trend
   - Per building statistics
   - Occupied/Vacant/Maintenance
   - Occupancy rate over time

4. Payment Status Distribution
   - Paid/Pending/Overdue counts
   - Total amounts per status

5. Tenant Distribution
   - Active/Pending by building
   - Building comparison

6. Financial Summary
   - Total revenue
   - Total expenses
   - Net profit
   - Profit margin

7. Maintenance Statistics
   - Pending/In-progress/Completed
   - Response time metrics

8. Asset Utilization
   - By category utilization rates
   - Assigned/Available/Maintenance
   - Utilization percentage

Filters:
- Date Range: Custom period
- Building: Specific or all
- Export: Download as image/PDF
```

---

### Flow 8: Expense Management

**Objective**: Track and categorize expenses

#### Recording an Expense
```
Path: Admin Dashboard → "Expenses" → "Add Expense"

Expense Information:
- Building: Select building (optional)
- Room: Select room (optional)
- Category: Maintenance/Utilities/Supplies/Services/Insurance/Taxes/Other
- Amount: Expense amount
- Description: What was purchased/paid for
- Vendor: Who was paid
- Expense Date: When incurred
- Receipt URL: Link to receipt (optional)
- Notes: Additional details

Action: Click "Record Expense"
Result: Expense logged in system
```

#### Managing Expenses
```
Path: Expenses → View All

Available Actions:
- Edit Expense: Update details
- Delete Expense: Remove record
- View Receipt: Open receipt document
- Filter: By category, date, building
- Search: By vendor or description

Expense Summary Shows:
- Total expenses this month
- Expenses by category
- Top vendors
- Monthly trend
```

---

## 👥 Staff User Flows

### Flow 1: Daily Operations

**Objective**: Handle routine property management tasks

#### Login and Dashboard
```
1. Navigate to /auth/signin
2. Select "Staff" role
3. Enter credentials
4. Access Staff Dashboard

Staff Dashboard Shows:
- Today's Tasks
- Pending Maintenance Requests
- Recent Tenant Inquiries
- Upcoming Lease Renewals
- Payment Reminders
```

#### Recording Tenant Payment
```
Path: Staff Dashboard → "Payments" → "Record Payment"

Process:
1. Select tenant from list
2. Enter payment details
3. Choose payment method
4. Add reference number
5. Save payment record

Result: Payment recorded and tenant notified
```

#### Handling Maintenance Request
```
Path: Staff Dashboard → "Maintenance" → View Request

Actions Available:
1. View Request Details
2. Assign to Maintenance Staff
3. Update Status:
   - Pending → In Progress → Completed
4. Add Notes/Comments
5. Upload Photos (before/after)
6. Record Expenses (if any)

Result: Maintenance tracked and documented
```

---

### Flow 2: Tenant Communication

**Objective**: Manage tenant interactions

#### Viewing Tenant Information
```
Path: Staff Dashboard → "Tenants" → Select Tenant

Tenant Profile Shows:
- Personal information
- Current room assignment
- Lease details
- Payment history
- Maintenance requests
- Documents
- Communication log

Available Actions:
- Send notification
- Update profile
- View payment history
- Schedule inspection
```

#### Sending Notifications
```
Path: Tenant Profile → "Send Notification"

Notification Types:
- Payment Reminder
- Lease Renewal Notice
- Maintenance Schedule
- Building Announcement
- Custom Message

Process:
1. Select notification type
2. Choose recipients (individual/group/all)
3. Write message
4. Select delivery method (Email/SMS/In-app)
5. Schedule or send immediately

Result: Notifications sent and logged
```

---

## 🏠 Tenant User Flows

### Flow 1: Tenant Dashboard

**Objective**: Access personal property information

#### Login and Overview
```
1. Navigate to /auth/signin
2. Select "Tenant" role
3. Enter credentials (email + password)
4. Access Tenant Dashboard

Dashboard Shows:
- Current Room Details
- Next Payment Due
- Payment History (last 6 months)
- Active Maintenance Requests
- Building Announcements
- Documents (Lease, receipts, etc.)
- Profile Information
```

#### Viewing Room Details
```
Path: Tenant Dashboard → "My Room"

Information Displayed:
- Room Number
- Building Name
- Address
- Room Type (1BR, 2BR, etc.)
- Square Meters
- Amenities
- Monthly Rent
- Lease Start Date
- Lease End Date
- Assigned Assets (furniture, appliances)
```

---

### Flow 2: Payment Information

**Objective**: View payment history and dues

#### Viewing Payment History
```
Path: Tenant Dashboard → "Payments"

Payment List Shows:
- Payment Date
- Amount Paid
- Payment Type (Rent, Deposit, etc.)
- Payment Method
- Reference Number
- Receipt (Download)
- Status (Paid/Pending/Overdue)

Filters:
- By Date Range
- By Payment Type
- By Status

Actions:
- Download Receipt
- View Payment Details
- Request Payment Proof
```

#### Checking Current Balance
```
Path: Tenant Dashboard → "Payments" → "Current Balance"

Balance Summary Shows:
- Next Payment Due: Date and amount
- Outstanding Balance: If any
- Last Payment: Date and amount
- Payment History: Recent transactions
- Payment Instructions: How to pay

Available Actions:
- View Payment Details
- Download Statement
- Contact Property Manager
```

---

### Flow 3: Maintenance Requests

**Objective**: Report and track maintenance issues

#### Submitting Maintenance Request
```
Path: Tenant Dashboard → "Maintenance" → "New Request"

Request Form:
- Issue Category:
  - Plumbing
  - Electrical
  - Appliance
  - HVAC
  - Structural
  - Other
  
- Priority:
  - Emergency (24h)
  - High (48h)
  - Medium (1 week)
  - Low (As scheduled)

- Description: Detailed issue description
- Location: Specific area (Kitchen, Bathroom, etc.)
- Photos: Upload images (optional)
- Preferred Time: When you're available
- Contact Phone: Best number to reach you

Action: Click "Submit Request"
Result: 
- Request logged
- Ticket number generated
- Email confirmation sent
- Staff notified
```

#### Tracking Maintenance Requests
```
Path: Tenant Dashboard → "Maintenance"

Request List Shows:
- Ticket Number
- Date Submitted
- Issue Category
- Priority Level
- Current Status:
  - Pending (Not yet assigned)
  - In Progress (Being worked on)
  - Completed (Issue resolved)
  - Closed (Confirmed by tenant)
- Assigned To: Staff member name
- Expected Resolution: Estimated date

Actions Per Request:
- View Details
- Add Comments
- Upload Additional Photos
- Confirm Completion
- Rate Service (after completion)
```

---

### Flow 4: Documents and Profile

**Objective**: Access documents and manage profile

#### Viewing Documents
```
Path: Tenant Dashboard → "Documents"

Available Documents:
- Lease Agreement: Current contract
- Payment Receipts: All receipts
- Move-in Checklist: Initial inspection
- Move-out Checklist: Final inspection
- Building Rules: Regulations
- Announcements: Important notices
- Insurance Documents: If applicable

Actions:
- Download Document
- Print Document
- Request Document (if missing)
```

#### Updating Profile
```
Path: Tenant Dashboard → "Profile"

Editable Information:
- Phone Number
- Email Address (with verification)
- Emergency Contact:
  - Name
  - Phone
  - Relationship
- Password Change
- Notification Preferences

Non-Editable (Contact Admin):
- Name
- Room Assignment
- Lease Terms
- Payment Terms

Action: Update and save changes
Result: Profile updated, verification if needed
```

---

## 🎯 Complete Business Scenarios

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                      COMPLETE BUSINESS SCENARIOS                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

SCENARIO 1: New Property Setup          [Timeline: 7 days]
SCENARIO 2: Monthly Operations          [Timeline: 30 days, recurring]
SCENARIO 3: Tenant Move-Out             [Timeline: 35 days]
SCENARIO 4: Emergency Maintenance       [Timeline: 2 hours]
SCENARIO 5: Financial Reporting         [Timeline: Quarterly]
```

### Scenario 1: New Property Setup (Full Cycle)

**Timeline**: Day 1-7

#### Day 1: Initial Setup
```
Admin Actions:
1. Login to system
2. Create building profile
   - Name: "Sunrise Residences"
   - Address: "123 Main St, Manila"
   - 5 floors, 20 units total
   
3. Add rooms:
   - Floor 1: Units 101-104 (Studio, 25sqm, ₱10,000/mo)
   - Floor 2: Units 201-204 (1BR, 35sqm, ₱15,000/mo)
   - Floor 3: Units 301-304 (2BR, 50sqm, ₱20,000/mo)
   - Floor 4: Units 401-404 (2BR, 50sqm, ₱20,000/mo)
   - Floor 5: Units 501-504 (3BR, 65sqm, ₱25,000/mo)

4. Add property assets:
   - AC units for each room
   - Common area furniture
   - Maintenance equipment
   - Security cameras

Result: Property fully set up in system
```

#### Day 2-5: Tenant Onboarding
```
Admin Actions:
1. Create tenant profiles (as applications come in)
2. Process each tenant:
   - Verify employment
   - Check references
   - Calculate deposits
   - Create lease agreement
   
3. Assign tenants to rooms:
   - Juan Dela Cruz → Unit 201
   - Maria Santos → Unit 301
   - Robert Garcia → Unit 401
   - (Continue for all tenants)

4. Generate first month invoices
5. Send welcome emails with login credentials

Result: 15 units occupied, 5 vacant
```

#### Day 6-7: Initial Operations
```
Staff Actions:
1. Conduct move-in inspections
2. Record condition reports
3. Hand over keys
4. Collect initial payments
5. Upload signed documents

Result: All tenants moved in and active
```

---

### Scenario 2: Monthly Operations (Recurring)

**Timeline**: Every Month

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                   MONTHLY OPERATIONS WORKFLOW (30 DAYS)                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

DAY 1: MONTH-END CLOSING
┌─────────────────────────────────────────────────────────────────────────────┐
│ Admin generates reports:                                                     │
│ ├─ Revenue Report (previous month)                                          │
│ ├─ Expense Report (previous month)                                          │
│ ├─ Occupancy Report                                                         │
│ └─ P&L Statement                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▼
DAY 1-5: INVOICE GENERATION
┌─────────────────────────────────────────────────────────────────────────────┐
│ System auto-generates:                                                       │
│ ├─ Monthly rent invoices                                                    │
│ ├─ Utility charges (if applicable)                                          │
│ ├─ Late fees (if applicable)                                                │
│ └─ Email/SMS notifications sent                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▼
DAY 5-10: PAYMENT COLLECTION
┌─────────────────────────────────────────────────────────────────────────────┐
│ Staff monitors & records:                                                    │
│ ├─ Cash/check payments                                                      │
│ ├─ Bank transfers                                                           │
│ ├─ Online payments                                                          │
│ └─ Send receipts immediately                                                │
│                                                                              │
│ Target Collection Rate: 90%+                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▼
DAY 11-15: PAYMENT FOLLOW-UP
┌─────────────────────────────────────────────────────────────────────────────┐
│ Staff actions for overdue:                                                   │
│ ├─ Day 6:  Friendly reminder                                                │
│ ├─ Day 8:  Formal notice                                                    │
│ ├─ Day 10: Final warning                                                    │
│ └─ Day 12: Late fee added                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▼
DAY 16-30: ONGOING OPERATIONS
┌─────────────────────────────────────────────────────────────────────────────┐
│ Daily Tasks:                                                                 │
│ ├─ Process maintenance requests (avg 2-3/day)                               │
│ ├─ Handle tenant inquiries                                                  │
│ ├─ Conduct scheduled inspections                                            │
│ └─ Update system records                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CYCLE REPEATS NEXT MONTH                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Day 1: Month-End Closing
```
Admin Actions:
1. Generate all reports:
   - Revenue report (previous month)
   - Expense report (previous month)
   - Occupancy report
   - P&L Statement

2. Review metrics:
   - Occupancy rate: 75%
   - Collection rate: 95%
   - Maintenance response time: 24h avg
   - Tenant satisfaction: 4.5/5

3. Prepare board presentation
4. Archive previous month data

Result: Month closed, reports ready
```

#### Day 1-5: Invoice Generation
```
System/Admin Actions:
1. Auto-generate monthly rent invoices
2. Add utility charges (if applicable)
3. Include any late fees
4. Send invoice emails to all tenants
5. SMS reminders to tenants with due dates

Result: All invoices distributed
```

#### Day 5-10: Payment Collection
```
Staff Actions:
1. Monitor incoming payments
2. Record all payments received:
   - Cash/check at office
   - Bank transfers
   - Online payments
   
3. Send receipts immediately
4. Update payment status in system
5. Follow up on pending payments

Result: 90%+ collection rate
```

#### Day 11-15: Payment Follow-up
```
Staff Actions:
1. Identify overdue accounts
2. Send reminder notices:
   - Day 6: Friendly reminder
   - Day 8: Formal notice
   - Day 10: Final warning
   - Day 12: Late fee added

3. Contact tenants directly
4. Arrange payment plans if needed

Result: Outstanding payments reduced
```

#### Day 16-30: Ongoing Operations
```
Daily Tasks:
1. Process maintenance requests
   - Average 2-3 per day
   - Log, assign, track, complete
   
2. Handle tenant inquiries
   - Answer questions
   - Provide assistance
   - Log all interactions

3. Conduct inspections
   - Scheduled quarterly
   - Random spot checks
   - Move-in/move-out

4. Update system records
   - Payment updates
   - Maintenance logs
   - Tenant communications

Result: Smooth daily operations
```

---

### Scenario 3: Tenant Move-Out Process

**Timeline**: 30 days notice to move-out complete

#### Day 1: Move-Out Notice
```
Tenant Action:
1. Login to portal
2. Submit move-out notice
   - Intended date: 30 days from now
   - Reason: Relocating for work
   - Forwarding address: For deposit return

Result: Notice logged, admin notified
```

#### Day 1-30: Admin Processing
```
Admin Actions:
1. Acknowledge receipt of notice
2. Schedule final inspection
3. Calculate final charges:
   - Outstanding rent
   - Utility bills
   - Any damages
   
4. Prepare deposit refund calculation
5. Schedule unit preparation for next tenant

Result: Move-out scheduled and planned
```

#### Day 30: Move-Out Day
```
Staff Actions:
1. Conduct walk-through inspection
   - Check all rooms
   - Document condition
   - Take photos
   - Note any damages
   
2. Compare to move-in checklist
3. Collect keys and access cards
4. Calculate final charges:
   - Security deposit: ₱20,000
   - Damages: -₱2,000
   - Cleaning fee: -₱1,000
   - Refund due: ₱17,000

5. Update system:
   - Tenant status: Inactive
   - Room status: Vacant (Cleaning)
   - Final settlement processed

Result: Tenant moved out, unit ready for turnover
```

#### Day 31-35: Unit Turnover
```
Staff Actions:
1. Deep cleaning
2. Minor repairs
3. Paint touch-up
4. Check all utilities
5. Test all amenities
6. Final inspection
7. Update status: Available
8. Post listing for new tenant

Result: Unit ready for occupancy
```

---

### Scenario 4: Emergency Maintenance

**Timeline**: Immediate to 24 hours

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                   EMERGENCY MAINTENANCE RESPONSE FLOW                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

HOUR 0:00 - TENANT REPORTS ISSUE
┌──────────────┐
│   TENANT     │ Submits emergency maintenance request
└──────┬───────┘
       │ Category: Plumbing | Priority: EMERGENCY
       ▼
┌─────────────────────────────────────┐
│  POST /api/maintenance/requests     │
│  • Issue: "Toilet overflowing"      │
│  • Photos: Uploaded                 │
│  • Time: 10:00 PM                   │
└──────────┬──────────────────────────┘
           │
           ▼ HOUR 0:05 - SYSTEM NOTIFIES
┌─────────────────────────────────────┐
│  Automated Notifications:           │
│  ├─ Push → On-duty staff            │
│  ├─ SMS → Property manager          │
│  ├─ Email → Maintenance team        │
│  └─ Ticket: EMRG-001                │
└──────────┬──────────────────────────┘
           │
           ▼ HOUR 0:15 - STAFF RESPONDS
┌─────────────────────────────────────┐
│  Staff Actions:                     │
│  1. Call tenant to assess           │
│  2. Provide immediate advice        │
│  3. Dispatch maintenance            │
│  4. ETA: 30 minutes                 │
│  5. Update status: "In Progress"    │
└──────────┬──────────────────────────┘
           │
           ▼ HOUR 0:45 - ON-SITE RESOLUTION
┌─────────────────────────────────────┐
│  Maintenance Team:                  │
│  ├─ Arrive at unit                  │
│  ├─ Assess situation                │
│  ├─ Perform emergency repair        │
│  ├─ Clean up area                   │
│  ├─ Test functionality              │
│  └─ Get tenant confirmation         │
└──────────┬──────────────────────────┘
           │
           ▼ HOUR 2:00 - FOLLOW-UP
┌─────────────────────────────────────┐
│  Admin Actions:                     │
│  ├─ Review ticket                   │
│  ├─ Send satisfaction survey        │
│  ├─ Log expense (₱1,500)            │
│  └─ Close ticket                    │
└─────────────────────────────────────┘

RESPONSE TIME TARGETS:
┌──────────────┬──────────────┬──────────────┐
│   Priority   │  Response    │  Resolution  │
├──────────────┼──────────────┼──────────────┤
│ EMERGENCY    │  < 30 min    │  < 2 hours   │
│ HIGH         │  < 4 hours   │  < 24 hours  │
│ MEDIUM       │  < 24 hours  │  < 3 days    │
│ LOW          │  < 48 hours  │  < 1 week    │
└──────────────┴──────────────┴──────────────┘
```

#### Hour 0: Issue Reported
```
Tenant Action:
1. Login to portal
2. Create maintenance request:
   - Category: Plumbing
   - Priority: EMERGENCY
   - Issue: "Toilet overflowing in bathroom"
   - Photos: Uploaded
   - Time: 10:00 PM

Result: Emergency ticket created
```

#### Hour 0+5min: Staff Notification
```
System Action:
- Push notification to on-duty staff
- SMS alert to property manager
- Email to maintenance team
- Ticket number: EMRG-001

Result: All relevant staff notified immediately
```

#### Hour 0+15min: Initial Response
```
Staff Action:
1. Call tenant to assess severity
2. Provide immediate advice:
   - "Shut off water valve"
   - "We're sending someone now"
   
3. Dispatch maintenance:
   - Assign to: Emergency Plumber
   - ETA: 30 minutes
   - Status: In Progress

4. Update tenant via SMS:
   - "Help is on the way, ETA 10:30 PM"

Result: Emergency response activated
```

#### Hour 0+45min: On-Site Resolution
```
Maintenance Action:
1. Arrive at unit
2. Assess situation
3. Perform emergency repair
4. Clean up area
5. Test functionality
6. Get tenant confirmation

7. Update system:
   - Status: Resolved
   - Time spent: 1.5 hours
   - Materials used: Logged
   - Photos: Before/After

Result: Emergency resolved
```

#### Hour 0+2hours: Follow-up
```
Admin Actions:
1. Review ticket
2. Send satisfaction survey
3. Log expense:
   - Category: Maintenance
   - Amount: ₱1,500
   - Vendor: Emergency Plumber
   - Building: Charged to building
   
4. Update tenant:
   - Thank you message
   - Confirm resolution
   - Request feedback

Result: Emergency closed, documented
```

---

### Scenario 5: Financial Reporting Period

**Timeline**: End of Quarter

#### Week 1: Data Compilation
```
Admin Actions:
1. Generate quarterly reports:
   
   A. Revenue Report (Q1)
   - Rent revenue: ₱1,200,000
   - Utility charges: ₱180,000
   - Late fees: ₱15,000
   - Other income: ₱25,000
   - Total: ₱1,420,000
   
   B. Expense Report (Q1)
   - Maintenance: ₱180,000
   - Utilities: ₱120,000
   - Supplies: ₱45,000
   - Services: ₱90,000
   - Insurance: ₱60,000
   - Taxes: ₱75,000
   - Other: ₱30,000
   - Total: ₱600,000
   
   C. Profit & Loss
   - Revenue: ₱1,420,000
   - Expenses: ₱600,000
   - Net Income: ₱820,000
   - Profit Margin: 57.7%

2. Analyze trends:
   - Occupancy: 85% average
   - Collection rate: 96%
   - Maintenance costs: Within budget
   - Tenant satisfaction: 4.6/5

Result: Complete financial picture
```

#### Week 2: Report Preparation
```
Admin Actions:
1. Create presentation slides
2. Prepare detailed breakdown by:
   - Building
   - Unit type
   - Month
   - Category

3. Include visualizations:
   - Revenue trend chart
   - Expense breakdown pie chart
   - Occupancy rate line graph
   - Cash flow analysis

4. Add executive summary
5. Include recommendations

Result: Professional report package
```

#### Week 3: Stakeholder Review
```
Admin Actions:
1. Present to property owner/board
2. Discuss findings
3. Address questions
4. Document feedback
5. Plan improvements

Result: Stakeholder alignment
```

#### Week 4: Action Planning
```
Admin Actions:
1. Implement approved changes:
   - Rent adjustments
   - Budget reallocation
   - Process improvements
   
2. Update system:
   - New pricing
   - Modified procedures
   - Updated policies

3. Communicate changes:
   - Staff training
   - Tenant notifications
   - Documentation updates

Result: Changes implemented
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Issue 1: Cannot Login
```
Problem: "Invalid credentials" error

Solutions:
1. Verify you're using correct email
2. Check password (case-sensitive)
3. Ensure correct role selected
4. Clear browser cache
5. Try password reset
6. Contact admin if still failing

Admin Action:
- Check user account status
- Verify email is correct
- Reset password if needed
- Check role assignment
```

#### Issue 2: Payment Not Showing
```
Problem: Recorded payment not visible

Solutions:
1. Check payment status filter
2. Verify date range filter
3. Refresh the page
4. Check if payment was saved
5. Review payment tenant assignment

Admin Action:
- Check database entry
- Verify payment record
- Re-sync if needed
- Manual correction if required
```

#### Issue 3: Cannot Generate Report
```
Problem: Report generation fails

Solutions:
1. Check date range is valid
2. Ensure data exists for period
3. Try smaller date range
4. Check internet connection
5. Try different browser

Admin Action:
- Check system logs
- Verify database connection
- Check for data consistency
- Contact support if needed
```

#### Issue 4: Maintenance Request Not Updating
```
Problem: Status not changing

Solutions:
1. Ensure you have permission
2. Check internet connection
3. Verify all required fields filled
4. Try refreshing page
5. Relog into system

Staff Action:
- Check user role permissions
- Verify workflow rules
- Check for system errors
- Escalate if needed
```

#### Issue 5: Room Shows as Occupied When Vacant
```
Problem: Room status incorrect

Solutions:
1. Check tenant assignment
2. Verify move-out was processed
3. Review lease end date
4. Check for system updates

Admin Action:
- Manually update room status
- Check tenant records
- Verify no overlapping assignments
- Update system
```

---

## 📱 Mobile Access

### Mobile-Friendly Features

The system is mobile-responsive and works on:
- Smartphones (iOS/Android)
- Tablets
- Any modern browser

**Mobile Optimized Flows:**
1. Quick payment recording
2. Maintenance request submission
3. Tenant information lookup
4. Payment history viewing
5. Dashboard statistics

---

## 🎓 Best Practices

### For Admins
1. Regular data backup (weekly)
2. Monthly report generation
3. Quarterly system review
4. Annual user training
5. Keep contact information updated
6. Document all major decisions
7. Maintain audit trail

### For Staff
1. Respond to inquiries within 24h
2. Log all tenant interactions
3. Update maintenance requests promptly
4. Verify all payment information
5. Document everything
6. Follow up on pending items

### For Tenants
1. Report issues promptly
2. Keep contact info updated
3. Pay rent on time
4. Review lease terms regularly
5. Document communications
6. Save all receipts

---

## 📊 Key Performance Indicators

Track these metrics for success:

| Metric | Target | Good | Excellent |
|--------|--------|------|-----------|
| Occupancy Rate | 80% | 85% | 90%+ |
| Collection Rate | 90% | 95% | 98%+ |
| Maintenance Response | <48h | <24h | <12h |
| Tenant Satisfaction | 3.5/5 | 4.0/5 | 4.5/5 |
| Profit Margin | 40% | 50% | 60%+ |

---

## 🆘 Support

### Getting Help

**Technical Issues:**
- Email: support@parenta.com
- Phone: +63 (2) 1234-5678
- Hours: Mon-Fri 9AM-6PM

**Emergency Support:**
- Hotline: +63 917 PARENTA
- Available: 24/7 for emergencies

**Documentation:**
- User guides: `/docs`
- Video tutorials: Available in dashboard
- FAQ: Help section in app

---

**Document Version**: 1.0  
**Last Updated**: October 28, 2025  
**Next Review**: November 28, 2025

---

✅ **User Flow Guide Complete**  
Your comprehensive guide to using the Parenta Property Management System

