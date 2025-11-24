-- ============================================================================
-- Rollback Script: Remove Performance Indexes
-- ============================================================================
-- This script removes all indexes created by add-performance-indexes.sql
-- Use this if you need to rollback the performance optimization
-- ============================================================================

BEGIN;

\echo '===================================================================='
\echo 'Rolling back performance indexes...'
\echo '===================================================================='

-- Tenants table indexes
\echo 'Dropping tenants indexes...'
DROP INDEX CONCURRENTLY IF EXISTS idx_tenants_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_tenants_email;
DROP INDEX CONCURRENTLY IF EXISTS idx_tenants_move_in;
DROP INDEX CONCURRENTLY IF EXISTS idx_tenants_active;

-- Buildings table indexes
\echo 'Dropping buildings indexes...'
DROP INDEX CONCURRENTLY IF EXISTS idx_buildings_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_buildings_location;
DROP INDEX CONCURRENTLY IF EXISTS idx_buildings_name;

-- Rooms table indexes
\echo 'Dropping rooms indexes...'
DROP INDEX CONCURRENTLY IF EXISTS idx_rooms_building;
DROP INDEX CONCURRENTLY IF EXISTS idx_rooms_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_rooms_type;
DROP INDEX CONCURRENTLY IF EXISTS idx_rooms_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_rooms_building_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_rooms_number;

-- Tenant room assignments indexes
\echo 'Dropping tenant_room_assignments indexes...'
DROP INDEX CONCURRENTLY IF EXISTS idx_assignments_tenant;
DROP INDEX CONCURRENTLY IF EXISTS idx_assignments_room;
DROP INDEX CONCURRENTLY IF EXISTS idx_assignments_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_assignments_start_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_assignments_end_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_assignments_current;

-- Invoices indexes
\echo 'Dropping invoices indexes...'
DROP INDEX CONCURRENTLY IF EXISTS idx_invoices_tenant;
DROP INDEX CONCURRENTLY IF EXISTS idx_invoices_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_invoices_issue_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_invoices_due_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_invoices_overdue;
DROP INDEX CONCURRENTLY IF EXISTS idx_invoices_tenant_date;

-- Payments indexes
\echo 'Dropping payments indexes...'
DROP INDEX CONCURRENTLY IF EXISTS idx_payments_tenant;
DROP INDEX CONCURRENTLY IF EXISTS idx_payments_invoice;
DROP INDEX CONCURRENTLY IF EXISTS idx_payments_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_payments_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_payments_status_date;

-- Documents indexes
\echo 'Dropping documents indexes...'
DROP INDEX CONCURRENTLY IF EXISTS idx_documents_building;
DROP INDEX CONCURRENTLY IF EXISTS idx_documents_room;
DROP INDEX CONCURRENTLY IF EXISTS idx_documents_tenant;
DROP INDEX CONCURRENTLY IF EXISTS idx_documents_category;
DROP INDEX CONCURRENTLY IF EXISTS idx_documents_type;
DROP INDEX CONCURRENTLY IF EXISTS idx_documents_expiry;
DROP INDEX CONCURRENTLY IF EXISTS idx_documents_active;

-- Utility meter readings indexes
\echo 'Dropping utility_meter_readings indexes...'
DROP INDEX CONCURRENTLY IF EXISTS idx_meter_readings_building;
DROP INDEX CONCURRENTLY IF EXISTS idx_meter_readings_room;
DROP INDEX CONCURRENTLY IF EXISTS idx_meter_readings_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_meter_readings_type;
DROP INDEX CONCURRENTLY IF EXISTS idx_meter_readings_composite;

\echo ''
\echo '===================================================================='
\echo '✓ All performance indexes dropped successfully'
\echo '===================================================================='

COMMIT;

