# Building-Specific Deposit Requirements - Implementation Status

**Date:** December 2024  
**Status:** ✅ **PARTIALLY IMPLEMENTED** - Backend Ready, UI Needs Enhancement

---

## ✅ What's Already Implemented

### 1. **Building Deposit Config System** ✅
- Database table: `building_deposit_config` exists
- API endpoints: `/api/building-deposit-config` and `/api/building-deposit-config/[buildingId]`
- Functions: `calculateRequiredDeposit()`, `calculateRequiredAdvance()`, `getUtilityDeposit()`
- **Status:** Fully functional backend

### 2. **Tenant Info Display** ✅
- **Location:** `/admin/tenants/[id]/page.tsx`
- **Displays:**
  - Deposit amount with validity date
  - Advance amount
  - Utility deposit amount
  - Refundable status
- **Status:** ✅ Working - Shows all three amounts

### 3. **Edit Tenant Form - Room Assignment Display** ✅
- **Location:** `src/components/features/EditTenantForm.tsx`
- **Displays:**
  - Current room number and building
  - Monthly rate
  - Deposit, advance, and utility deposit amounts
  - Links to view room details and change room assignment
- **Status:** ✅ Just Added

### 4. **Move-Out Deposit/Advance Usage** ✅
- **Backend:** `src/lib/services/lease-management-service.ts`
- **Functions:**
  - `initiateMoveOut()` - Creates move-out record
  - `completeMoveOut()` - Handles deposit/advance allocation
- **Allocation Options:**
  - `use_deposit_for_last_month` ✅
  - `use_advance_for_last_month` ✅
  - `use_deposit_for_utilities` ✅
  - `use_advance_for_utilities` ✅
  - `use_deposit_for_damages` ✅
  - `use_advance_for_damages` ✅
- **Status:** ✅ Backend logic complete

---

## 🚧 What Needs to Be Done

### 1. **Setup Building Configs for Balibago and Villasol** ⏳
**Status:** Script created, needs to be run

**Requirements:**
- **Balibago:** 2 months deposit (9,600) + 1 month advance (4,800) + Utility deposit (1k)
- **Villasol:** 1 month deposit (6k) + 1 month advance (6k) + Utility deposit (3k)

**Script:** `scripts/setup-building-deposit-configs.js`

**To Run:**
```bash
node scripts/setup-building-deposit-configs.js
```

**Note:** Script assumes:
- Balibago monthly rate = 4,800 (2 months = 9,600, 1 month = 4,800)
- Villasol monthly rate = 6,000 (1 month = 6,000)

If rates are different, update the script or configure via API/UI.

---

### 2. **Building Deposit Config UI** ⏳
**Status:** API exists, but no UI component

**Needed:**
- Form to create/edit building deposit config
- Accessible from building detail page
- Fields:
  - Deposit months/type/amount
  - Advance months/type/amount
  - Utility deposit amount
  - Validity days
  - Minimum deposit

**Options:**
1. Add to building detail page as a section
2. Add to building settings/edit modal
3. Create separate "Deposit Configuration" page

---

### 3. **Move-Out UI Component** ⏳
**Status:** Backend exists, UI component needed

**Needed:**
- Component to initiate move-out
- Display available funds (deposit, advance, utility)
- Checkboxes/options to allocate funds:
  - ☐ Use deposit for last month rent
  - ☐ Use advance for last month rent
  - ☐ Use deposit for unpaid utilities
  - ☐ Use advance for unpaid utilities
  - ☐ Use deposit for property damages
  - ☐ Use advance for property damages
- Calculate final settlement
- Submit to complete move-out

**Location Options:**
1. Tenant detail page - "Move Out" button
2. Room detail page - "End Assignment" with move-out options
3. Separate move-out management page

---

### 4. **Change Room Assignment Feature** ⏳
**Status:** Partial - Link added, but needs full implementation

**Current:**
- Link to room detail page added in Edit Tenant form
- TenantAssignmentManager exists on room detail page

**Needed:**
- Option to change room from tenant detail page
- Process:
  1. End current assignment
  2. Select new room
  3. Create new assignment
  4. Transfer deposit/advance if applicable

**Options:**
1. Add "Change Room" button in tenant detail page
2. Use existing TenantAssignmentManager on room detail page
3. Create dedicated "Change Room Assignment" modal/page

---

## 📋 Implementation Summary

### ✅ Completed:
1. ✅ Building deposit config database and API
2. ✅ Deposit/advance/utility calculation logic
3. ✅ Tenant info display (deposit, advance, utility)
4. ✅ Edit Tenant form - room assignment display
5. ✅ Move-out backend with deposit/advance allocation
6. ✅ 3k minimum deposit enforcement
7. ✅ 5-day validity and non-refundable logic

### ⏳ Pending:
1. ⏳ Run setup script for Balibago and Villasol configs
2. ⏳ Create building deposit config UI
3. ⏳ Create move-out UI with deposit/advance allocation
4. ⏳ Implement "Change Room" functionality
5. ⏳ Review tenant portal for consistency

---

## 🎯 Quick Setup Instructions

### Step 1: Setup Building Configs
```bash
# Run the setup script
node scripts/setup-building-deposit-configs.js
```

This will configure:
- **Balibago:** 2 months deposit + 1 month advance + 1k utility
- **Villasol:** 1 month deposit + 1 month advance + 3k utility

### Step 2: Verify Configs
```bash
# Check if configs were created
# Via API: GET /api/building-deposit-config/[buildingId]
# Or query database directly
```

### Step 3: Test Tenant Assignment
1. Assign tenant to Balibago room
2. Verify required amounts: 9,600 deposit + 4,800 advance + 1k utility
3. Assign tenant to Villasol room
4. Verify required amounts: 6,000 deposit + 6,000 advance + 3k utility

### Step 4: Verify Display
1. Go to tenant detail page
2. Check "Current Room Assignment" section
3. Verify deposit, advance, and utility deposit are displayed

---

## 🔧 Technical Details

### Building Config Structure
```typescript
{
  buildingId: string,
  depositMonths: number,        // 2 for Balibago, 1 for Villasol
  depositType: 'months',        // 'months', 'fixed', or 'percentage'
  advanceMonths: number,        // 1 for both
  advanceType: 'months',
  utilityDepositAmount: number,  // 1000 for Balibago, 3000 for Villasol
  depositValidityDays: 5,
  minimumDepositAmount: 3000
}
```

### Calculation Logic
- **Deposit:** `monthlyRate * depositMonths` (min 3,000)
- **Advance:** `monthlyRate * advanceMonths`
- **Utility:** Fixed amount from config

### Display Locations
1. **Tenant Detail Page:** `/admin/tenants/[id]` - Shows in "Current Room Assignment"
2. **Edit Tenant Form:** `/admin/tenants/[id]/edit` - Shows at top of form
3. **Room Detail Page:** Shows when viewing room with tenant

---

## 📝 Next Steps

1. **Run setup script** to configure Balibago and Villasol
2. **Create building deposit config UI** (or use API directly for now)
3. **Create move-out UI component** with deposit/advance allocation
4. **Implement "Change Room" feature** in tenant detail or separate page
5. **Test end-to-end flow:**
   - Assign tenant with building-specific requirements
   - Verify amounts displayed correctly
   - Test move-out with deposit/advance allocation

---

**Status:** ✅ **Backend Complete** | ⏳ **UI Components Needed**
