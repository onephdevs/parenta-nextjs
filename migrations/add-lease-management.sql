-- Lease Management Enhancement Migration
-- Adds tables and functions for lease renewal, expiration tracking, and move-out processing

-- =====================================================
-- LEASE RENEWAL REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS lease_renewal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_assignment_id UUID NOT NULL REFERENCES tenant_room_assignments(id) ON DELETE CASCADE,
  
  -- Current lease details
  current_lease_end_date DATE NOT NULL,
  current_monthly_rent DECIMAL(10,2) NOT NULL,
  
  -- Proposed renewal details
  proposed_lease_start_date DATE NOT NULL,
  proposed_lease_end_date DATE NOT NULL,
  proposed_monthly_rent DECIMAL(10,2) NOT NULL,
  proposed_deposit_amount DECIMAL(10,2),
  
  -- Terms and notes
  terms TEXT,
  admin_notes TEXT,
  tenant_notes TEXT,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'completed'
  )),
  
  -- Approval tracking
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- LEASE EXPIRATION ALERTS
-- =====================================================

CREATE TABLE IF NOT EXISTS lease_expiration_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_assignment_id UUID NOT NULL REFERENCES tenant_room_assignments(id) ON DELETE CASCADE,
  
  -- Alert details
  lease_end_date DATE NOT NULL,
  days_until_expiry INTEGER NOT NULL,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN (
    '90_days',
    '60_days',
    '30_days',
    '14_days',
    '7_days',
    'expired'
  )),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'dismissed')),
  sent_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id),
  
  -- Action taken
  action_taken VARCHAR(50) CHECK (action_taken IN ('renewal_initiated', 'moveout_scheduled', 'no_action', 'other')),
  action_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MOVE-OUT PROCESSING
-- =====================================================

CREATE TABLE IF NOT EXISTS moveout_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_assignment_id UUID NOT NULL REFERENCES tenant_room_assignments(id) ON DELETE CASCADE,
  
  -- Move-out details
  moveout_date DATE NOT NULL,
  notice_date DATE,
  actual_moveout_date DATE,
  
  -- Inspection details
  inspection_scheduled_date DATE,
  inspection_completed_date DATE,
  inspection_notes TEXT,
  inspection_passed BOOLEAN,
  
  -- Financial settlement
  final_invoice_id UUID REFERENCES invoices(id),
  deposit_return_amount DECIMAL(10,2),
  deposit_deduction_amount DECIMAL(10,2),
  deduction_reason TEXT,
  settlement_completed BOOLEAN DEFAULT false,
  settlement_date DATE,
  
  -- Forwarding address
  forwarding_address TEXT,
  forwarding_city VARCHAR(100),
  forwarding_postal_code VARCHAR(20),
  forwarding_country VARCHAR(100),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'initiated' CHECK (status IN (
    'initiated',
    'inspection_scheduled',
    'inspection_completed',
    'settlement_pending',
    'deposit_processed',
    'completed',
    'cancelled'
  )),
  
  -- Assigned staff
  assigned_to UUID REFERENCES users(id),
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_lease_renewal_tenant ON lease_renewal_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_renewal_status ON lease_renewal_requests(status);
CREATE INDEX IF NOT EXISTS idx_lease_renewal_dates ON lease_renewal_requests(current_lease_end_date);

CREATE INDEX IF NOT EXISTS idx_lease_expiration_alerts_tenant ON lease_expiration_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_expiration_alerts_status ON lease_expiration_alerts(status);
CREATE INDEX IF NOT EXISTS idx_lease_expiration_alerts_date ON lease_expiration_alerts(lease_end_date);

CREATE INDEX IF NOT EXISTS idx_moveout_tenant ON moveout_processing(tenant_id);
CREATE INDEX IF NOT EXISTS idx_moveout_status ON moveout_processing(status);
CREATE INDEX IF NOT EXISTS idx_moveout_date ON moveout_processing(moveout_date);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate lease expiration alerts
CREATE OR REPLACE FUNCTION generate_lease_expiration_alerts()
RETURNS INTEGER AS $$
DECLARE
  v_alerts_created INTEGER := 0;
  v_assignment RECORD;
  v_days_until_expiry INTEGER;
  v_alert_type VARCHAR(20);
BEGIN
  -- Get all active room assignments
  FOR v_assignment IN
    SELECT 
      tra.id as assignment_id,
      tra.tenant_id,
      tra.lease_end_date,
      t.email,
      t.first_name,
      t.last_name
    FROM tenant_room_assignments tra
    JOIN tenants t ON t.id = tra.tenant_id
    WHERE tra.status = 'current'
      AND tra.lease_end_date >= CURRENT_DATE
  LOOP
    v_days_until_expiry := tra.lease_end_date - CURRENT_DATE;
    
    -- Determine alert type based on days until expiry
    IF v_days_until_expiry <= 0 THEN
      v_alert_type := 'expired';
    ELSIF v_days_until_expiry <= 7 THEN
      v_alert_type := '7_days';
    ELSIF v_days_until_expiry <= 14 THEN
      v_alert_type := '14_days';
    ELSIF v_days_until_expiry <= 30 THEN
      v_alert_type := '30_days';
    ELSIF v_days_until_expiry <= 60 THEN
      v_alert_type := '60_days';
    ELSIF v_days_until_expiry <= 90 THEN
      v_alert_type := '90_days';
    ELSE
      CONTINUE; -- Skip if more than 90 days
    END IF;
    
    -- Check if alert already exists for this type
    IF NOT EXISTS (
      SELECT 1 FROM lease_expiration_alerts
      WHERE room_assignment_id = v_assignment.assignment_id
        AND alert_type = v_alert_type
        AND status != 'dismissed'
    ) THEN
      -- Create alert
      INSERT INTO lease_expiration_alerts (
        tenant_id, room_assignment_id, lease_end_date,
        days_until_expiry, alert_type
      ) VALUES (
        v_assignment.tenant_id,
        v_assignment.assignment_id,
        v_assignment.lease_end_date,
        v_days_until_expiry,
        v_alert_type
      );
      
      v_alerts_created := v_alerts_created + 1;
    END IF;
  END LOOP;
  
  RETURN v_alerts_created;
END;
$$ LANGUAGE plpgsql;

-- Function to process approved lease renewals
CREATE OR REPLACE FUNCTION process_lease_renewal(p_renewal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_renewal RECORD;
BEGIN
  -- Get renewal details
  SELECT * INTO v_renewal
  FROM lease_renewal_requests
  WHERE id = p_renewal_id;
  
  IF NOT FOUND OR v_renewal.status != 'approved' THEN
    RETURN false;
  END IF;
  
  -- End the current lease
  UPDATE tenant_room_assignments
  SET status = 'past',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = v_renewal.room_assignment_id;
  
  -- Create new lease (room assignment)
  INSERT INTO tenant_room_assignments (
    tenant_id, room_id, status,
    lease_start_date, lease_end_date, monthly_rent,
    deposit_amount
  )
  SELECT 
    tenant_id,
    room_id,
    'current',
    v_renewal.proposed_lease_start_date,
    v_renewal.proposed_lease_end_date,
    v_renewal.proposed_monthly_rent,
    v_renewal.proposed_deposit_amount
  FROM tenant_room_assignments
  WHERE id = v_renewal.room_assignment_id;
  
  -- Mark renewal as completed
  UPDATE lease_renewal_requests
  SET status = 'completed',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_renewal_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to initiate automatic move-out processing
CREATE OR REPLACE FUNCTION auto_initiate_moveout()
RETURNS INTEGER AS $$
DECLARE
  v_initiated INTEGER := 0;
  v_assignment RECORD;
BEGIN
  -- Find leases that are expiring soon with no renewal request
  FOR v_assignment IN
    SELECT 
      tra.id as assignment_id,
      tra.tenant_id,
      tra.room_id,
      tra.lease_end_date
    FROM tenant_room_assignments tra
    WHERE tra.status = 'current'
      AND tra.lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM lease_renewal_requests lrr
        WHERE lrr.room_assignment_id = tra.id
          AND lrr.status IN ('pending', 'approved')
      )
      AND NOT EXISTS (
        SELECT 1 FROM moveout_processing mp
        WHERE mp.room_assignment_id = tra.id
          AND mp.status NOT IN ('completed', 'cancelled')
      )
  LOOP
    -- Create move-out processing record
    INSERT INTO moveout_processing (
      tenant_id, room_assignment_id, moveout_date, status
    ) VALUES (
      v_assignment.tenant_id,
      v_assignment.assignment_id,
      v_assignment.lease_end_date,
      'initiated'
    );
    
    v_initiated := v_initiated + 1;
  END LOOP;
  
  RETURN v_initiated;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE lease_renewal_requests IS 'Tracks lease renewal requests and approvals';
COMMENT ON TABLE lease_expiration_alerts IS 'Automated alerts for expiring leases';
COMMENT ON TABLE moveout_processing IS 'Tracks the move-out process including inspection and deposit return';
COMMENT ON FUNCTION generate_lease_expiration_alerts IS 'Generates alerts for leases expiring within 90 days';
COMMENT ON FUNCTION process_lease_renewal IS 'Processes an approved lease renewal by ending current lease and creating new one';
COMMENT ON FUNCTION auto_initiate_moveout IS 'Automatically initiates move-out processing for expiring leases with no renewal';

