# Task: PERF-003 - Add Database Indexes for Performance

## Status
🔜 **Ready to Start**

## Priority
🔴 **HIGH** - Direct impact on query performance

## Estimated Effort
⏱️ **2-3 hours**

## Dependencies
- PERF-001 (Pagination) - Recommended to complete first
- Database access with CREATE INDEX privileges

## Description
Add strategic database indexes to improve query performance on frequently accessed and joined columns. Current queries are performing full table scans, causing slow response times as data grows.

## Current Problem
```sql
-- Query without indexes (SLOW)
SELECT * FROM tenants WHERE tenant_status = 'active';
-- Execution time: 450ms (with 200 records)
-- Seq Scan on tenants (cost=0.00..15.00 rows=200 width=500)

-- Query with joins (VERY SLOW)
SELECT t.*, r.room_number, b.name as building_name
FROM tenants t
LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id
LEFT JOIN rooms r ON tra.room_id = r.id
LEFT JOIN buildings b ON r.building_id = b.id
WHERE t.tenant_status = 'active';
-- Execution time: 1200ms
-- Multiple full table scans
```

## Target Behavior
```sql
-- Query with indexes (FAST)
SELECT * FROM tenants WHERE tenant_status = 'active';
-- Execution time: 25ms (18x faster)
-- Index Scan using idx_tenants_status

-- Query with proper indexes (MUCH FASTER)
-- Execution time: 150ms (8x faster)
-- Uses all relevant indexes
```

## Indexes to Create

### 1. Tenants Table
```sql
-- Status filtering (used frequently)
CREATE INDEX CONCURRENTLY idx_tenants_status 
ON tenants(tenant_status) 
WHERE is_active = true;

-- Email lookup (unique, used for authentication)
CREATE UNIQUE INDEX CONCURRENTLY idx_tenants_email 
ON tenants(email) 
WHERE is_active = true;

-- Date-based queries
CREATE INDEX CONCURRENTLY idx_tenants_move_in 
ON tenants(move_in_date) 
WHERE move_in_date IS NOT NULL;

-- Search functionality
CREATE INDEX CONCURRENTLY idx_tenants_search 
ON tenants USING gin(to_tsvector('english', 
  COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')));
```

### 2. Buildings Table
```sql
-- Active buildings (filtered in most queries)
CREATE INDEX CONCURRENTLY idx_buildings_active 
ON buildings(is_active) 
WHERE is_active = true;

-- Location-based queries
CREATE INDEX CONCURRENTLY idx_buildings_location 
ON buildings(city, state) 
WHERE is_active = true;

-- Name search
CREATE INDEX CONCURRENTLY idx_buildings_name 
ON buildings(name) 
WHERE is_active = true;
```

### 3. Rooms Table
```sql
-- Building relationship (used in joins)
CREATE INDEX CONCURRENTLY idx_rooms_building 
ON rooms(building_id) 
WHERE is_active = true;

-- Status filtering
CREATE INDEX CONCURRENTLY idx_rooms_status 
ON rooms(room_status) 
WHERE is_active = true;

-- Room type filtering
CREATE INDEX CONCURRENTLY idx_rooms_type 
ON rooms(room_type);

-- Composite index for common query pattern
CREATE INDEX CONCURRENTLY idx_rooms_building_status 
ON rooms(building_id, room_status) 
WHERE is_active = true;
```

### 4. Tenant Room Assignments
```sql
-- Tenant lookup (frequent)
CREATE INDEX CONCURRENTLY idx_assignments_tenant 
ON tenant_room_assignments(tenant_id);

-- Room lookup (frequent)
CREATE INDEX CONCURRENTLY idx_assignments_room 
ON tenant_room_assignments(room_id);

-- Active assignments
CREATE INDEX CONCURRENTLY idx_assignments_status 
ON tenant_room_assignments(assignment_status);

-- Date range queries
CREATE INDEX CONCURRENTLY idx_assignments_dates 
ON tenant_room_assignments(start_date, end_date);

-- Composite for current assignments
CREATE INDEX CONCURRENTLY idx_assignments_current 
ON tenant_room_assignments(tenant_id, assignment_status) 
WHERE assignment_status = 'active';
```

### 5. Invoices Table
```sql
-- Tenant relationship
CREATE INDEX CONCURRENTLY idx_invoices_tenant 
ON invoices(tenant_id);

-- Status filtering
CREATE INDEX CONCURRENTLY idx_invoices_status 
ON invoices(invoice_status);

-- Date-based queries
CREATE INDEX CONCURRENTLY idx_invoices_dates 
ON invoices(issue_date, due_date);

-- Overdue invoices
CREATE INDEX CONCURRENTLY idx_invoices_overdue 
ON invoices(due_date, invoice_status) 
WHERE invoice_status IN ('pending', 'overdue');
```

### 6. Payments Table
```sql
-- Tenant relationship
CREATE INDEX CONCURRENTLY idx_payments_tenant 
ON payments(tenant_id);

-- Invoice relationship
CREATE INDEX CONCURRENTLY idx_payments_invoice 
ON payments(invoice_id);

-- Status and date
CREATE INDEX CONCURRENTLY idx_payments_status_date 
ON payments(payment_status, payment_date);

-- Date-based queries
CREATE INDEX CONCURRENTLY idx_payments_date 
ON payments(payment_date DESC);
```

### 7. Documents Table
```sql
-- Building relationship
CREATE INDEX CONCURRENTLY idx_documents_building 
ON documents(building_id);

-- Room relationship
CREATE INDEX CONCURRENTLY idx_documents_room 
ON documents(room_id);

-- Tenant relationship
CREATE INDEX CONCURRENTLY idx_documents_tenant 
ON documents(tenant_id);

-- Category filtering
CREATE INDEX CONCURRENTLY idx_documents_category 
ON documents(category_id);

-- Type filtering
CREATE INDEX CONCURRENTLY idx_documents_type 
ON documents(document_type);

-- Expiry tracking
CREATE INDEX CONCURRENTLY idx_documents_expiry 
ON documents(expiry_date) 
WHERE expiry_date IS NOT NULL;
```

### 8. Utility Meter Readings
```sql
-- Building relationship
CREATE INDEX CONCURRENTLY idx_meter_readings_building 
ON utility_meter_readings(building_id);

-- Room relationship
CREATE INDEX CONCURRENTLY idx_meter_readings_room 
ON utility_meter_readings(room_id);

-- Date-based queries
CREATE INDEX CONCURRENTLY idx_meter_readings_date 
ON utility_meter_readings(reading_date DESC);

-- Utility type filtering
CREATE INDEX CONCURRENTLY idx_meter_readings_type 
ON utility_meter_readings(utility_type);

-- Composite for common pattern
CREATE INDEX CONCURRENTLY idx_meter_readings_composite 
ON utility_meter_readings(building_id, room_id, utility_type, reading_date DESC);
```

## Files to Create

### Migration Script
- `migrations/add-performance-indexes.sql`
- `migrations/rollback-performance-indexes.sql`

### Documentation
- `docs/database-indexes.md`
- Update `docs/database-schema.md`

## Implementation Steps

### Step 1: Analyze Current Query Performance (30 min)

```sql
-- Enable query timing
\timing on

-- Test common queries without indexes
EXPLAIN ANALYZE SELECT * FROM tenants WHERE tenant_status = 'active';
EXPLAIN ANALYZE SELECT * FROM rooms WHERE building_id = 'some-id';
EXPLAIN ANALYZE SELECT * FROM invoices WHERE invoice_status = 'pending';

-- Document execution times
```

### Step 2: Create Migration Script (45 min)

```sql
-- migrations/add-performance-indexes.sql

BEGIN;

-- Show progress
\echo 'Creating indexes on tenants table...'

-- Tenants indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_status 
ON tenants(tenant_status) 
WHERE is_active = true;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_email 
ON tenants(email) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_move_in 
ON tenants(move_in_date) 
WHERE move_in_date IS NOT NULL;

\echo 'Creating indexes on buildings table...'

-- Buildings indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buildings_active 
ON buildings(is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buildings_location 
ON buildings(city, state) 
WHERE is_active = true;

-- ... (continue for all tables)

\echo 'All indexes created successfully!'

-- Analyze tables to update statistics
ANALYZE tenants;
ANALYZE buildings;
ANALYZE rooms;
ANALYZE tenant_room_assignments;
ANALYZE invoices;
ANALYZE payments;
ANALYZE documents;
ANALYZE utility_meter_readings;

\echo 'Table statistics updated!'

COMMIT;
```

### Step 3: Create Rollback Script (15 min)

```sql
-- migrations/rollback-performance-indexes.sql

BEGIN;

\echo 'Dropping performance indexes...'

DROP INDEX CONCURRENTLY IF EXISTS idx_tenants_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_tenants_email;
DROP INDEX CONCURRENTLY IF EXISTS idx_tenants_move_in;
DROP INDEX CONCURRENTLY IF EXISTS idx_buildings_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_buildings_location;
-- ... (all indexes)

\echo 'All performance indexes dropped!'

COMMIT;
```

### Step 4: Test on Development Database (30 min)

```bash
# Connect to dev database
psql $DATABASE_URL

# Run migration
\i migrations/add-performance-indexes.sql

# Test queries
EXPLAIN ANALYZE SELECT * FROM tenants WHERE tenant_status = 'active';

# Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

### Step 5: Deploy to Production (30 min)

```bash
# Backup database first
pg_dump $PRODUCTION_DATABASE_URL > backup-before-indexes.sql

# Run migration (CONCURRENTLY ensures no downtime)
psql $PRODUCTION_DATABASE_URL -f migrations/add-performance-indexes.sql

# Monitor index creation progress
SELECT 
  pid, 
  phase, 
  round(100.0 * current_locker_total / total_locker_total, 2) as pct_complete
FROM pg_stat_progress_create_index;
```

### Step 6: Verify Performance (15 min)

```sql
-- Test query performance
EXPLAIN ANALYZE SELECT * FROM tenants WHERE tenant_status = 'active';

-- Check index sizes
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- Monitor index usage over time
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
```

## Acceptance Criteria

### Must Have
- [ ] All indexes created successfully on development
- [ ] All indexes created successfully on production
- [ ] No downtime during index creation
- [ ] Query performance improved by 50%+ for indexed queries
- [ ] Migration script is rerunnable (IF NOT EXISTS)
- [ ] Rollback script tested and works
- [ ] Database size increase is acceptable (<20% growth)

### Nice to Have
- [ ] Query execution plans document index usage
- [ ] Monitoring dashboard shows index hit rates
- [ ] Automated index usage reports
- [ ] Index maintenance schedule documented

## Performance Metrics

### Expected Improvements

| Query Type | Before | After | Improvement |
|------------|--------|-------|-------------|
| Tenant by status | 450ms | 25ms | 18x faster |
| Rooms by building | 300ms | 15ms | 20x faster |
| Active assignments | 600ms | 40ms | 15x faster |
| Overdue invoices | 800ms | 50ms | 16x faster |
| Document search | 1200ms | 80ms | 15x faster |

### Database Size Impact

- Current size: ~500MB
- Index size: ~75MB (15% increase)
- Total size: ~575MB
- **Trade-off: 15% storage for 15-20x query speed** ✅

## Testing Checklist

### Pre-Deployment
- [ ] Migration script runs on dev database
- [ ] All indexes created without errors
- [ ] No duplicate index warnings
- [ ] Query plans show index usage
- [ ] Performance benchmarks show improvement
- [ ] Rollback script tested

### Post-Deployment
- [ ] All indexes exist in production
- [ ] No application errors
- [ ] Page load times improved
- [ ] Database CPU usage stable or reduced
- [ ] No deadlocks or blocking queries
- [ ] Index usage statistics look healthy

## Monitoring

### Queries to Monitor Index Health

```sql
-- Unused indexes (consider dropping)
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  idx_scan 
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
  AND indexrelname NOT LIKE 'pg_toast%';

-- Index bloat check
SELECT 
  schemaname, 
  tablename, 
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Missing indexes suggestions
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%WHERE%' 
  AND calls > 100 
ORDER BY mean_exec_time DESC 
LIMIT 20;
```

## Documentation

### Create: `docs/database-indexes.md`

```markdown
# Database Indexes

## Overview
This document describes all indexes in the database and their purpose.

## Performance Indexes

### Tenants Table
- `idx_tenants_status` - Filter active tenants
- `idx_tenants_email` - Email lookup
- `idx_tenants_move_in` - Date-based queries

### Buildings Table
- `idx_buildings_active` - Active building filter
- `idx_buildings_location` - Location-based search

... (full documentation)

## Maintenance

### Rebuilding Indexes
```sql
REINDEX INDEX CONCURRENTLY idx_tenants_status;
```

### Monitoring Index Health
```sql
-- See monitoring queries above
```
```

## Related Tasks
- PERF-001 (Pagination) - Recommended to complete first
- PERF-004 (Query Caching) - Builds on this
- PERF-005 (Code Splitting) - Independent

## Notes
- Use `CONCURRENTLY` to avoid locking tables
- Monitor index usage after 1 week
- Consider adding more indexes based on slow query log
- Regular VACUUM and ANALYZE recommended

## Success Criteria
✅ Task is complete when:
1. All indexes created successfully
2. No application downtime
3. Query performance improved by 50%+
4. Monitoring shows healthy index usage
5. Documentation updated
6. Production deployment successful

