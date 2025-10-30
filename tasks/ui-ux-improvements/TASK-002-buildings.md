# TASK-002: Buildings Module Improvements

**Status**: Not Started  
**Priority**: HIGH (2 critical bugs)  
**Effort**: 3.5 hours  
**Module**: Building Management

---

## 📋 Task Overview

Fix critical bugs and improve buildings module UX.

**Critical Issues**: 2 (Stats showing 0, Ellipsis button broken)  
**High Priority**: 1 (Add Save button)  
**Medium Priority**: 1 (Country field)  
**Low Priority**: 1 (Remove Ave Year Built)

---

## 🔥 Sub-tasks

### BL-01: Remove "Ave Year Built" from Display
**Status**: TODO  
**Priority**: LOW  
**Effort**: 20 minutes

#### Problem
Building cards and list view show "Ave Year Built" which is not useful information for users.

#### Acceptance Criteria
- [ ] "Ave Year Built" removed from building cards
- [ ] "Ave Year Built" removed from building list view
- [ ] Field still exists in database (don't delete)
- [ ] Can still input year built when creating building
- [ ] Just hidden from display

#### Files to Modify
- `src/app/admin/buildings/page.tsx`
- Building card component (if separate file)

#### Implementation
```typescript
// BEFORE: Building card shows
<p>Ave Year Built: {building.year_built || 'N/A'}</p>

// AFTER: Remove this line completely
// Keep in database, just don't display
```

#### Testing
1. Go to `/admin/buildings`
2. Verify "Ave Year Built" is NOT shown
3. Cards should look cleaner
4. Other building info still displays

---

### BL-02: Fix Total Units Showing 0 ⭐ CRITICAL
**Status**: TODO  
**Priority**: CRITICAL  
**Effort**: 1 hour

#### Problem
Building cards show "Total Units: 0" even when rooms exist in that building.

#### Root Cause
Likely one of:
1. SQL query not joining rooms table correctly
2. Query returning null/undefined
3. Frontend not reading correct property
4. Stats not being calculated

#### Acceptance Criteria
- [ ] Total units shows correct count from database
- [ ] Occupied units shows correct count
- [ ] Vacancy rate calculated correctly
- [ ] Stats update when rooms added/removed
- [ ] Works for all buildings

#### Files to Check
1. `src/lib/api/buildings.ts`
   - `getBuildingWithRoomStats()` function
   - SQL query for counting rooms

2. `src/app/admin/buildings/page.tsx`
   - How stats are fetched
   - How stats are displayed in cards

3. Database schema
   - rooms table has `building_id` foreign key
   - Relationship is correct

#### Implementation Steps

1. **Debug Current Query**
```typescript
// In src/lib/api/buildings.ts
export async function getBuildingWithRoomStats(buildingId?: string) {
  const query = `
    SELECT 
      b.*,
      COUNT(r.id) as total_units,
      SUM(CASE WHEN r.room_status = 'occupied' THEN 1 ELSE 0 END) as occupied_units,
      SUM(CASE WHEN r.room_status = 'vacant' THEN 1 ELSE 0 END) as vacant_units
    FROM buildings b
    LEFT JOIN rooms r ON r.building_id = b.id
    ${buildingId ? 'WHERE b.id = $1' : ''}
    GROUP BY b.id
    ${buildingId ? '' : 'ORDER BY b.name'}
  `;
  
  // ... rest of implementation
}
```

2. **Test Query Directly**
```sql
-- Run in database to verify data exists
SELECT 
  b.id,
  b.name,
  COUNT(r.id) as total_units
FROM buildings b
LEFT JOIN rooms r ON r.building_id = b.id
GROUP BY b.id, b.name;
```

3. **Update Frontend Display**
```typescript
// In building card
<p>Total Units: {building.total_units || 0}</p>
<p>Occupied: {building.occupied_units || 0}</p>
<p>Vacant: {building.vacant_units || 0}</p>
```

#### Testing
1. Check database has buildings and rooms
2. Go to `/admin/buildings`
3. Each card shows correct total units
4. Add a new room to a building
5. Refresh page
6. Count should increase by 1

---

### BL-03: Fix Ellipsis Icon Button ⭐ CRITICAL
**Status**: TODO  
**Priority**: CRITICAL  
**Effort**: 45 minutes

#### Problem
Three-dot (ellipsis) menu button on building cards doesn't open dropdown.

#### Root Cause
Likely missing:
- onClick handler
- State management for open/close
- Dropdown component implementation

#### Acceptance Criteria
- [ ] Clicking ellipsis opens dropdown menu
- [ ] Menu shows: View, Edit, Delete options
- [ ] Clicking option performs action
- [ ] Clicking outside closes menu
- [ ] Only one menu open at a time

#### Files to Modify
- `src/app/admin/buildings/page.tsx`
- Add state for menu management
- Add dropdown component

#### Implementation

```typescript
'use client';

import { useState } from 'react';
import { MoreVertical } from 'lucide-react';

export default function BuildingsPage() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    // ... in building card:
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenuId(openMenuId === building.id ? null : building.id);
        }}
        className="p-2 hover:bg-gray-100 rounded"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {openMenuId === building.id && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <Link
            href={`/admin/buildings/${building.id}`}
            className="block px-4 py-2 hover:bg-gray-100"
          >
            View Details
          </Link>
          <button
            onClick={() => handleEdit(building.id)}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Edit Building
          </button>
          <button
            onClick={() => handleDelete(building.id)}
            className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600"
          >
            Delete Building
          </button>
        </div>
      )}
    </div>
  );
}
```

#### Testing
1. Go to `/admin/buildings`
2. Click ellipsis on any building
3. Dropdown should appear
4. Click "View Details" → navigates
5. Click outside → menu closes
6. Only one menu open at a time

---

### BL-04: Add Save Button to Edit Building
**Status**: TODO  
**Priority**: HIGH  
**Effort**: 30 minutes

#### Problem
Edit Building form is missing a Save/Submit button.

#### Acceptance Criteria
- [ ] Save button visible in edit form
- [ ] Button submits form on click
- [ ] Loading state while saving
- [ ] Success notification after save
- [ ] Redirect after successful save

#### Files to Modify
- `src/app/admin/buildings/[id]/edit/page.tsx` (or similar)
- `src/components/features/EditBuildingForm.tsx` (if exists)

#### Implementation
```typescript
<div className="flex justify-end space-x-3 pt-6">
  <button
    type="button"
    onClick={() => router.back()}
    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={isSubmitting}
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
  >
    {isSubmitting ? 'Saving...' : 'Save Changes'}
  </button>
</div>
```

#### Testing
1. Go to any building detail page
2. Click "Edit" (if edit button exists)
3. Or navigate to `/admin/buildings/[id]/edit`
4. Make changes to building
5. Click "Save Changes"
6. Should show loading state
7. Should redirect to building detail page
8. Should show success notification

---

### BL-05: Fix Country Field Inconsistency
**Status**: TODO  
**Priority**: MEDIUM  
**Effort**: 30 minutes

#### Problem
- Add Building: No Country field
- Edit Building: Has Country field
- Add Building: Defaults to USA (but field not visible)

Should be consistent between Add and Edit.

#### Acceptance Criteria
- [ ] Country field in BOTH Add and Edit Building
- [ ] Country dropdown with common options
- [ ] Default to Philippines (not USA)
- [ ] Can select other countries
- [ ] Consistent behavior

#### Files to Modify
1. `src/components/features/AddBuildingModal.tsx`
   - Add Country dropdown

2. `src/components/features/EditBuildingForm.tsx` (if exists)
   - Ensure Country dropdown exists

#### Implementation
```typescript
// In AddBuildingModal.tsx
const [formData, setFormData] = useState({
  // ...
  country: 'Philippines', // Default to Philippines, not USA
  // ...
});

// Add Country field to form
<div>
  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
    Country *
  </label>
  <select
    id="country"
    name="country"
    required
    value={formData.country}
    onChange={handleInputChange}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="Philippines">Philippines</option>
    <option value="USA">United States</option>
    <option value="Singapore">Singapore</option>
    <option value="Japan">Japan</option>
    <option value="Australia">Australia</option>
    <option value="Other">Other</option>
  </select>
</div>
```

#### Testing
1. Open Add Building modal
2. Verify Country field is present
3. Default should be "Philippines"
4. Can select other countries
5. Submit form
6. Edit building
7. Country field shows same value
8. Can change country in edit

---

## 📊 Progress Summary

| Sub-task | Priority | Effort | Status |
|----------|----------|--------|--------|
| BL-01 | LOW | 20m | ⏳ TODO |
| BL-02 | CRITICAL | 1h | ⏳ TODO |
| BL-03 | CRITICAL | 45m | ⏳ TODO |
| BL-04 | HIGH | 30m | ⏳ TODO |
| BL-05 | MEDIUM | 30m | ⏳ TODO |

**Total**: 0% complete (0/5 tasks)

---

## 🎯 Recommended Order

1. **BL-02** (Critical) - Fix stats showing 0
2. **BL-03** (Critical) - Fix ellipsis button
3. **BL-04** (High) - Add save button
4. **BL-05** (Medium) - Fix country field
5. **BL-01** (Low) - Remove ave year built

---

## ✅ Final Acceptance Criteria

- [ ] Building stats show correct numbers
- [ ] Ellipsis menu works on all cards
- [ ] Can edit and save buildings
- [ ] Country field consistent in Add/Edit
- [ ] Ave Year Built not displayed
- [ ] No console errors
- [ ] All building actions functional

---

## 🔗 Related Files

- `src/app/admin/buildings/page.tsx`
- `src/app/admin/buildings/[id]/page.tsx`
- `src/lib/api/buildings.ts`
- `src/components/features/AddBuildingModal.tsx`
- `src/components/features/EditBuildingForm.tsx`

---

**Start with critical bugs BL-02 and BL-03!** 🔥

