# Tenant Issues - Progress Report

**Date:** December 2024  
**Status:** In Progress

---

## ✅ Completed Fixes

### 1. ✅ Edit Room - Amenities Save Error
**Problem:** Getting "Failed to save..." when editing amenities under Edit Room.

**Fix Applied:**
- **EditRoomForm.tsx**: Convert amenities array to string for display, convert back to array on submit
- **rooms.ts**: Updated `mapDatabaseRoomToRoom` to handle array amenities correctly

**Changes:**
- Convert array to string: `Array.isArray(room.amenities) ? room.amenities.join(', ') : (room.amenities || '')`
- Convert string to array on submit: `formData.amenities.split(',').map(a => a.trim()).filter(a => a.length > 0)`

**Files Modified:**
- `src/components/features/EditRoomForm.tsx`
- `src/lib/api/rooms.ts`

---

### 2. ✅ Display Deposit & Advance in Tenant Info
**Problem:** Deposit and advance amounts not displayed in tenant information.

**Fix Applied:**
- **tenants.ts**: Updated `RoomAssignment` interface to include `depositPaid`, `advancePaid`, `utilityDepositPaid`, `depositValidUntil`, `depositRefundable`
- **tenants.ts**: Updated `mapRowToAssignment` to map these fields from database
- **tenant detail page**: Added deposit/advance display section in Current Room Assignment

**Files Modified:**
- `src/lib/api/tenants.ts`
- `src/app/admin/tenants/[id]/page.tsx`

**Display Shows:**
- Deposit amount with validity date
- Advance amount
- Utility deposit amount
- Refundable status

---

## 🚧 In Progress / Pending

### 3. ⏳ Display Assigned Room in Edit Tenant Form
**Problem:** The assigned room/unit should be displayed in Tenant information section of Edit Tenant form.

**Status:** Need to add room assignment display to EditTenantForm component.

**Required:**
- Show current room assignment (room number, building name)
- Display deposit/advance amounts
- Show assignment start date

---

### 4. ⏳ Change Room Assignment Feature
**Problem:** Need option to change assigned Room or Unit number of Tenant. Should be available under Edit Tenant or separate area.

**Status:** Need to implement room change functionality.

**Options:**
1. Add "Change Room" button in Edit Tenant form
2. Add separate "Room Assignment" section in tenant detail page
3. Use existing TenantAssignmentManager component

**Required:**
- End current assignment
- Create new assignment
- Transfer deposit/advance if applicable
- Update room statuses

---

### 5. ⏳ Deposit Rules Implementation
**Problem:** Need to implement deposit rules:
- 3k minimum deposit, valid for 5 days only, non-refundable after 5 days
- Balibago building: 2 months deposit (9,600) + 1 month advance (4,800) + Utility deposit (1k)
- Villasol building: 1 month deposit (6k) + 1 month advance (6k) + Utility deposit (3k)

**Status:** Partially implemented via building deposit config, need to add:
- 5-day validity rule
- Non-refundable after 5 days logic
- Display in tenant info

**Current Implementation:**
- Building deposit config exists (`building-deposit-config`)
- Can set deposit/advance/utility per building
- Need to add validity period and refundable logic

---

### 6. ⏳ Deposit/Advance Usage on Move-Out
**Problem:** Tenant can use their deposit and advance when they move out to pay:
- Last month rent
- Unpaid utilities
- Property damages

**Status:** Need to implement move-out deposit/advance application logic.

**Required:**
- Move-out form/process
- Option to apply deposit/advance to outstanding balances
- Calculate remaining refundable amount
- Update deposit ledger

---

### 7. ⏳ Review Tenant Portal
**Problem:** Need to review tenant portal for consistency with new requirements.

**Status:** Pending review.

**Required:**
- Check if tenant portal shows deposit/advance info
- Verify room assignment display
- Check if tenant can see deposit validity
- Ensure consistency with admin view

---

## 📋 Next Steps

1. **Add room assignment display to Edit Tenant form**
   - Show current room in "Information" section
   - Display deposit/advance amounts

2. **Implement room change functionality**
   - Add "Change Room" option
   - Handle assignment transfer

3. **Implement deposit validity rules**
   - 5-day validity period
   - Non-refundable after 5 days
   - Update deposit_refundable flag

4. **Implement move-out deposit/advance usage**
   - Create move-out process
   - Apply deposit/advance to balances
   - Calculate refund

5. **Review tenant portal**
   - Check all features
   - Ensure consistency

---

## 🔧 Technical Notes

### Database Schema
- `tenant_room_assignments` table has:
  - `deposit_paid` DECIMAL(10,2)
  - `advance_paid` DECIMAL(10,2)
  - `utility_deposit_paid` DECIMAL(10,2)
  - `deposit_valid_until` DATE
  - `deposit_refundable` BOOLEAN

### Building Deposit Config
- Exists at `/api/building-deposit-config/[buildingId]`
- Can set deposit type (months, percentage, fixed)
- Can set advance and utility deposit amounts

### Room Assignment
- Managed via `/api/rooms/[id]/assign`
- Can create assignment with deposit/advance/utility
- Need to add room change functionality

---

**Status:** ✅ 2/7 Complete | 🚧 5/7 In Progress
