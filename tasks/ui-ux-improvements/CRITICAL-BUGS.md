# Critical Bugs - Priority Fix List

**Priority**: CRITICAL  
**Estimated Time**: 4 hours  
**Must Complete Before**: Any UX improvements  

---

## 🔥 Critical Issues (Fix First)

These bugs are blocking core functionality and must be fixed immediately.

---

## BUG-01: 404 Error After Creating Tenant

**Priority**: 🔴 CRITICAL  
**Effort**: 45 minutes  
**Module**: Tenant Management  
**Impact**: Users cannot complete tenant creation flow

### Problem
After successfully creating a tenant, the app redirects to a non-existent page resulting in 404 error.

### Acceptance Criteria
- [ ] After creating tenant, redirect to tenant detail page
- [ ] Tenant ID from API response used in redirect URL
- [ ] Success notification displays
- [ ] No 404 error

### Files to Check
- `src/components/features/TenantForm.tsx`
- `src/app/admin/tenants/new/page.tsx`
- `src/app/api/tenants/route.ts`

### Implementation Steps
1. Check API response format for tenant creation
2. Verify tenant ID is returned in response
3. Update redirect URL to use correct tenant ID
4. Test full flow: create → redirect → detail page

### Testing
```bash
# Test flow:
1. Go to /admin/tenants/new
2. Fill out tenant form
3. Click "Add Tenant"
4. Should redirect to /admin/tenants/[id]
5. Should show success notification
6. Should display tenant details
```

---

## BUG-02: Tenant Card UI Broken

**Priority**: 🔴 CRITICAL  
**Effort**: 45 minutes  
**Module**: Tenant Management  
**Impact**: Tenant list page unusable

### Problem
Tenant cards on the tenant list page have broken layout/styling.

### Acceptance Criteria
- [ ] Tenant cards display properly
- [ ] All tenant information visible
- [ ] Cards are clickable
- [ ] Responsive on all screen sizes
- [ ] Consistent with other card designs

### Files to Check
- `src/app/admin/tenants/page.tsx`
- `src/components/features/TenantCard.tsx` (if exists)
- Look for inline tenant card rendering

### Implementation Steps
1. Identify the broken card component
2. Check CSS classes and Tailwind styling
3. Compare with working cards (buildings, rooms)
4. Fix layout issues
5. Test responsive behavior

### Testing
```bash
# Visual test:
1. Go to /admin/tenants
2. Check card layout
3. Verify all fields display
4. Test on mobile view (DevTools)
5. Click card to navigate
```

---

## BUG-03: Tenant Stats Showing 0

**Priority**: 🔴 CRITICAL  
**Effort**: 1 hour  
**Module**: Tenant Management  
**Impact**: Dashboard metrics incorrect

### Problem
Tenant management page shows 0 for all statistics (total tenants, active, etc.).

### Acceptance Criteria
- [ ] Total tenants count displays correctly
- [ ] Active tenants count accurate
- [ ] Pending tenants count accurate
- [ ] Inactive tenants count accurate
- [ ] Stats update in real-time

### Files to Check
- `src/app/admin/tenants/page.tsx`
- `src/lib/api/tenants.ts` (getTenantStats function)
- `src/app/api/tenants/stats/route.ts` (if exists)

### Implementation Steps
1. Check if stats API exists
2. Create stats endpoint if missing
3. Query database for tenant counts
4. Group by status
5. Return correct counts
6. Update frontend to display stats

### Database Query
```sql
-- Check actual tenant counts
SELECT 
  tenant_status,
  COUNT(*) as count
FROM tenants
GROUP BY tenant_status;

-- Should return:
-- active: X
-- pending: Y
-- inactive: Z
```

### Testing
```bash
# Test:
1. Go to /admin/tenants
2. Check "Total Tenants" shows correct count
3. Verify each status count
4. Create a new tenant
5. Stats should update immediately
```

---

## BUG-04: Building Stats Showing 0

**Priority**: 🟠 HIGH  
**Effort**: 1 hour  
**Module**: Buildings  
**Impact**: Dashboard metrics incorrect

### Problem
Building cards show "Total Units: 0" even when rooms exist.

### Acceptance Criteria
- [ ] Total units count from database
- [ ] Occupied units count accurate
- [ ] Vacancy rate calculated correctly
- [ ] Stats update when rooms added/removed

### Files to Check
- `src/app/admin/buildings/page.tsx`
- `src/lib/api/buildings.ts` (getBuildingWithRoomStats)
- Building card component

### Implementation Steps
1. Check getBuildingWithRoomStats SQL query
2. Verify JOIN with rooms table
3. Count total rooms per building
4. Count occupied rooms (room_status = 'occupied')
5. Calculate vacancy rate
6. Update frontend display

### Database Query
```sql
-- Get building stats
SELECT 
  b.id,
  b.name,
  COUNT(r.id) as total_units,
  SUM(CASE WHEN r.room_status = 'occupied' THEN 1 ELSE 0 END) as occupied_units
FROM buildings b
LEFT JOIN rooms r ON r.building_id = b.id
GROUP BY b.id, b.name;
```

### Testing
```bash
# Test:
1. Go to /admin/buildings
2. Each building card should show correct total units
3. Add a room to a building
4. Refresh - count should increase
5. Assign tenant to room
6. Occupied count should increase
```

---

## BUG-05: Ellipsis Button Not Working

**Priority**: 🟠 HIGH  
**Effort**: 45 minutes  
**Module**: Buildings  
**Impact**: Cannot access building actions

### Problem
The three-dot (ellipsis) menu button on building cards doesn't open the dropdown menu.

### Acceptance Criteria
- [ ] Clicking ellipsis opens dropdown
- [ ] Dropdown shows all actions (Edit, Delete, View)
- [ ] Actions are clickable
- [ ] Dropdown closes after selection
- [ ] Dropdown closes on outside click

### Files to Check
- `src/app/admin/buildings/page.tsx`
- Look for Menu/Dropdown component
- Check for useState for menu open/close

### Implementation Steps
1. Find ellipsis button in building card
2. Add onClick handler
3. Add state for dropdown open/close
4. Implement dropdown menu component
5. Add click-outside handler
6. Connect menu items to actions

### Example Implementation
```typescript
const [openMenuId, setOpenMenuId] = useState<string | null>(null);

// In building card:
<button onClick={() => setOpenMenuId(building.id)}>
  <MoreVertical />
</button>

{openMenuId === building.id && (
  <div className="dropdown-menu">
    <Link href={`/admin/buildings/${building.id}`}>View</Link>
    <Link href={`/admin/buildings/${building.id}/edit`}>Edit</Link>
    <button onClick={() => handleDelete(building.id)}>Delete</button>
  </div>
)}
```

### Testing
```bash
# Test:
1. Go to /admin/buildings
2. Click ellipsis on any building card
3. Menu should appear
4. Click "View" - should navigate
5. Click outside menu - should close
```

---

## 🎯 Critical Path Timeline

Complete these bugs in order:

1. **TN-03** - Fix 404 after tenant creation (45m)
2. **TN-08** - Fix tenant card UI (45m)
3. **TN-10** - Fix tenant stats (1h)
4. **BL-02** - Fix building stats (1h)
5. **BL-03** - Fix ellipsis button (45m)

**Total Time**: ~4 hours

---

## ✅ Verification Checklist

After fixing all critical bugs:

### Tenant Flow
- [ ] Can create tenant without 404
- [ ] Tenant cards display correctly
- [ ] Tenant stats show real numbers
- [ ] Can navigate to tenant details
- [ ] All tenant actions work

### Building Flow
- [ ] Building stats show correct counts
- [ ] Ellipsis menu opens
- [ ] Can edit/delete/view buildings
- [ ] Room counts update dynamically

### General
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All navigation works
- [ ] Success notifications display

---

## 🚨 If Bugs Persist

1. **Check browser console** for JavaScript errors
2. **Check network tab** for failed API calls
3. **Check database** for actual data
4. **Clear browser cache** and reload
5. **Restart dev server** if hot reload issues

---

## 📝 Notes

- These are blocking issues that prevent normal app usage
- Fix these before moving to UX improvements
- Test thoroughly after each fix
- Update UI-UX-IMPROVEMENTS-TRACKER.md when complete

---

**Once all critical bugs are fixed, proceed to UX improvements!** ✅

