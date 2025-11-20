-- Dashboard and Reports System Migration
-- Adds tables for caching dashboard metrics and storing report templates

-- =====================================================
-- DASHBOARD METRICS CACHE
-- =====================================================

-- Dashboard metrics cache (optional, for performance)
-- Stores pre-calculated metrics to speed up dashboard loading
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key VARCHAR(100) NOT NULL,
  metric_value JSONB NOT NULL,
  calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_key)
);

-- Index for quick metric lookup
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_key ON dashboard_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_valid ON dashboard_metrics(valid_until);

-- =====================================================
-- REPORT TEMPLATES
-- =====================================================

-- Report templates (for saved report configurations)
-- Allows users to save frequently used report configurations
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('revenue', 'payments', 'occupancy', 'expenses', 'tenant_summary')),
  filters JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for report templates
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(report_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_user ON report_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active);

-- =====================================================
-- PERFORMANCE INDEXES FOR DASHBOARD QUERIES
-- =====================================================

-- Invoices indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_invoices_status_date ON invoices(invoice_status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, invoice_status);

-- Payments indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_date ON payments(tenant_id, payment_date);

-- Tenant room assignments indexes for occupancy calculations
CREATE INDEX IF NOT EXISTS idx_tenant_assignments_dates ON tenant_room_assignments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tenant_assignments_status ON tenant_room_assignments(assignment_status);

-- Rooms index for occupancy calculations
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(room_status);
CREATE INDEX IF NOT EXISTS idx_rooms_building_status ON rooms(building_id, room_status);

-- =====================================================
-- HELPER FUNCTIONS FOR DASHBOARD
-- =====================================================

-- Function to get cached metric or return null if expired
CREATE OR REPLACE FUNCTION get_cached_metric(p_metric_key VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_metric_value JSONB;
BEGIN
  SELECT metric_value INTO v_metric_value
  FROM dashboard_metrics
  WHERE metric_key = p_metric_key
    AND valid_until > CURRENT_TIMESTAMP;
  
  RETURN v_metric_value;
END;
$$ LANGUAGE plpgsql;

-- Function to set cached metric with TTL (time to live in seconds)
CREATE OR REPLACE FUNCTION set_cached_metric(
  p_metric_key VARCHAR,
  p_metric_value JSONB,
  p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO dashboard_metrics (metric_key, metric_value, calculated_at, valid_until)
  VALUES (
    p_metric_key,
    p_metric_value,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + (p_ttl_seconds || ' seconds')::INTERVAL
  )
  ON CONFLICT (metric_key) 
  DO UPDATE SET
    metric_value = EXCLUDED.metric_value,
    calculated_at = EXCLUDED.calculated_at,
    valid_until = EXCLUDED.valid_until;
END;
$$ LANGUAGE plpgsql;

-- Function to clear expired metrics (can be called periodically)
CREATE OR REPLACE FUNCTION clear_expired_metrics()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM dashboard_metrics
  WHERE valid_until < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE dashboard_metrics IS 'Caches pre-calculated dashboard metrics to improve performance';
COMMENT ON TABLE report_templates IS 'Stores saved report configurations for quick access';
COMMENT ON FUNCTION get_cached_metric IS 'Retrieves a cached metric if it exists and is not expired';
COMMENT ON FUNCTION set_cached_metric IS 'Sets or updates a cached metric with a time-to-live';
COMMENT ON FUNCTION clear_expired_metrics IS 'Removes expired metrics from the cache';

