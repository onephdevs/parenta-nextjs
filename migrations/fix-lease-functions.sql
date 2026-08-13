-- Fix for Lease Management Functions
-- Updates function references to use correct column names

-- Drop and recreate generate_lease_expiration_alerts function
DROP FUNCTION IF EXISTS generate_lease_expiration_alerts();

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
      tra.end_date,
      t.email,
      t.first_name,
      t.last_name
    FROM tenant_room_assignments tra
    JOIN tenants t ON t.id = tra.tenant_id
    WHERE tra.assignment_status = 'active'
      AND tra.end_date >= CURRENT_DATE
  LOOP
    v_days_until_expiry := v_assignment.end_date - CURRENT_DATE;
    
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
        v_assignment.end_date,
        v_days_until_expiry,
        v_alert_type
      );
      
      v_alerts_created := v_alerts_created + 1;
    END IF;
  END LOOP;
  
  RETURN v_alerts_created;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate auto_initiate_moveout function
DROP FUNCTION IF EXISTS auto_initiate_moveout();

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
      tra.end_date
    FROM tenant_room_assignments tra
    WHERE tra.assignment_status = 'active'
      AND tra.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
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
      v_assignment.end_date,
      'initiated'
    );
    
    v_initiated := v_initiated + 1;
  END LOOP;
  
  RETURN v_initiated;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate process_lease_renewal function with correct column names  
DROP FUNCTION IF EXISTS process_lease_renewal(UUID);

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
  
  -- End the current lease (keep history row)
  UPDATE tenant_room_assignments
  SET assignment_status = 'terminated',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = v_renewal.room_assignment_id;
  
  -- Create new lease (room assignment)
  INSERT INTO tenant_room_assignments (
    tenant_id, room_id, assignment_status,
    start_date, end_date, monthly_rate,
    deposit_paid
  )
  SELECT 
    tenant_id,
    room_id,
    'active',
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

COMMENT ON FUNCTION generate_lease_expiration_alerts IS 'Generates alerts for leases expiring within 90 days (FIXED)';
COMMENT ON FUNCTION auto_initiate_moveout IS 'Automatically initiates move-out processing for expiring leases with no renewal (FIXED)';
COMMENT ON FUNCTION process_lease_renewal IS 'Processes an approved lease renewal (FIXED)';

