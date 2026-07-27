-- ============================================================================
-- Scalability Pass: Missing Indexes (Phase 3 Step 1)
-- ============================================================================
-- Tied to query patterns from SCALABILITY_AUDIT.md:
--   - invoice-status-recalculator filters applied_to_invoice_id
--   - maintenance JOINs on room_id
--   - tenant_utility_bills / cost_allocation_history had no indexes
--   - list endpoints ORDER BY created_at DESC
--
-- IMPORTANT: Do NOT wrap CREATE INDEX CONCURRENTLY in BEGIN/COMMIT.
-- Run statements one at a time (see scripts/run-scalability-indexes.js).
-- ============================================================================

-- Invoice status recalc hot path
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_credits_applied_invoice
  ON tenant_credits(applied_to_invoice_id)
  WHERE applied_to_invoice_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deposit_ledger_applied_invoice
  ON deposit_ledger(applied_to_invoice_id)
  WHERE applied_to_invoice_id IS NOT NULL;

-- Maintenance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_requests_room
  ON maintenance_requests(room_id)
  WHERE room_id IS NOT NULL;

-- Tenant utility bills (previously unindexed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_utility_bills_tenant
  ON tenant_utility_bills(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_utility_bills_building
  ON tenant_utility_bills(building_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_utility_bills_utility_bill
  ON tenant_utility_bills(utility_bill_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_utility_bills_status
  ON tenant_utility_bills(bill_status);

-- Cost allocation history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cost_allocation_history_building
  ON cost_allocation_history(building_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cost_allocation_history_utility_bill
  ON cost_allocation_history(utility_bill_id);

-- List/sort helpers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created
  ON notifications(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_created
  ON invoices(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created
  ON payments(created_at DESC);

ANALYZE tenant_credits;
ANALYZE deposit_ledger;
ANALYZE maintenance_requests;
ANALYZE tenant_utility_bills;
ANALYZE cost_allocation_history;
ANALYZE notifications;
ANALYZE invoices;
ANALYZE payments;
