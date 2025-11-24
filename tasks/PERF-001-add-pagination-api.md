# Task: PERF-001 - Add Pagination to API Endpoints

## Status
🔜 **Ready to Start**

## Priority
🔴 **HIGH** - Direct impact on page load performance

## Estimated Effort
⏱️ **2-3 hours**

## Dependencies
- None (can start immediately)

## Description
Modify API endpoints to support pagination instead of fetching all records at once. This will significantly reduce database query time and data transfer size, especially as the application grows.

## Current Problem
```typescript
// Currently fetches ALL records (slow)
const tenants = await getAllTenants(); // Returns 100+ records

// This causes:
// - Large database query (300-500ms)
// - Large data transfer (100KB+)
// - Memory overhead
// - Slow page renders
```

## Target Behavior
```typescript
// Fetch only needed records (fast)
const tenants = await getAllTenants({ 
  page: 1, 
  limit: 50,
  sortBy: 'createdAt',
  sortOrder: 'desc'
}); // Returns 50 records + pagination metadata
```

## Files to Modify

### 1. API Layer
- `src/lib/api/tenants.ts`
  - Update `getAllTenants()` signature
  - Add pagination parameters
  - Return pagination metadata
  
- `src/lib/api/buildings.ts`
  - Update `getAllBuildings()` signature
  - Add pagination support
  
- `src/lib/api/rooms.ts`
  - Update `getAllRooms()` signature
  - Add pagination support

### 2. Page Components
- `src/app/admin/tenants/page.tsx`
  - Add `searchParams` for page number
  - Pass pagination to API calls
  - Add pagination UI component
  
- `src/app/admin/buildings/page.tsx`
  - Add pagination support
  
- `src/app/admin/rooms/page.tsx`
  - Add pagination support

### 3. UI Components
- `src/components/ui/Pagination.tsx` (NEW)
  - Create reusable pagination component
  - Support for Previous/Next
  - Page number display
  - Jump to page functionality

## Acceptance Criteria

### Must Have
- [ ] `getAllTenants()` accepts `page` and `limit` parameters
- [ ] `getAllTenants()` returns pagination metadata (`total`, `page`, `totalPages`)
- [ ] Tenants page displays only 50 records per page
- [ ] Pagination UI shows Previous/Next buttons
- [ ] Pagination UI shows current page and total pages
- [ ] Same for Buildings and Rooms pages
- [ ] Database query time reduced by 60%+
- [ ] Page load time improved by 40%+

### Nice to Have
- [ ] URL reflects current page (e.g., `/admin/tenants?page=2`)
- [ ] Pagination supports custom page sizes (25, 50, 100)
- [ ] "Jump to page" input field
- [ ] Loading state during page changes

## Implementation Steps

### Step 1: Update API Layer (45 min)

```typescript
// src/lib/api/tenants.ts

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function getAllTenants(options?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: {
    status?: string;
    search?: string;
  };
}): Promise<PaginatedResponse<Tenant>> {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;
  
  // Get total count
  const countResult = await pool.query(`
    SELECT COUNT(*) FROM tenants WHERE is_active = true
  `);
  const total = parseInt(countResult.rows[0].count);
  
  // Get paginated data
  const query = `
    SELECT * FROM tenants 
    WHERE is_active = true 
    ORDER BY ${options?.sortBy || 'created_at'} ${options?.sortOrder || 'DESC'}
    LIMIT $1 OFFSET $2
  `;
  
  const result = await pool.query(query, [limit, offset]);
  
  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    },
  };
}
```

### Step 2: Create Pagination Component (30 min)

```typescript
// src/components/ui/Pagination.tsx

'use client';

import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export default function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        {currentPage > 1 && (
          <Link
            href={`${basePath}?page=${currentPage - 1}`}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous
          </Link>
        )}
        {currentPage < totalPages && (
          <Link
            href={`${basePath}?page=${currentPage + 1}`}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next
          </Link>
        )}
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
            {/* Previous button */}
            {/* Page numbers */}
            {/* Next button */}
          </nav>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Update Pages (45 min)

```typescript
// src/app/admin/tenants/page.tsx

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const page = parseInt(searchParams.page || '1');
  
  const { data: tenants, pagination } = await getAllTenants({ 
    page, 
    limit: 50 
  });
  
  const stats = await getTenantStats();
  const buildings = await getAllBuildings();

  return (
    <div>
      {/* Existing content */}
      <TenantsList tenants={tenants} buildings={buildings} />
      
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        basePath="/admin/tenants"
      />
    </div>
  );
}
```

### Step 4: Testing (30 min)
- [ ] Test with 1 tenant (edge case)
- [ ] Test with 50 tenants (single page)
- [ ] Test with 100+ tenants (multiple pages)
- [ ] Test Previous/Next navigation
- [ ] Test direct page URL access
- [ ] Verify database query performance
- [ ] Test on mobile devices

## Performance Metrics

### Before (Without Pagination)
- Database query: **500ms** (fetching 200 records)
- Data transfer: **150KB**
- Page render: **800ms**
- Total time: **1300ms**

### After (With Pagination)
- Database query: **120ms** (fetching 50 records)
- Data transfer: **40KB**
- Page render: **250ms**
- Total time: **370ms**

**Improvement: 71% faster** 🚀

## Testing Checklist
- [ ] Pagination works with no data
- [ ] Pagination works with 1-49 records (single page)
- [ ] Pagination works with 50+ records (multiple pages)
- [ ] Previous button disabled on page 1
- [ ] Next button disabled on last page
- [ ] URL updates when navigating pages
- [ ] Direct page URL access works
- [ ] Page persists on browser back/forward
- [ ] Works on mobile devices
- [ ] Loading states appear during navigation

## Documentation
- [ ] Update API documentation
- [ ] Add pagination examples
- [ ] Update README if needed
- [ ] Document query performance improvements

## Related Tasks
- PERF-002 (Remove Duplicate Auth) - Can be done in parallel
- PERF-003 (Database Indexes) - Should be done after this

## Notes
- Consider adding a "Show all" option for admin convenience (with warning)
- Consider adding page size selector (25, 50, 100 records)
- Monitor query performance in production
- Consider adding query result caching after pagination is stable

## Success Criteria
✅ Task is complete when:
1. All acceptance criteria are met
2. Tests pass
3. Performance improvement is verified
4. Code is reviewed and merged
5. Deployed to production

