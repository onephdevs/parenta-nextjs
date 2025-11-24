# Task: PERF-004 - Implement Query Result Caching

## Status
🔜 **Ready to Start**

## Priority
🟡 **MEDIUM** - Nice performance boost after indexes

## Estimated Effort
⏱️ **3-4 hours**

## Dependencies
- PERF-003 (Database Indexes) - Recommended to complete first
- Redis or similar caching solution (optional, can use in-memory)

## Description
Implement a caching layer for expensive database queries to reduce database load and improve response times. Focus on data that changes infrequently but is accessed often (stats, building lists, etc.).

## Current Problem
```typescript
// Every page load hits the database
export async function getTenantStats() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_tenants,
      COUNT(*) FILTER (WHERE tenant_status = 'active') as active_tenants,
      COUNT(*) FILTER (WHERE tenant_status = 'inactive') as inactive_tenants
    FROM tenants WHERE is_active = true
  `); // Executed 100+ times per day for same data
  
  return result.rows[0];
}
```

**Impact:**
- Database executes same query repeatedly
- Stats change infrequently but are fetched constantly
- Unnecessary database load
- Slower response times

## Target Behavior
```typescript
// Cache results for 5 minutes
export async function getTenantStats() {
  const cacheKey = 'tenant_stats';
  const cached = await cache.get(cacheKey);
  
  if (cached) {
    return cached; // Return immediately (0ms)
  }
  
  const result = await pool.query(/* ... */);
  const stats = result.rows[0];
  
  await cache.set(cacheKey, stats, { ttl: 300 }); // Cache for 5 min
  
  return stats;
}
```

## Caching Strategy

### Data to Cache (High Value, Low Change Frequency)

| Data Type | TTL | Invalidation Trigger |
|-----------|-----|----------------------|
| Tenant stats | 5 min | Tenant created/updated/deleted |
| Building stats | 5 min | Building created/updated/deleted |
| Room stats | 5 min | Room created/updated/deleted |
| Building list | 10 min | Building created/updated/deleted |
| Dashboard metrics | 3 min | Any financial data change |
| Document stats | 5 min | Document uploaded/deleted |
| Utility rates | 1 hour | Rate updated |

### Data NOT to Cache (Changes Frequently)

- Current user session
- Real-time payment status
- Individual tenant details (can change any time)
- Form submissions
- Search results (vary by input)

## Implementation Options

### Option 1: Next.js Built-in Cache (Recommended)
**Pros:**
- No external dependencies
- Built into Next.js 15
- Easy to implement
- No infrastructure needed

**Cons:**
- In-memory only (lost on restart)
- Not shared across serverless functions

### Option 2: Redis (Production-Grade)
**Pros:**
- Persistent cache
- Shared across all instances
- Advanced features (pub/sub, sorted sets)
- Industry standard

**Cons:**
- Requires Redis server
- Additional cost
- More complexity

### Option 3: Vercel KV (Vercel-Specific)
**Pros:**
- Managed Redis by Vercel
- No infrastructure management
- Good integration with Next.js

**Cons:**
- Vendor lock-in
- Additional cost
- Only works on Vercel

## Files to Create/Modify

### 1. Cache Service (NEW)
- `src/lib/cache/cache-service.ts` - Abstract cache interface
- `src/lib/cache/memory-cache.ts` - In-memory implementation
- `src/lib/cache/redis-cache.ts` - Redis implementation (optional)

### 2. API Layer (MODIFY)
- `src/lib/api/tenants.ts` - Add caching to `getTenantStats()`
- `src/lib/api/buildings.ts` - Add caching to `getBuildingStats()`
- `src/lib/api/rooms.ts` - Add caching to room queries
- `src/lib/services/dashboard-service.ts` - Add caching to dashboard metrics

### 3. Cache Invalidation (NEW)
- `src/lib/cache/invalidation.ts` - Helper functions to clear cache

### 4. Environment Configuration
- `.env.local` - Add cache configuration
- `next.config.js` - Configure Next.js cache settings

## Acceptance Criteria

### Must Have
- [ ] Cache service with get/set/delete methods
- [ ] In-memory cache implementation working
- [ ] Tenant stats cached with 5-minute TTL
- [ ] Building stats cached with 5-minute TTL
- [ ] Dashboard metrics cached with 3-minute TTL
- [ ] Cache invalidation on data updates
- [ ] Response time improved by 30-50% for cached queries
- [ ] Works in development and production

### Nice to Have
- [ ] Redis implementation ready for production
- [ ] Cache hit/miss metrics
- [ ] Admin panel to clear cache
- [ ] Automatic cache warming on deployment
- [ ] Cache statistics dashboard

## Implementation Steps

### Step 1: Create Cache Service (60 min)

```typescript
// src/lib/cache/cache-service.ts

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

// src/lib/cache/memory-cache.ts

import { CacheService, CacheOptions } from './cache-service';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache implements CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || 300; // Default 5 minutes
    const expiresAt = Date.now() + (ttl * 1000);
    
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

export function getCache(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new MemoryCache();
  }
  return cacheInstance;
}
```

### Step 2: Add Caching to API Functions (90 min)

```typescript
// src/lib/api/tenants.ts

import { getCache } from '@/lib/cache/memory-cache';

export async function getTenantStats() {
  const cache = getCache();
  const cacheKey = 'tenant_stats';
  
  // Try cache first
  const cached = await cache.get<TenantStats>(cacheKey);
  if (cached) {
    console.log('Cache hit: tenant_stats');
    return cached;
  }
  
  console.log('Cache miss: tenant_stats');
  
  // Fetch from database
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_tenants,
      COUNT(*) FILTER (WHERE tenant_status = 'active') as active_tenants,
      COUNT(*) FILTER (WHERE tenant_status = 'inactive') as inactive_tenants
    FROM tenants WHERE is_active = true
  `);
  
  const stats = result.rows[0];
  
  // Cache for 5 minutes
  await cache.set(cacheKey, stats, { ttl: 300 });
  
  return stats;
}

// Similar for getBuildingStats(), getRoomStats(), etc.
```

### Step 3: Implement Cache Invalidation (45 min)

```typescript
// src/lib/cache/invalidation.ts

import { getCache } from './memory-cache';

export async function invalidateTenantCache() {
  const cache = getCache();
  await cache.delete('tenant_stats');
  await cache.delete('tenant_list'); // If you cache list
  console.log('Tenant cache invalidated');
}

export async function invalidateBuildingCache() {
  const cache = getCache();
  await cache.delete('building_stats');
  await cache.delete('building_list');
  console.log('Building cache invalidated');
}

export async function invalidateDashboardCache() {
  const cache = getCache();
  await cache.delete('dashboard_metrics');
  await cache.delete('monthly_revenue_trend');
  console.log('Dashboard cache invalidated');
}

export async function invalidateAllCache() {
  const cache = getCache();
  await cache.clear();
  console.log('All cache cleared');
}
```

### Step 4: Add Cache Invalidation to Mutations (30 min)

```typescript
// src/app/api/tenants/route.ts

import { invalidateTenantCache, invalidateDashboardCache } from '@/lib/cache/invalidation';

export async function POST(request: Request) {
  try {
    // ... create tenant logic
    
    // Invalidate cache after creating tenant
    await invalidateTenantCache();
    await invalidateDashboardCache(); // Dashboard shows tenant count
    
    return NextResponse.json(newTenant, { status: 201 });
  } catch (error) {
    // ...
  }
}

// Similar for PUT, DELETE, PATCH endpoints
```

### Step 5: Add Cache Statistics (Optional, 30 min)

```typescript
// src/app/api/admin/cache/stats/route.ts

import { getCache } from '@/lib/cache/memory-cache';

export async function GET() {
  // Implementation depends on cache service
  // Could track hits/misses, cache size, etc.
  
  return NextResponse.json({
    hits: 1543,
    misses: 234,
    hitRate: '86.8%',
    size: '2.5MB',
    keys: 47,
  });
}

// src/app/api/admin/cache/clear/route.ts

import { invalidateAllCache } from '@/lib/cache/invalidation';

export async function POST() {
  await invalidateAllCache();
  
  return NextResponse.json({ 
    success: true, 
    message: 'All cache cleared' 
  });
}
```

### Step 6: Testing (45 min)

```typescript
// tests/cache-service.test.ts

describe('CacheService', () => {
  it('should set and get values', async () => {
    const cache = getCache();
    await cache.set('test', { value: 123 });
    const result = await cache.get('test');
    expect(result).toEqual({ value: 123 });
  });
  
  it('should expire after TTL', async () => {
    const cache = getCache();
    await cache.set('test', { value: 123 }, { ttl: 1 });
    await new Promise(resolve => setTimeout(resolve, 1100));
    const result = await cache.get('test');
    expect(result).toBeNull();
  });
  
  it('should invalidate on delete', async () => {
    const cache = getCache();
    await cache.set('test', { value: 123 });
    await cache.delete('test');
    const result = await cache.get('test');
    expect(result).toBeNull();
  });
});
```

## Performance Metrics

### Expected Improvements

| Query | Without Cache | With Cache | Improvement |
|-------|---------------|------------|-------------|
| getTenantStats() | 120ms | 2ms | 60x faster |
| getBuildingStats() | 150ms | 2ms | 75x faster |
| getDashboardMetrics() | 800ms | 5ms | 160x faster |
| Building list | 200ms | 3ms | 67x faster |

### Cache Hit Rate Goals

- **Target:** 80%+ cache hit rate
- **Reality:** First load = miss, next 5 min = hit
- **Expected:** 85-90% hit rate during normal usage

## Testing Checklist

### Functional Tests
- [ ] Cache stores and retrieves values correctly
- [ ] TTL expiration works as expected
- [ ] Cache invalidation clears correct keys
- [ ] Cache survives within same process
- [ ] No memory leaks with cleanup

### Integration Tests
- [ ] Cached stats match database stats
- [ ] Cache invalidates after tenant creation
- [ ] Cache invalidates after tenant update
- [ ] Cache invalidates after tenant deletion
- [ ] Multiple concurrent requests don't cause issues

### Performance Tests
- [ ] Response time improves with cache
- [ ] Database query count reduces
- [ ] Memory usage is acceptable
- [ ] Cache doesn't slow down writes

## Monitoring

### Key Metrics to Track
```typescript
// Log cache statistics
{
  operation: 'cache_hit',
  key: 'tenant_stats',
  duration: '2ms'
}

{
  operation: 'cache_miss',
  key: 'tenant_stats',
  duration: '125ms'
}
```

### Dashboard Queries
- Cache hit rate by endpoint
- Average response time (cached vs uncached)
- Memory usage of cache
- Most frequently cached keys

## Redis Implementation (Optional)

### Install Dependencies
```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

### Redis Cache Service
```typescript
// src/lib/cache/redis-cache.ts

import Redis from 'ioredis';
import { CacheService, CacheOptions } from './cache-service';

class RedisCache implements CacheService {
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || 300;
    await this.client.setex(key, ttl, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    await this.client.flushdb();
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists === 1;
  }
}

export function getCache(): CacheService {
  if (process.env.REDIS_URL) {
    return new RedisCache();
  }
  return new MemoryCache(); // Fallback
}
```

## Documentation

### Update `.env.example`
```env
# Caching Configuration
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=300
REDIS_URL=redis://localhost:6379 # Optional, for Redis caching
```

### Create `docs/caching-strategy.md`
- Document what data is cached
- Document TTL values and reasoning
- Document invalidation triggers
- Document monitoring approach

## Related Tasks
- PERF-003 (Database Indexes) - Complete first for best results
- PERF-001 (Pagination) - Reduces cache size
- PERF-005 (Code Splitting) - Independent

## Notes
- Start with in-memory cache for simplicity
- Consider Redis for production with multiple server instances
- Monitor cache hit rates to adjust TTL values
- Be careful with stale data - invalidate appropriately

## Success Criteria
✅ Task is complete when:
1. Cache service implemented and tested
2. Stats queries use caching
3. Cache invalidation works correctly
4. Response time improved by 30-50%
5. No stale data issues
6. Monitoring shows healthy hit rates
7. Documentation updated

