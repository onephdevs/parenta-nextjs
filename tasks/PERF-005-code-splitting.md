# Task: PERF-005 - Implement Code Splitting and Dynamic Imports

## Status
🔜 **Ready to Start**

## Priority
🟢 **LOW-MEDIUM** - User experience improvement

## Estimated Effort
⏱️ **2-3 hours**

## Dependencies
- None (can start immediately)
- Independent of other performance tasks

## Description
Implement code splitting and dynamic imports to reduce initial JavaScript bundle size and improve page load times. Focus on heavy components that aren't immediately needed (modals, charts, complex forms).

## Current Problem
```typescript
// All components loaded immediately (HEAVY)
import EditBuildingModal from '@/components/features/EditBuildingModal'; // 50KB
import ImageGallery from '@/components/features/ImageGallery'; // 30KB
import Recharts from 'recharts'; // 120KB

export default function Page() {
  // Modal might never open, but JS is loaded anyway
  return (
    <div>
      <BuildingsList />
      <EditBuildingModal /> {/* Loaded on initial page load */}
    </div>
  );
}
```

**Impact:**
- Initial bundle size: **850KB** (compressed: 280KB)
- Time to Interactive: **3.2s**
- Unused code loaded: **~200KB**

## Target Behavior
```typescript
// Components loaded on-demand (LIGHT)
import dynamic from 'next/dynamic';

const EditBuildingModal = dynamic(
  () => import('@/components/features/EditBuildingModal'),
  { loading: () => <LoadingSpinner /> }
);

export default function Page() {
  return (
    <div>
      <BuildingsList />
      {isOpen && <EditBuildingModal />} {/* Loaded only when opened */}
    </div>
  );
}
```

**Impact:**
- Initial bundle size: **650KB** (compressed: 210KB) ✅ 23% smaller
- Time to Interactive: **2.4s** ✅ 25% faster
- Modal loads in 150ms when opened (acceptable)

## Components to Split

### High Priority (Heavy & Not Immediately Needed)

| Component | Size | Usage | Priority |
|-----------|------|-------|----------|
| Chart components (Recharts) | ~120KB | Dashboard only | 🔴 HIGH |
| EditBuildingModal | ~50KB | On click only | 🔴 HIGH |
| EditTenantForm | ~45KB | On click only | 🔴 HIGH |
| ImageGallery | ~30KB | Below fold | 🟡 MEDIUM |
| DocumentUpload | ~35KB | On click only | 🟡 MEDIUM |
| PDF Viewer | ~80KB | On click only | 🔴 HIGH |
| Date Range Picker | ~25KB | Optional filter | 🟡 MEDIUM |

### Low Priority (Already Light)

| Component | Size | Reason |
|-----------|------|--------|
| Button | 2KB | Too small |
| Input | 3KB | Immediate need |
| Card | 1KB | Immediate need |
| Header | 5KB | Immediate need |

## Files to Modify

### 1. Dashboard Page
- `src/app/admin/financial/dashboard/page.tsx`
  - Dynamic import for `RevenueChart`
  - Dynamic import for `InvoiceStatusChart`
  - Dynamic import for `RecentPaymentsTimeline`

### 2. Buildings Page
- `src/app/admin/buildings/page.tsx`
  - Dynamic import for `EditBuildingModal`
  - Dynamic import for `AddBuildingButton` (if heavy)

### 3. Tenants Page
- `src/app/admin/tenants/page.tsx`
  - Dynamic import for `EditTenantForm`
  - Dynamic import for `TenantDocuments`

### 4. Documents Page
- `src/app/admin/documents/page.tsx`
  - Dynamic import for `DocumentUpload`
  - Dynamic import for `ImageGallery`

### 5. Analytics Page
- `src/app/admin/analytics/page.tsx`
  - Dynamic import for all chart components

## Acceptance Criteria

### Must Have
- [ ] Chart components loaded dynamically
- [ ] All modal components loaded dynamically
- [ ] Heavy form components loaded dynamically
- [ ] Loading states during dynamic import
- [ ] Initial bundle size reduced by 20%+
- [ ] Time to Interactive improved by 15%+
- [ ] No breaking changes to functionality

### Nice to Have
- [ ] Bundle analyzer report showing improvements
- [ ] Automated bundle size monitoring
- [ ] Preload hints for critical dynamic imports
- [ ] Service worker caching for split chunks

## Implementation Steps

### Step 1: Analyze Current Bundle (30 min)

```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Update next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // existing config
});

# Generate bundle report
ANALYZE=true npm run build
```

### Step 2: Create Dynamic Import Wrapper (15 min)

```typescript
// src/lib/utils/dynamic-import.ts

import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export function createDynamicImport<T>(
  importFn: () => Promise<any>,
  options?: {
    loading?: React.ComponentType;
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || (() => <LoadingSpinner />),
    ssr: options?.ssr ?? false, // Default: client-side only
  }) as unknown as T;
}
```

### Step 3: Update Dashboard Components (45 min)

```typescript
// src/app/admin/financial/dashboard/page.tsx

import { createDynamicImport } from '@/lib/utils/dynamic-import';

// Heavy chart components - load dynamically
const RevenueChart = createDynamicImport(
  () => import('@/components/features/dashboard/RevenueChart'),
  { loading: () => <ChartSkeleton /> }
);

const InvoiceStatusChart = createDynamicImport(
  () => import('@/components/features/dashboard/InvoiceStatusChart'),
  { loading: () => <ChartSkeleton /> }
);

const RecentPaymentsTimeline = createDynamicImport(
  () => import('@/components/features/dashboard/RecentPaymentsTimeline'),
  { loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" /> }
);

export default async function DashboardPage() {
  const data = await getAllDashboardMetrics();

  return (
    <div className="space-y-6">
      {/* Immediate render - no dynamic import */}
      <MetricsOverview data={data} />
      
      {/* Dynamic imports - load on scroll */}
      <RevenueChart data={data.monthlyRevenueTrend} />
      <InvoiceStatusChart data={data.invoiceStatusBreakdown} />
      <RecentPaymentsTimeline data={data.recentPayments} />
    </div>
  );
}
```

### Step 4: Update Modal Components (60 min)

```typescript
// src/app/admin/buildings/page.tsx

'use client'; // If using modals, needs client component

import { useState } from 'react';
import { createDynamicImport } from '@/lib/utils/dynamic-import';

// Load modal only when needed
const EditBuildingModal = createDynamicImport(
  () => import('@/components/features/EditBuildingModal'),
  { ssr: false }
);

export default function BuildingsPage({ buildings }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  return (
    <div>
      <BuildingsList 
        buildings={buildings}
        onEdit={(building) => {
          setSelectedBuilding(building);
          setIsEditModalOpen(true); // Modal code loads NOW
        }}
      />
      
      {/* Only render (and load) when open */}
      {isEditModalOpen && (
        <EditBuildingModal
          building={selectedBuilding}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}
```

### Step 5: Update Document Components (30 min)

```typescript
// src/app/admin/documents/page.tsx

import { createDynamicImport } from '@/lib/utils/dynamic-import';

const DocumentUpload = createDynamicImport(
  () => import('@/components/features/DocumentUpload'),
  { ssr: false }
);

const ImageGallery = createDynamicImport(
  () => import('@/components/features/ImageGallery'),
  { loading: () => <div className="grid grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded" />
      ))}
    </div>
  }
);

export default function DocumentsPage() {
  return (
    <div>
      <DocumentStats /> {/* Immediate */}
      <DocumentUpload /> {/* Dynamic */}
      <ImageGallery /> {/* Dynamic, below fold */}
    </div>
  );
}
```

### Step 6: Add Loading Components (15 min)

```typescript
// src/components/ui/ChartSkeleton.tsx

export default function ChartSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4" />
      <div className="h-64 bg-gray-100 animate-pulse rounded" />
    </div>
  );
}

// src/components/ui/ModalSkeleton.tsx

export default function ModalSkeleton() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 w-full max-w-2xl">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Step 7: Optimize Recharts Imports (30 min)

```typescript
// Instead of importing entire recharts library:
// import { LineChart, Line, XAxis, YAxis } from 'recharts'; // 120KB

// Import only what you need:
import { LineChart } from 'recharts/lib/chart/LineChart';
import { Line } from 'recharts/lib/cartesian/Line';
import { XAxis } from 'recharts/lib/cartesian/XAxis';
import { YAxis } from 'recharts/lib/cartesian/YAxis';
import { CartesianGrid } from 'recharts/lib/cartesian/CartesianGrid';
import { Tooltip } from 'recharts/lib/component/Tooltip';
import { ResponsiveContainer } from 'recharts/lib/component/ResponsiveContainer';

// This reduces the import size from 120KB to ~40KB
```

## Performance Metrics

### Bundle Size Improvements

**Before Code Splitting:**
```
Route                           Size
──────────────────────────────────────
/admin/dashboard               320KB
/admin/tenants                 280KB
/admin/buildings               290KB
/admin/documents               310KB
Total initial bundle:          850KB
```

**After Code Splitting:**
```
Route                           Size      Dynamic
──────────────────────────────────────────────────
/admin/dashboard               220KB     100KB (charts)
/admin/tenants                 190KB     90KB (forms)
/admin/buildings               200KB     90KB (modals)
/admin/documents               210KB     100KB (upload)
Total initial bundle:          650KB     380KB (lazy)

Improvement: 23% smaller initial load
Lazy loaded: Only when needed
```

### Loading Time Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Bundle | 850KB | 650KB | 23% smaller |
| Time to Interactive | 3.2s | 2.4s | 25% faster |
| First Contentful Paint | 1.8s | 1.3s | 28% faster |
| Lighthouse Score | 72 | 89 | +17 points |

## Testing Checklist

### Functional Tests
- [ ] All pages load correctly
- [ ] Modals open without errors
- [ ] Charts render after dynamic load
- [ ] Forms work after dynamic load
- [ ] Loading states appear during import
- [ ] No console errors or warnings

### Performance Tests
- [ ] Bundle size reduced by 20%+
- [ ] Time to Interactive improved
- [ ] No layout shift during load
- [ ] Lazy components load within 200ms
- [ ] Network waterfall shows chunk loading

### User Experience Tests
- [ ] Loading states are smooth
- [ ] No blank screens
- [ ] Modal opens feel instant (<200ms)
- [ ] Charts appear quickly
- [ ] Mobile performance acceptable

## Monitoring

### Bundle Analysis
```bash
# Run before and after
ANALYZE=true npm run build

# Compare reports
# Before: /analyze/client-before.html
# After: /analyze/client-after.html
```

### Performance Metrics
```typescript
// Log dynamic import performance
const start = performance.now();
const Component = await import('./HeavyComponent');
const duration = performance.now() - start;

console.log(`Dynamic import took ${duration}ms`);
```

## Advanced Optimizations (Optional)

### 1. Preload Critical Dynamic Imports
```typescript
// Preload when hovering over button
<button
  onClick={handleOpen}
  onMouseEnter={() => {
    // Preload modal component
    import('@/components/features/EditBuildingModal');
  }}
>
  Edit Building
</button>
```

### 2. Route-Based Splitting
```typescript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react'],
  },
};
```

### 3. Intersection Observer for Below-Fold
```typescript
'use client';

import { useEffect, useRef, useState } from 'react';

export function LazyLoad({ children, fallback }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Load before scrolling into view
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
}

// Usage
<LazyLoad fallback={<ChartSkeleton />}>
  <RevenueChart data={data} />
</LazyLoad>
```

## Documentation

### Update Performance Guide
```markdown
# Code Splitting Strategy

## What is Code Splitting?
Technique to split JavaScript into smaller chunks that load on-demand.

## When to Use Dynamic Imports
- Heavy components (>30KB)
- Modals and dialogs
- Below-the-fold content
- Optional features
- Third-party libraries

## When NOT to Use
- Small components (<10KB)
- Critical above-the-fold content
- Frequently used utilities
```

## Related Tasks
- PERF-001 (Pagination) - Independent
- PERF-006 (Image Optimization) - Can do in parallel
- Independent of all other tasks

## Notes
- Start with heaviest components first
- Monitor Lighthouse scores
- Test on slow 3G connections
- Consider mobile performance
- Use bundle analyzer regularly

## Success Criteria
✅ Task is complete when:
1. Chart components dynamically imported
2. Modal components dynamically imported
3. Bundle size reduced by 20%+
4. Loading states implemented
5. No functionality broken
6. Performance metrics improved
7. Bundle analyzer shows improvements
8. Documentation updated

