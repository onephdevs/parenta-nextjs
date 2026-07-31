# System Flow Summary - Building Deposit Config Module

**Quick Reference Guide** for understanding the complete flow of the building deposit, advance, and utility deposit system.

---

## 🎯 Core Flows at a Glance

### 1. Reservation Creation Flow
```
User Action → Room Selection → Config Fetch → Calculation → 
Form Fill → Validation → API Call → Database → Success
```

**Key Files**:
- Frontend: `CreateReservationModal.tsx`
- API: `/api/reservations`
- Logic: `reservations.ts`
- Database: `reservations` table

### 2. Tenant Assignment Flow
```
User Action → Room Selection → Config Fetch → Calculation → 
Form Fill → Validation → API Call → Database → Invoice Generation → Success
```

**Key Files**:
- Frontend: `TenantAssignmentManager.tsx`
- API: `/api/rooms/[id]/assign`
- Logic: `rooms.ts` + `building-deposit-config.ts`
- Database: `tenant_room_assignments` table

### 3. Move-Out Processing Flow
```
Initiate → Get Funds → Allocate → Process → 
Database Updates → Settlement Complete
```

**Key Files**:
- Service: `lease-management-service.ts`
- Database: `moveout_processing`, `deposit_ledger`, `tenant_credits`

### 4. Building Config Management Flow
```
Select Building → Load Config → Edit → Save → 
Database Update → Confirmation
```

**Key Files**:
- API: `/api/building-deposit-config`
- Logic: `building-deposit-config.ts`
- Database: `building_deposit_config` table

---

## 📊 Module Interaction Map

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CreateReservationModal                                     │
│    │                                                        │
│    ├─→ Fetches building config on room selection          │
│    ├─→ Calculates required amounts                         │
│    ├─→ Validates user input                                │
│    └─→ Submits to /api/reservations                        │
│                                                             │
│  TenantAssignmentManager                                    │
│    │                                                        │
│    ├─→ Fetches room building ID                            │
│    ├─→ Fetches building config                             │
│    ├─→ Calculates required amounts                         │
│    ├─→ Validates user input                                │
│    └─→ Submits to /api/rooms/[id]/assign                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API ROUTE LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  /api/reservations (POST)                                    │
│    │                                                        │
│    ├─→ Authenticates user                                   │
│    ├─→ Validates input                                      │
│    └─→ Calls createReservation()                            │
│                                                             │
│  /api/rooms/[id]/assign (POST)                              │
│    │                                                        │
│    ├─→ Authenticates user                                   │
│    ├─→ Gets building config                                  │
│    ├─→ Validates amounts                                    │
│    └─→ Creates assignment                                   │
│                                                             │
│  /api/building-deposit-config (GET/POST)                    │
│    │                                                        │
│    ├─→ GET: Returns config for building                     │
│    └─→ POST: Creates/updates config                         │
│                                                             │
│  /api/building-deposit-config/[id] (GET)                    │
│    │                                                        │
│    ├─→ ?action=calculate: Returns calculated amounts       │
│    └─→ ?action=validate: Validates deposit amount          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  building-deposit-config.ts                                  │
│    │                                                        │
│    ├─→ getBuildingDepositConfig()                          │
│    ├─→ calculateRequiredDeposit()                          │
│    ├─→ calculateRequiredAdvance()                          │
│    ├─→ getUtilityDeposit()                                 │
│    ├─→ validateDepositAmount()                             │
│    ├─→ getDepositValidityDate()                            │
│    └─→ isDepositRefundable()                               │
│                                                             │
│  reservations.ts                                             │
│    │                                                        │
│    ├─→ createReservation()                                 │
│    │   ├─→ Gets building config                            │
│    │   ├─→ Validates amounts                               │
│    │   ├─→ Creates payment                                 │
│    │   ├─→ Creates reservation                             │
│    │   └─→ Updates room status                            │
│    │                                                        │
│    └─→ convertReservationToAssignment()                    │
│                                                             │
│  rooms/[id]/assign route.ts                                 │
│    │                                                        │
│    ├─→ Gets building config                                │
│    ├─→ Calculates required amounts                         │
│    ├─→ Validates amounts                                   │
│    ├─→ Creates assignment                                 │
│    └─→ Generates invoices (optional)                       │
│                                                             │
│  lease-management-service.ts                                │
│    │                                                        │
│    ├─→ initiateMoveOut()                                  │
│    └─→ completeMoveOut()                                  │
│        ├─→ Gets funds from assignment                     │
│        ├─→ Processes refunds                               │
│        └─→ Allocates funds                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  building_deposit_config                                     │
│    ├─→ Stores building-specific rules                      │
│    └─→ One config per building                             │
│                                                             │
│  reservations                                                │
│    ├─→ Stores reservation data                             │
│    ├─→ Includes: advance_amount, utility_deposit_amount    │
│    └─→ Includes: deposit_valid_until                        │
│                                                             │
│  tenant_room_assignments                                     │
│    ├─→ Stores assignment data                              │
│    ├─→ Includes: advance_paid, utility_deposit_paid        │
│    └─→ Includes: deposit_valid_until, deposit_refundable   │
│                                                             │
│  payments                                                    │
│    └─→ Records deposit payments                             │
│                                                             │
│  deposit_ledger                                              │
│    └─→ Tracks deposit transactions                          │
│                                                             │
│  tenant_credits                                              │
│    └─→ Tracks advance payments                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Sequence: Reservation Creation

### Step-by-Step Flow

```
[1] User clicks "Create Reservation"
    ↓
[2] CreateReservationModal opens
    ↓
[3] User selects room
    ↓
[4] useEffect triggers: fetchBuildingDepositConfig(room.buildingId)
    ↓
[5] GET /api/building-deposit-config?buildingId={id}
    ↓
[6] building-deposit-config.ts: getBuildingDepositConfig()
    ↓
[7] Database: SELECT * FROM building_deposit_config WHERE building_id = $1
    ↓
[8] Return config (or null)
    ↓
[9] GET /api/building-deposit-config/{id}?action=calculate&monthlyRate={rate}
    ↓
[10] Calculate: deposit, advance, utility
    ↓
[11] Update UI: Display required amounts, auto-fill deposit
    ↓
[12] User fills form (deposit, advance, utility) and submits
    ↓
[13] Client validation: Check amounts meet requirements
    ↓
[14] POST /api/reservations
    ↓
[15] API route: Authenticate, validate input
    ↓
[16] reservations.ts: createReservation()
    ↓
[17] Get building config again (server-side)
    ↓
[18] Validate amounts (server-side)
    ↓
[19] Calculate deposit validity date
    ↓
[20] BEGIN TRANSACTION
    ↓
[21] INSERT INTO payments (deposit payment)
    ↓
[22] INSERT INTO reservations (with all fields)
    ↓
[23] UPDATE rooms SET room_status = 'reserved'
    ↓
[24] COMMIT TRANSACTION
    ↓
[25] Return success response
    ↓
[26] UI: Show success, close modal, refresh list
```

---

## 🔄 Complete Sequence: Tenant Assignment

### Step-by-Step Flow

```
[1] User clicks "Assign Tenant"
    ↓
[2] TenantAssignmentManager form opens
    ↓
[3] useEffect: fetchRoomBuildingId()
    ↓
[4] GET /api/rooms/{roomId}
    ↓
[5] Extract buildingId from room data
    ↓
[6] fetchBuildingDepositConfig(buildingId)
    ↓
[7] GET /api/building-deposit-config?buildingId={id}
    ↓
[8] Get config and calculate amounts
    ↓
[9] Update UI: Display required amounts, show form fields
    ↓
[10] User fills form (deposit, advance, utility) and submits
    ↓
[11] Client validation
    ↓
[12] POST /api/rooms/{roomId}/assign
    ↓
[13] API route: Get building config, validate amounts
    ↓
[14] Calculate deposit validity and refundability
    ↓
[15] BEGIN TRANSACTION
    ↓
[16] UPDATE tenant_room_assignments (end existing)
    ↓
[17] INSERT INTO tenant_room_assignments (with all fields)
    ↓
[18] UPDATE tenants SET status = 'active'
    ↓
[19] UPDATE rooms SET room_status = 'occupied'
    ↓
[20] COMMIT TRANSACTION
    ↓
[21] Generate invoices (if requested)
    ↓
[22] Return success response
    ↓
[23] UI: Show success, close form, refresh data
```

---

## 📋 Data Flow Patterns

### Pattern 1: Configuration Lookup
```
Component → API Route → Business Logic → Database → 
Business Logic (calculation) → API Route → Component
```

### Pattern 2: Form Submission
```
Component (validation) → API Route (auth) → 
Business Logic (validation) → Database (transaction) → 
Response → Component (update UI)
```

### Pattern 3: Calculation Flow
```
Building Config + Monthly Rate → 
  Deposit Calculation (months/fixed/percentage) →
  Advance Calculation (months/fixed/percentage) →
  Utility Deposit (fixed) →
  Validity Date Calculation →
Return Calculated Values
```

---

## 🔑 Key Decision Points

### 1. Deposit Calculation Priority
```
IF building_deposit_config exists:
  USE building config rules
ELSE IF room.deposit_required:
  USE room-level rules
ELSE:
  USE default minimum (₱3,000)
```

### 2. Validation Points
```
Client-Side:
  - Deposit > 0
  - Deposit >= required (if building/room config exists)
  - Advance >= required (if provided and config exists)
  - Utility >= required (if provided and config exists)

Server-Side:
  - All client validations repeated
  - Database constraints
  - Transaction safety
```

### 3. Transaction Boundaries
```
BEGIN TRANSACTION
  - Create payment (if deposit)
  - Create reservation/assignment
  - Update room status
  - Update tenant status
COMMIT (or ROLLBACK on error)
```

---

## 📁 File Organization

```
src/
├── components/
│   └── features/
│       ├── reservations/
│       │   └── CreateReservationModal.tsx    [Frontend: Reservation UI]
│       └── TenantAssignmentManager.tsx        [Frontend: Assignment UI]
│
├── app/
│   └── api/
│       ├── reservations/
│       │   └── route.ts                       [API: Reservation CRUD]
│       ├── rooms/
│       │   └── [id]/assign/
│       │       └── route.ts                   [API: Room Assignment]
│       └── building-deposit-config/
│           ├── route.ts                       [API: Config Management]
│           └── [buildingId]/
│               └── route.ts                    [API: Config Calculations]
│
├── lib/
│   ├── api/
│   │   ├── building-deposit-config.ts         [Logic: Config Operations]
│   │   └── reservations.ts                    [Logic: Reservation Operations]
│   └── services/
│       └── lease-management-service.ts         [Logic: Move-Out Processing]
│
└── types/
    └── database.ts                             [Types: TypeScript Interfaces]

migrations/
├── add-building-deposit-config.sql             [DB: Config Table]
├── add-advance-utility-deposit-to-assignments.sql  [DB: Assignment Columns]
└── add-advance-utility-to-reservations.sql     [DB: Reservation Columns]
```

---

## 🎯 Integration Checklist

- [x] Room selection triggers config fetch
- [x] Monthly rate changes trigger recalculation
- [x] Form validation before submission
- [x] Server-side validation on API
- [x] Database transactions for data integrity
- [x] Error handling at all levels
- [x] Success notifications to user
- [x] UI refresh after operations
- [x] Deposit validity tracking
- [x] Refundability calculation
- [x] Move-out fund allocation

---

## 📚 Related Documentation

- **BUILDING-DEPOSIT-CONFIG-FLOW.md** - Detailed flow documentation with sequence diagrams
- **MODULE-FLOW-SEQUENCE.md** - Complete sequence documentation with visual flows
- **BUILDING-DEPOSIT-CONFIG-IMPLEMENTATION.md** - Implementation summary and verification

---

**Status**: ✅ Complete  
**Last Updated**: Implementation completion

