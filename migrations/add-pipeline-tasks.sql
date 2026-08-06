-- Multi-board Tasks / CRM pipeline (onboarding, payments, expenses, maintenance)
-- Prospects are lightweight cards until Won creates a real tenant + assignment.

CREATE TABLE IF NOT EXISTS pipeline_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES pipeline_boards(id) ON DELETE CASCADE,
  slug VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pipeline_stages_board_slug_unique UNIQUE (board_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_board_sort
  ON pipeline_stages (board_id, sort_order);

CREATE TABLE IF NOT EXISTS pipeline_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES pipeline_boards(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  contact_first_name VARCHAR(100),
  contact_last_name VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES tenant_room_assignments(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2),
  source VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  card_status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (card_status IN ('open', 'won', 'lost', 'archived')),
  due_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  viewing_at TIMESTAMPTZ,
  notes TEXT,
  prior_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  prior_board_id UUID REFERENCES pipeline_boards(id) ON DELETE SET NULL,
  nurture_reason VARCHAR(100),
  position INTEGER NOT NULL DEFAULT 0,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pipeline_cards_board_stage
  ON pipeline_cards (board_id, stage_id, position);
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_status
  ON pipeline_cards (card_status);
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_building
  ON pipeline_cards (building_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_tenant
  ON pipeline_cards (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_due
  ON pipeline_cards (due_at)
  WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_next_action
  ON pipeline_cards (next_action_at)
  WHERE next_action_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS pipeline_card_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES pipeline_cards(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  from_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  from_board_id UUID REFERENCES pipeline_boards(id) ON DELETE SET NULL,
  to_board_id UUID REFERENCES pipeline_boards(id) ON DELETE SET NULL,
  note TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pipeline_card_events_card
  ON pipeline_card_events (card_id, created_at DESC);

-- Seed boards
INSERT INTO pipeline_boards (slug, name, description, sort_order)
VALUES
  ('onboarding', 'Onboarding', 'Inquiry to signed lease', 1),
  ('payments', 'Payments', 'Manual payment follow-up for existing tenants', 2),
  ('expenses', 'Building expenses', 'Vendor / utility bill follow-up', 3)
ON CONFLICT (slug) DO NOTHING;

-- Seed stages (idempotent via board slug + stage slug)
INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
SELECT b.id, s.slug, s.name, s.color, s.sort_order, s.is_won, s.is_lost, s.is_terminal
FROM pipeline_boards b
JOIN (
  VALUES
    -- Onboarding
    ('onboarding', 'new_inquiry', 'New inquiry', '#7c3aed', 1, false, false, false),
    ('onboarding', 'viewing_scheduled', 'Viewing scheduled', '#8b5cf6', 2, false, false, false),
    ('onboarding', 'viewing_done', 'Viewing done', '#6366f1', 3, false, false, false),
    ('onboarding', 'application', 'Documents', '#3b82f6', 4, false, false, false),
    ('onboarding', 'background_check', 'Background check', '#f59e0b', 5, false, false, false),
    ('onboarding', 'awaiting_signature', 'Awaiting signature', '#14b8a6', 6, false, false, false),
    ('onboarding', 'won', 'Lease signed', '#22c55e', 7, true, false, true),
    ('onboarding', 'lost', 'Lost', '#94a3b8', 8, false, true, true),
    -- Payments
    ('payments', 'upcoming', 'Upcoming', '#6366f1', 1, false, false, false),
    ('payments', 'due', 'Due', '#3b82f6', 2, false, false, false),
    ('payments', 'reminder_sent', 'Reminder sent', '#f59e0b', 3, false, false, false),
    ('payments', 'overdue', 'Overdue', '#ef4444', 4, false, false, false),
    ('payments', 'paid', 'Paid', '#22c55e', 5, true, false, true),
    ('payments', 'refund', 'Refund', '#0d9488', 6, false, false, false),
    ('payments', 'escalation', 'Escalation', '#dc2626', 7, false, false, false),
    -- Expenses
    ('expenses', 'bill_received', 'Bill received', '#7c3aed', 1, false, false, false),
    ('expenses', 'verification', 'Verification', '#8b5cf6', 2, false, false, false),
    ('expenses', 'approval_pending', 'Approval pending', '#f59e0b', 3, false, false, false),
    ('expenses', 'approved', 'Approved', '#3b82f6', 4, false, false, false),
    ('expenses', 'payment_scheduled', 'Payment scheduled', '#14b8a6', 5, false, false, false),
    ('expenses', 'paid', 'Paid', '#22c55e', 6, true, false, true)
) AS s(board_slug, slug, name, color, sort_order, is_won, is_lost, is_terminal)
  ON b.slug = s.board_slug
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_stages ps
  WHERE ps.board_id = b.id AND ps.slug = s.slug
);
