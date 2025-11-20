-- Notifications & Reminders System Migration
-- Adds tables for managing email notifications, reminders, and notification history

-- =====================================================
-- NOTIFICATION TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'payment_reminder',
    'payment_overdue',
    'payment_confirmation',
    'invoice_sent',
    'lease_expiry_warning',
    'lease_renewal_reminder',
    'late_fee_applied',
    'welcome',
    'general'
  )),
  
  -- Template variables (JSON array of variable names)
  variables JSONB DEFAULT '[]'::jsonb,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- System templates cannot be deleted
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_html CHECK (LENGTH(body_html) > 0)
);

-- =====================================================
-- NOTIFICATION SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope (global or building-specific)
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  
  -- Notification type
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
    'payment_reminder',
    'payment_overdue',
    'invoice_sent',
    'lease_expiry_warning'
  )),
  
  -- Timing settings
  enabled BOOLEAN DEFAULT true,
  days_before_due INTEGER, -- For reminders (e.g., send 3 days before due)
  days_after_due INTEGER,  -- For overdue (e.g., send 1 day after due)
  
  -- Recurrence for overdue
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval_days INTEGER, -- Send every X days if still unpaid
  max_occurrences INTEGER, -- Maximum times to send
  
  -- Template
  template_id UUID REFERENCES notification_templates(id),
  
  -- Recipients
  send_to_tenant BOOLEAN DEFAULT true,
  send_to_admin BOOLEAN DEFAULT false,
  admin_email VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_notification_type_building UNIQUE NULLS NOT DISTINCT (building_id, notification_type)
);

-- =====================================================
-- NOTIFICATION QUEUE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL,
  template_id UUID REFERENCES notification_templates(id),
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  
  -- Context data (for tracking and debugging)
  context_data JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  
  -- Scheduling
  scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Provider details
  provider VARCHAR(50) DEFAULT 'resend',
  provider_message_id VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- NOTIFICATION HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Same structure as queue, but for completed notifications
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  
  notification_type VARCHAR(50) NOT NULL,
  template_id UUID REFERENCES notification_templates(id),
  subject VARCHAR(500) NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'cancelled')),
  
  -- Context
  context_data JSONB DEFAULT '{}'::jsonb,
  
  -- Provider
  provider VARCHAR(50),
  provider_message_id VARCHAR(255),
  error_message TEXT,
  
  -- Timestamps
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SCHEDULED REMINDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Target
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Reminder type
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN (
    'payment_due_soon',
    'payment_overdue',
    'lease_expiring_soon'
  )),
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  sent_date TIMESTAMP,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  
  -- Recurrence tracking (for overdue reminders)
  occurrence_number INTEGER DEFAULT 1,
  
  -- Reference to notification setting
  notification_setting_id UUID REFERENCES notification_settings(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_tenant ON notification_queue(tenant_id);

CREATE INDEX IF NOT EXISTS idx_notification_history_tenant ON notification_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_created ON notification_history(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status ON scheduled_reminders(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_date ON scheduled_reminders(scheduled_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_tenant ON scheduled_reminders(tenant_id);

CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON notification_settings(notification_type);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate scheduled reminders for upcoming due dates
CREATE OR REPLACE FUNCTION generate_payment_reminders()
RETURNS INTEGER AS $$
DECLARE
  v_reminders_created INTEGER := 0;
  v_setting RECORD;
  v_invoice RECORD;
  v_tenant RECORD;
  v_reminder_date DATE;
BEGIN
  -- Get all active payment reminder settings
  FOR v_setting IN 
    SELECT * FROM notification_settings 
    WHERE enabled = true 
      AND notification_type = 'payment_reminder'
      AND days_before_due IS NOT NULL
  LOOP
    -- Find invoices that should receive reminders
    FOR v_invoice IN
      SELECT i.*, t.id as tenant_id, t.email, t.first_name, t.last_name
      FROM invoices i
      JOIN tenants t ON t.id = i.tenant_id
      WHERE i.invoice_status IN ('sent', 'partial')
        AND i.due_date > CURRENT_DATE
        AND i.due_date <= CURRENT_DATE + v_setting.days_before_due
        AND NOT EXISTS (
          SELECT 1 FROM scheduled_reminders sr
          WHERE sr.invoice_id = i.id
            AND sr.reminder_type = 'payment_due_soon'
            AND sr.status IN ('pending', 'sent')
        )
    LOOP
      v_reminder_date := v_invoice.due_date - v_setting.days_before_due;
      
      -- Create scheduled reminder
      INSERT INTO scheduled_reminders (
        tenant_id, invoice_id, reminder_type,
        scheduled_date, notification_setting_id
      ) VALUES (
        v_invoice.tenant_id, v_invoice.id, 'payment_due_soon',
        v_reminder_date, v_setting.id
      );
      
      v_reminders_created := v_reminders_created + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_reminders_created;
END;
$$ LANGUAGE plpgsql;

-- Function to process pending reminders and add to queue
CREATE OR REPLACE FUNCTION process_pending_reminders()
RETURNS INTEGER AS $$
DECLARE
  v_processed INTEGER := 0;
  v_reminder RECORD;
  v_invoice RECORD;
  v_tenant RECORD;
  v_setting RECORD;
  v_template RECORD;
BEGIN
  FOR v_reminder IN
    SELECT * FROM scheduled_reminders
    WHERE status = 'pending'
      AND scheduled_date <= CURRENT_DATE
  LOOP
    BEGIN
      -- Get related data
      SELECT * INTO v_invoice FROM invoices WHERE id = v_reminder.invoice_id;
      SELECT * INTO v_tenant FROM tenants WHERE id = v_reminder.tenant_id;
      SELECT * INTO v_setting FROM notification_settings WHERE id = v_reminder.notification_setting_id;
      SELECT * INTO v_template FROM notification_templates WHERE id = v_setting.template_id;
      
      IF v_tenant.email IS NOT NULL AND v_template.id IS NOT NULL THEN
        -- Add to notification queue
        INSERT INTO notification_queue (
          recipient_email, recipient_name, tenant_id,
          notification_type, template_id, subject, body_html, body_text,
          context_data
        ) VALUES (
          v_tenant.email,
          v_tenant.first_name || ' ' || v_tenant.last_name,
          v_tenant.id,
          v_reminder.reminder_type,
          v_template.id,
          v_template.subject,
          v_template.body_html,
          v_template.body_text,
          jsonb_build_object(
            'invoice_id', v_invoice.id,
            'invoice_number', v_invoice.invoice_number,
            'due_date', v_invoice.due_date,
            'amount', v_invoice.total_amount
          )
        );
        
        -- Mark reminder as sent
        UPDATE scheduled_reminders
        SET status = 'sent', sent_date = CURRENT_TIMESTAMP
        WHERE id = v_reminder.id;
        
        v_processed := v_processed + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        UPDATE scheduled_reminders
        SET status = 'failed'
        WHERE id = v_reminder.id;
    END;
  END LOOP;
  
  RETURN v_processed;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notification_templates IS 'Email templates for various notification types';
COMMENT ON TABLE notification_settings IS 'Configuration for automated notifications per building or globally';
COMMENT ON TABLE notification_queue IS 'Queue of pending notifications to be sent';
COMMENT ON TABLE notification_history IS 'Historical record of all sent notifications';
COMMENT ON TABLE scheduled_reminders IS 'Scheduled reminders for specific tenants and invoices';
COMMENT ON FUNCTION generate_payment_reminders IS 'Generates scheduled reminders for upcoming invoice due dates';
COMMENT ON FUNCTION process_pending_reminders IS 'Processes pending reminders and adds them to the notification queue';

