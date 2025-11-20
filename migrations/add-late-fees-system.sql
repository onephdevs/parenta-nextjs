-- Late Fee Automation System Migration
-- Adds tables and functions for automatic late fee calculation and application

-- =====================================================
-- LATE FEE CONFIGURATION
-- =====================================================

-- Late fee settings table (per property/building or global)
CREATE TABLE IF NOT EXISTS late_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Fee calculation settings
  fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('percentage', 'flat_rate', 'tiered')),
  percentage_amount DECIMAL(5,2), -- e.g., 5.00 for 5%
  flat_rate_amount DECIMAL(10,2), -- e.g., 50.00 for ₱50
  
  -- Grace period settings
  grace_period_days INTEGER NOT NULL DEFAULT 5,
  apply_after_days INTEGER NOT NULL DEFAULT 5, -- Apply fee after X days past due
  
  -- Recurrence settings
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval_days INTEGER, -- Apply additional fee every X days
  max_occurrences INTEGER, -- Maximum number of times to apply recurring fee
  
  -- Caps and limits
  max_fee_amount DECIMAL(10,2), -- Maximum total late fee
  min_invoice_amount DECIMAL(10,2), -- Only apply to invoices above this amount
  
  -- Application settings
  is_active BOOLEAN DEFAULT true,
  auto_apply BOOLEAN DEFAULT false, -- Automatically apply without manual approval
  send_notification BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure building-specific or global default
  CONSTRAINT one_default_per_building UNIQUE NULLS NOT DISTINCT (building_id)
);

-- Late fee applications log (tracks when fees are applied)
CREATE TABLE IF NOT EXISTS late_fee_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  late_fee_setting_id UUID NOT NULL REFERENCES late_fee_settings(id),
  
  -- Fee details
  fee_amount DECIMAL(10,2) NOT NULL,
  calculation_method VARCHAR(20) NOT NULL,
  days_overdue INTEGER NOT NULL,
  original_amount DECIMAL(10,2) NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'waived', 'cancelled')),
  applied_at TIMESTAMP,
  waived_at TIMESTAMP,
  waived_by UUID REFERENCES users(id),
  waived_reason TEXT,
  
  -- Generated invoice for the late fee
  late_fee_invoice_id UUID REFERENCES invoices(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tiered fee structure (for tiered late fee calculations)
CREATE TABLE IF NOT EXISTS late_fee_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  late_fee_setting_id UUID NOT NULL REFERENCES late_fee_settings(id) ON DELETE CASCADE,
  
  -- Tier definition
  min_days_overdue INTEGER NOT NULL,
  max_days_overdue INTEGER, -- NULL means no upper limit
  fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('percentage', 'flat_rate')),
  percentage_amount DECIMAL(5,2),
  flat_rate_amount DECIMAL(10,2),
  
  -- Order
  tier_order INTEGER NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_tier_order UNIQUE (late_fee_setting_id, tier_order)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_late_fee_settings_building ON late_fee_settings(building_id);
CREATE INDEX IF NOT EXISTS idx_late_fee_settings_active ON late_fee_settings(is_active);

CREATE INDEX IF NOT EXISTS idx_late_fee_applications_invoice ON late_fee_applications(invoice_id);
CREATE INDEX IF NOT EXISTS idx_late_fee_applications_tenant ON late_fee_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_late_fee_applications_status ON late_fee_applications(status);
CREATE INDEX IF NOT EXISTS idx_late_fee_applications_created ON late_fee_applications(created_at);

CREATE INDEX IF NOT EXISTS idx_late_fee_tiers_setting ON late_fee_tiers(late_fee_setting_id, tier_order);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate late fee for an invoice
CREATE OR REPLACE FUNCTION calculate_late_fee(
  p_invoice_id UUID,
  p_late_fee_setting_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_invoice RECORD;
  v_setting RECORD;
  v_days_overdue INTEGER;
  v_fee_amount DECIMAL(10,2);
  v_tier RECORD;
BEGIN
  -- Get invoice details
  SELECT 
    total_amount,
    amount_paid,
    due_date,
    CURRENT_DATE - due_date AS days_overdue
  INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  -- Get late fee settings
  SELECT * INTO v_setting
  FROM late_fee_settings
  WHERE id = p_late_fee_setting_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Late fee setting not found';
  END IF;
  
  v_days_overdue := v_invoice.days_overdue;
  
  -- Check if within grace period
  IF v_days_overdue <= v_setting.grace_period_days THEN
    RETURN 0;
  END IF;
  
  -- Check if past apply threshold
  IF v_days_overdue < v_setting.apply_after_days THEN
    RETURN 0;
  END IF;
  
  -- Check minimum invoice amount
  IF v_setting.min_invoice_amount IS NOT NULL 
     AND v_invoice.total_amount < v_setting.min_invoice_amount THEN
    RETURN 0;
  END IF;
  
  -- Calculate fee based on type
  IF v_setting.fee_type = 'percentage' THEN
    v_fee_amount := (v_invoice.total_amount * v_setting.percentage_amount / 100);
    
  ELSIF v_setting.fee_type = 'flat_rate' THEN
    v_fee_amount := v_setting.flat_rate_amount;
    
  ELSIF v_setting.fee_type = 'tiered' THEN
    -- Find applicable tier
    SELECT * INTO v_tier
    FROM late_fee_tiers
    WHERE late_fee_setting_id = p_late_fee_setting_id
      AND v_days_overdue >= min_days_overdue
      AND (max_days_overdue IS NULL OR v_days_overdue <= max_days_overdue)
    ORDER BY tier_order DESC
    LIMIT 1;
    
    IF FOUND THEN
      IF v_tier.fee_type = 'percentage' THEN
        v_fee_amount := (v_invoice.total_amount * v_tier.percentage_amount / 100);
      ELSE
        v_fee_amount := v_tier.flat_rate_amount;
      END IF;
    ELSE
      v_fee_amount := 0;
    END IF;
  END IF;
  
  -- Apply maximum cap if set
  IF v_setting.max_fee_amount IS NOT NULL 
     AND v_fee_amount > v_setting.max_fee_amount THEN
    v_fee_amount := v_setting.max_fee_amount;
  END IF;
  
  RETURN COALESCE(v_fee_amount, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get all invoices eligible for late fees
CREATE OR REPLACE FUNCTION get_overdue_invoices_for_late_fees()
RETURNS TABLE (
  invoice_id UUID,
  tenant_id UUID,
  building_id UUID,
  days_overdue INTEGER,
  outstanding_amount DECIMAL,
  applicable_setting_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id AS invoice_id,
    i.tenant_id,
    r.building_id,
    (CURRENT_DATE - i.due_date)::INTEGER AS days_overdue,
    (i.total_amount - i.amount_paid) AS outstanding_amount,
    lfs.id AS applicable_setting_id
  FROM invoices i
  JOIN tenant_room_assignments tra ON tra.tenant_id = i.tenant_id
  JOIN rooms r ON r.id = tra.room_id
  LEFT JOIN late_fee_settings lfs ON (
    lfs.building_id = r.building_id 
    OR lfs.building_id IS NULL
  )
  WHERE i.invoice_status IN ('sent', 'partial', 'overdue')
    AND i.due_date < CURRENT_DATE
    AND (i.total_amount - i.amount_paid) > 0
    AND lfs.is_active = true
    AND (CURRENT_DATE - i.due_date) >= lfs.apply_after_days
    AND NOT EXISTS (
      SELECT 1 FROM late_fee_applications lfa
      WHERE lfa.invoice_id = i.id
        AND lfa.status IN ('applied', 'pending')
    )
  ORDER BY i.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE late_fee_settings IS 'Configuration for automatic late fee calculation and application';
COMMENT ON TABLE late_fee_applications IS 'Log of all late fees applied to invoices';
COMMENT ON TABLE late_fee_tiers IS 'Tiered fee structure for progressive late fee calculations';
COMMENT ON FUNCTION calculate_late_fee IS 'Calculates the late fee amount for a given invoice';
COMMENT ON FUNCTION get_overdue_invoices_for_late_fees IS 'Returns all invoices eligible for late fee application';

