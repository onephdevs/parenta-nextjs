# Application Module Flow - Complete Sequence Documentation

**Purpose**: Document the complete sequence flow of all modules in the Parenta Property Management System, focusing on the building deposit config system integration.

---

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYERS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  PRESENTATION LAYER                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Reservations │  │ Assignments  │  │ Buildings    │  │ Move-Out    │ │
│  │   Modal      │  │  Manager     │  │  Config      │  │ Processing  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                 │                  │         │
├─────────┼──────────────────┼─────────────────┼──────────────────┼─────────┤
│         │                  │                 │                  │         │
│  API LAYER                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ /api/        │  │ /api/rooms/  │  │ /api/        │  │ /api/       │ │
│  │ reservations │  │ [id]/assign  │  │ building-    │  │ moveout     │ │
│  │              │  │              │  │ deposit-     │  │             │ │
│  │              │  │              │  │ config       │  │             │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                 │                  │         │
├─────────┼──────────────────┼─────────────────┼──────────────────┼─────────┤
│         │                  │                 │                  │         │
│  BUSINESS LOGIC LAYER                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ reservations │  │ rooms.ts     │  │ building-    │  │ lease-      │ │
│  │ .ts          │  │              │  │ deposit-     │  │ management │ │
│  │              │  │              │  │ config.ts    │  │ service.ts  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                 │                  │         │
├─────────┼──────────────────┼─────────────────┼──────────────────┼─────────┤
│         │                  │                 │                  │         │
│  DATA ACCESS LAYER                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ PostgreSQL   │  │ Connection   │  │ Transactions │  │ Queries     │ │
│  │  Database    │  │   Pool       │  │  Management  │  │ Execution   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flow 1: Create Reservation - Complete Sequence

### Visual Flow

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 1. Click "Create Reservation"
       ▼
┌─────────────────────────────┐
│ CreateReservationModal       │
│ (Frontend Component)         │
└──────┬──────────────────────┘
       │
       │ 2. User selects room
       ▼
┌─────────────────────────────┐
│ useEffect: Room Selected     │
│ - Get room.buildingId        │
│ - Call fetchBuildingDeposit  │
│   Config(buildingId)         │
└──────┬──────────────────────┘
       │
       │ 3. GET /api/building-deposit-config?buildingId=xxx
       ▼
┌─────────────────────────────┐
│ API Route Handler            │
│ /api/building-deposit-config │
│ route.ts                     │
└──────┬──────────────────────┘
       │
       │ 4. getBuildingDepositConfig(buildingId)
       ▼
┌─────────────────────────────┐
│ Business Logic              │
│ building-deposit-config.ts   │
└──────┬──────────────────────┘
       │
       │ 5. SELECT * FROM building_deposit_config
       │    WHERE building_id = $1
       ▼
┌─────────────────────────────┐
│ PostgreSQL Database          │
│ building_deposit_config      │
└──────┬──────────────────────┘
       │
       │ 6. Return config data
       ▼
┌─────────────────────────────┐
│ Business Logic              │
│ - Calculate required deposit│
│ - Calculate required advance│
│ - Get utility deposit        │
└──────┬──────────────────────┘
       │
       │ 7. GET /api/building-deposit-config/{id}?action=calculate
       ▼
┌─────────────────────────────┐
│ API Route Handler           │
│ [buildingId]/route.ts        │
└──────┬──────────────────────┘
       │
       │ 8. Return calculated amounts
       ▼
┌─────────────────────────────┐
│ CreateReservationModal       │
│ - Set requiredDeposit        │
│ - Set requiredAdvance        │
│ - Set requiredUtility        │
│ - Display in UI              │
└──────┬──────────────────────┘
       │
       │ 9. User fills form & submits
       ▼
┌─────────────────────────────┐
│ Form Validation              │
│ - Deposit > 0                │
│ - Deposit >= required        │
│ - Advance >= required (if)   │
│ - Utility >= required (if)  │
└──────┬──────────────────────┘
       │
       │ 10. POST /api/reservations
       ▼
┌─────────────────────────────┐
│ API Route Handler            │
│ /api/reservations/route.ts   │
│ - Authenticate user          │
│ - Validate input             │
└──────┬──────────────────────┘
       │
       │ 11. createReservation(data, userId)
       ▼
┌─────────────────────────────┐
│ Business Logic              │
│ reservations.ts             │
│ - Get building config        │
│ - Validate amounts           │
│ - Calculate validity date    │
└──────┬──────────────────────┘
       │
       │ 12. BEGIN TRANSACTION
       ▼
┌─────────────────────────────┐
│ Database Operations         │
│ (Within Transaction)        │
│ 1. INSERT INTO payments     │
│ 2. INSERT INTO reservations │
│ 3. UPDATE rooms             │
└──────┬──────────────────────┘
       │
       │ 13. COMMIT TRANSACTION
       ▼
┌─────────────────────────────┐
│ Response to Frontend        │
│ - Success notification       │
│ - Close modal               │
│ - Refresh list              │
└─────────────────────────────┘
```

### Step-by-Step Sequence

| Step | Module | Action | Data Flow |
|------|--------|--------|-----------|
| **1** | `CreateReservationModal.tsx` | User clicks "Create Reservation" | Modal opens |
| **2** | `CreateReservationModal.tsx` | User selects room | `formData.roomId` set |
| **3** | `CreateReservationModal.tsx` | `useEffect` triggers | `fetchBuildingDepositConfig(room.buildingId)` |
| **4** | `CreateReservationModal.tsx` | HTTP GET request | `GET /api/building-deposit-config?buildingId={id}` |
| **5** | `route.ts` | Route handler | `getBuildingDepositConfig(buildingId)` |
| **6** | `building-deposit-config.ts` | Database query | `SELECT * FROM building_deposit_config WHERE building_id = $1` |
| **7** | PostgreSQL | Return config | Config data or null |
| **8** | `building-deposit-config.ts` | Calculate amounts | `calculateRequiredDeposit()`, `calculateRequiredAdvance()`, `getUtilityDeposit()` |
| **9** | `CreateReservationModal.tsx` | Update state | `setRequiredDeposit()`, `setRequiredAdvance()`, `setRequiredUtility()` |
| **10** | `CreateReservationModal.tsx` | Display in UI | Show required amounts, auto-fill deposit |
| **11** | `CreateReservationModal.tsx` | User submits form | `handleSubmit()` called |
| **12** | `CreateReservationModal.tsx` | Client validation | Check deposit > 0, meet minimums |
| **13** | `CreateReservationModal.tsx` | HTTP POST request | `POST /api/reservations` with form data |
| **14** | `route.ts` | Route handler | Authenticate, validate, call `createReservation()` |
| **15** | `reservations.ts` | Get building config | `getBuildingDepositConfig(buildingId)` |
| **16** | `reservations.ts` | Validate amounts | Check deposit/advance/utility meet requirements |
| **17** | `reservations.ts` | Calculate validity | `getDepositValidityDate(buildingId, date)` |
| **18** | `reservations.ts` | BEGIN TRANSACTION | Start database transaction |
| **19** | `reservations.ts` | Create payment | `INSERT INTO payments` for deposit |
| **20** | `reservations.ts` | Create reservation | `INSERT INTO reservations` with all fields |
| **21** | `reservations.ts` | Update room | `UPDATE rooms SET room_status = 'reserved'` |
| **22** | `reservations.ts` | COMMIT TRANSACTION | Commit all changes |
| **23** | `CreateReservationModal.tsx` | Show success | Notification, close modal, refresh |

---

## 🔄 Flow 2: Assign Tenant - Complete Sequence

### Visual Flow

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 1. Click "Assign Tenant"
       ▼
┌─────────────────────────────┐
│ TenantAssignmentManager      │
│ (Frontend Component)         │
└──────┬──────────────────────┘
       │
       │ 2. useEffect: Fetch room building ID
       │    GET /api/rooms/{roomId}
       ▼
┌─────────────────────────────┐
│ API Route Handler            │
│ /api/rooms/[id]/route.ts     │
└──────┬──────────────────────┘
       │
       │ 3. Return room with buildingId
       ▼
┌─────────────────────────────┐
│ TenantAssignmentManager      │
│ - Extract buildingId         │
│ - Call fetchBuildingDeposit  │
│   Config(buildingId)         │
└──────┬──────────────────────┘
       │
       │ 4. GET /api/building-deposit-config?buildingId=xxx
       ▼
┌─────────────────────────────┐
│ Business Logic              │
│ building-deposit-config.ts   │
│ - Get config                 │
│ - Calculate amounts          │
└──────┬──────────────────────┘
       │
       │ 5. Return calculated amounts
       ▼
┌─────────────────────────────┐
│ TenantAssignmentManager      │
│ - Display required amounts   │
│ - Show form fields           │
└──────┬──────────────────────┘
       │
       │ 6. User fills & submits
       ▼
┌─────────────────────────────┐
│ Form Validation              │
│ - Deposit validation         │
│ - Advance validation (if)    │
│ - Utility validation (if)    │
└──────┬──────────────────────┘
       │
       │ 7. POST /api/rooms/{roomId}/assign
       ▼
┌─────────────────────────────┐
│ API Route Handler            │
│ /api/rooms/[id]/assign       │
│ route.ts                     │
└──────┬──────────────────────┘
       │
       │ 8. Get building config
       │    Validate amounts
       │    Calculate validity
       ▼
┌─────────────────────────────┐
│ BEGIN TRANSACTION            │
│ 1. End existing assignments │
│ 2. INSERT assignment        │
│ 3. UPDATE tenant            │
│ 4. UPDATE room              │
│ COMMIT TRANSACTION           │
└──────┬──────────────────────┘
       │
       │ 9. Generate invoices (optional)
       ▼
┌─────────────────────────────┐
│ invoice-generator.ts         │
│ - Create monthly invoices    │
│ - Include deposit/advance    │
└──────┬──────────────────────┘
       │
       │ 10. Return success
       ▼
┌─────────────────────────────┐
│ TenantAssignmentManager      │
│ - Show success               │
│ - Close form                 │
│ - Refresh data               │
└─────────────────────────────┘
```

### Step-by-Step Sequence

| Step | Module | Action | Data Flow |
|------|--------|--------|-----------|
| **1** | `TenantAssignmentManager.tsx` | User opens assign form | Form modal opens |
| **2** | `TenantAssignmentManager.tsx` | `useEffect` triggers | `fetchRoomBuildingId()` |
| **3** | `TenantAssignmentManager.tsx` | HTTP GET | `GET /api/rooms/{roomId}` |
| **4** | `route.ts` | Return room data | Room with `buildingId` |
| **5** | `TenantAssignmentManager.tsx` | Extract buildingId | `fetchBuildingDepositConfig(buildingId)` |
| **6** | `TenantAssignmentManager.tsx` | HTTP GET | `GET /api/building-deposit-config?buildingId={id}` |
| **7** | `building-deposit-config.ts` | Get & calculate | Return config and calculated amounts |
| **8** | `TenantAssignmentManager.tsx` | Update state | Set required amounts |
| **9** | `TenantAssignmentManager.tsx` | Display UI | Show form with required amounts |
| **10** | `TenantAssignmentManager.tsx` | User submits | `handleAssignTenant()` |
| **11** | `TenantAssignmentManager.tsx` | Client validation | Validate all amounts |
| **12** | `TenantAssignmentManager.tsx` | HTTP POST | `POST /api/rooms/{roomId}/assign` |
| **13** | `route.ts` | Route handler | Authenticate, validate |
| **14** | `route.ts` | Get building config | `getBuildingDepositConfig(buildingId)` |
| **15** | `route.ts` | Validate amounts | Check all amounts meet requirements |
| **16** | `route.ts` | Calculate validity | `getDepositValidityDate()`, `isDepositRefundable()` |
| **17** | `route.ts` | BEGIN TRANSACTION | Start transaction |
| **18** | `route.ts` | End existing | `UPDATE tenant_room_assignments SET status = 'terminated'` |
| **19** | `route.ts` | Create assignment | `INSERT INTO tenant_room_assignments` with all fields |
| **20** | `route.ts` | Update tenant | `UPDATE tenants SET status = 'active'` |
| **21** | `route.ts` | Update room | `UPDATE rooms SET room_status = 'occupied'` |
| **22** | `route.ts` | COMMIT TRANSACTION | Commit all changes |
| **23** | `invoice-generator.ts` | Generate invoices | Create monthly invoices (if requested) |
| **24** | `TenantAssignmentManager.tsx` | Show success | Notification, close form, refresh |

---

## 🔄 Flow 3: Move-Out Processing - Complete Sequence

### Visual Flow

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 1. Initiate move-out
       ▼
┌─────────────────────────────┐
│ Move-Out UI                  │
│ (Component)                  │
└──────┬──────────────────────┘
       │
       │ 2. POST /api/moveout/initiate
       ▼
┌─────────────────────────────┐
│ lease-management-service.ts  │
│ initiateMoveOut()           │
└──────┬──────────────────────┘
       │
       │ 3. Get assignment with funds
       │    SELECT tra.deposit_paid,
       │           tra.advance_paid,
       │           tra.utility_deposit_paid
       ▼
┌─────────────────────────────┐
│ PostgreSQL Database          │
│ tenant_room_assignments      │
└──────┬──────────────────────┘
       │
       │ 4. Return funds data
       ▼
┌─────────────────────────────┐
│ Move-Out UI                  │
│ - Display available funds    │
│ - Show allocation options    │
└──────┬──────────────────────┘
       │
       │ 5. User allocates funds
       │    - Use deposit for last month
       │    - Use advance for utilities
       │    - Use deposit for damages
       ▼
┌─────────────────────────────┐
│ Move-Out UI                  │
│ - Calculate allocations      │
│ - Show final settlement      │
└──────┬──────────────────────┘
       │
       │ 6. POST /api/moveout/{id}/complete
       ▼
┌─────────────────────────────┐
│ lease-management-service.ts  │
│ completeMoveOut()            │
└──────┬──────────────────────┘
       │
       │ 7. BEGIN TRANSACTION
       ▼
┌─────────────────────────────┐
│ Database Operations          │
│ 1. UPDATE moveout_processing │
│ 2. UPDATE tenants           │
│ 3. UPDATE assignments       │
│ 4. INSERT deposit_ledger    │
│ 5. INSERT tenant_credits     │
│ COMMIT TRANSACTION           │
└──────┬──────────────────────┘
       │
       │ 8. Return success
       ▼
┌─────────────────────────────┐
│ Move-Out UI                  │
│ - Show completion            │
│ - Display settlement summary │
└─────────────────────────────┘
```

### Step-by-Step Sequence

| Step | Module | Action | Data Flow |
|------|--------|--------|-----------|
| **1** | Move-Out UI | User initiates | Click "Initiate Move-Out" |
| **2** | Move-Out UI | API call | `POST /api/moveout/initiate` |
| **3** | `lease-management-service.ts` | Create record | `INSERT INTO moveout_processing` |
| **4** | `lease-management-service.ts` | Get funds | Query assignment with deposit/advance/utility |
| **5** | PostgreSQL | Return data | Assignment with all fund amounts |
| **6** | Move-Out UI | Display funds | Show available deposit, advance, utility |
| **7** | Move-Out UI | User allocates | Select allocation options |
| **8** | Move-Out UI | Calculate | Calculate final settlement |
| **9** | Move-Out UI | Submit | `POST /api/moveout/{id}/complete` |
| **10** | `lease-management-service.ts` | Process | `completeMoveOut()` |
| **11** | `lease-management-service.ts` | BEGIN TRANSACTION | Start transaction |
| **12** | `lease-management-service.ts` | Update moveout | `UPDATE moveout_processing` |
| **13** | `lease-management-service.ts` | Update tenant | `UPDATE tenants SET status = 'inactive'` |
| **14** | `lease-management-service.ts` | Update assignment | `UPDATE tenant_room_assignments SET status = 'past'` |
| **15** | `lease-management-service.ts` | Deposit ledger | `INSERT INTO deposit_ledger` (refund/deduction) |
| **16** | `lease-management-service.ts` | Advance refund | `INSERT INTO tenant_credits` (negative amount) |
| **17** | `lease-management-service.ts` | Utility refund | `INSERT INTO deposit_ledger` (refund) |
| **18** | `lease-management-service.ts` | Update notes | Add allocation details to notes |
| **19** | `lease-management-service.ts` | COMMIT TRANSACTION | Commit all changes |
| **20** | Move-Out UI | Show success | Display settlement summary |

---

## 🔄 Flow 4: Building Config Management - Complete Sequence

### Visual Flow

```
┌─────────────┐
│   ADMIN     │
└──────┬──────┘
       │
       │ 1. Navigate to building settings
       ▼
┌─────────────────────────────┐
│ BuildingDepositConfig UI     │
│ (Component - To be created)  │
└──────┬──────────────────────┘
       │
       │ 2. Select building
       ▼
┌─────────────────────────────┐
│ BuildingDepositConfig UI     │
│ - Load existing config       │
│   GET /api/building-deposit- │
│   config?buildingId=xxx      │
└──────┬──────────────────────┘
       │
       │ 3. Return config or null
       ▼
┌─────────────────────────────┐
│ BuildingDepositConfig UI     │
│ - Display form              │
│ - Pre-fill if exists        │
└──────┬──────────────────────┘
       │
       │ 4. Admin edits & saves
       ▼
┌─────────────────────────────┐
│ Form Validation              │
│ - Validate all fields        │
│ - Check data types           │
└──────┬──────────────────────┘
       │
       │ 5. POST /api/building-deposit-config
       ▼
┌─────────────────────────────┐
│ API Route Handler            │
│ /api/building-deposit-config │
│ route.ts                     │
└──────┬──────────────────────┘
       │
       │ 6. createBuildingDepositConfig()
       ▼
┌─────────────────────────────┐
│ Business Logic               │
│ building-deposit-config.ts   │
│ - Check if exists            │
│ - UPDATE or INSERT           │
└──────┬──────────────────────┘
       │
       │ 7. Database operation
       ▼
┌─────────────────────────────┐
│ PostgreSQL Database          │
│ building_deposit_config      │
│ - INSERT or UPDATE           │
└──────┬──────────────────────┘
       │
       │ 8. Return saved config
       ▼
┌─────────────────────────────┐
│ BuildingDepositConfig UI     │
│ - Show success               │
│ - Display saved config       │
└─────────────────────────────┘
```

---

## 📊 Data Flow Patterns

### Pattern 1: Configuration Lookup
```
Room Selection → Get buildingId → Fetch building_deposit_config → 
Calculate amounts → Display in UI
```

### Pattern 2: Amount Calculation
```
Building Config + Monthly Rate → 
  - Deposit: months × rate OR fixed OR percentage
  - Advance: months × rate OR fixed OR percentage  
  - Utility: fixed amount
→ Return calculated values
```

### Pattern 3: Validation Chain
```
Client Input → Client Validation → API Request → 
Server Validation → Database Constraints → 
Transaction → Commit/Rollback
```

### Pattern 4: Transaction Flow
```
BEGIN → Validate → Insert/Update → 
Update Related Tables → COMMIT
(On Error: ROLLBACK)
```

---

## 🔗 Module Dependencies

```
CreateReservationModal
  ├── depends on → building-deposit-config API
  ├── depends on → reservations API
  └── uses → CurrencyContext

TenantAssignmentManager
  ├── depends on → rooms API (for buildingId)
  ├── depends on → building-deposit-config API
  ├── depends on → rooms/[id]/assign API
  └── uses → NotificationContext

building-deposit-config API
  ├── uses → building-deposit-config.ts (business logic)
  └── queries → building_deposit_config table

reservations API
  ├── uses → reservations.ts (business logic)
  ├── uses → building-deposit-config.ts (for calculations)
  └── queries → reservations, rooms, payments tables

rooms/[id]/assign API
  ├── uses → building-deposit-config.ts (for calculations)
  ├── uses → invoice-generator.ts (for auto-invoicing)
  └── queries → tenant_room_assignments, tenants, rooms tables
```

---

## 🎯 Key Integration Points

### 1. Room Selection → Config Fetch
**Trigger**: User selects room  
**Action**: Automatically fetch building deposit config  
**Result**: Display required amounts

### 2. Monthly Rate Change → Recalculation
**Trigger**: Monthly rate input changes  
**Action**: Recalculate required amounts  
**Result**: Update displayed requirements

### 3. Form Submission → Validation Chain
**Trigger**: User submits form  
**Actions**:
  1. Client-side validation
  2. API request
  3. Server-side validation
  4. Database transaction
**Result**: Success or error response

### 4. Assignment Creation → Invoice Generation
**Trigger**: Tenant assigned to room  
**Action**: Auto-generate monthly invoices  
**Result**: Invoices created for lease period

---

## 📝 Code File Reference

### Frontend Components
- `src/components/features/reservations/CreateReservationModal.tsx` - Reservation creation UI
- `src/components/features/TenantAssignmentManager.tsx` - Tenant assignment UI

### API Routes
- `src/app/api/reservations/route.ts` - Reservation CRUD
- `src/app/api/rooms/[id]/assign/route.ts` - Room assignment
- `src/app/api/building-deposit-config/route.ts` - Config management
- `src/app/api/building-deposit-config/[buildingId]/route.ts` - Config calculations

### Business Logic
- `src/lib/api/building-deposit-config.ts` - Config calculations & management
- `src/lib/api/reservations.ts` - Reservation business logic
- `src/lib/services/lease-management-service.ts` - Move-out processing

### Database
- `migrations/add-building-deposit-config.sql` - Config table
- `migrations/add-advance-utility-deposit-to-assignments.sql` - Assignment columns
- `migrations/add-advance-utility-to-reservations.sql` - Reservation columns

---

## ✅ Flow Verification Checklist

- [x] Reservation creation flow documented
- [x] Tenant assignment flow documented
- [x] Move-out processing flow documented
- [x] Building config management flow documented
- [x] Data flow patterns identified
- [x] Module dependencies mapped
- [x] Integration points documented
- [x] Code file references provided

---

**Document Version**: 1.0  
**Status**: ✅ Complete

