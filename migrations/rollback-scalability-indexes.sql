-- ============================================================================
-- Rollback: Scalability Indexes
-- ============================================================================
-- Drops indexes created by add-scalability-indexes.sql
-- Do NOT wrap DROP INDEX CONCURRENTLY in BEGIN/COMMIT.
-- ============================================================================

DROP INDEX CONCURRENTLY IF EXISTS idx_tenant_credits_applied_invoice;
DROP INDEX CONCURRENTLY IF EXISTS idx_deposit_ledger_applied_invoice;
DROP INDEX CONCURRENTLY IF EXISTS idx_maintenance_requests_room;
DROP INDEX CONCURRENTLY IF EXISTS idx_tenant_utility_bills_tenant;
DROP INDEX CONCURRENTLY IF EXISTS idx_tenant_utility_bills_building;
DROP INDEX CONCURRENTLY IF EXISTS idx_tenant_utility_bills_utility_bill;
DROP INDEX CONCURRENTLY IF EXISTS idx_tenant_utility_bills_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_cost_allocation_history_building;
DROP INDEX CONCURRENTLY IF EXISTS idx_cost_allocation_history_utility_bill;
DROP INDEX CONCURRENTLY IF EXISTS idx_notifications_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_invoices_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_payments_created;
