-- Phase 1 — Foundational schema (client discovery alignment)
-- Contacts directory, lease billing cycle, revenue units, deposit ledgers,
-- and utility allocation methods (SUBMETERED | SHARED_MANUAL | NOT_APPLICABLE).
-- Idempotent where practical. Does not drop legacy deposit_ledger.

-- =====================================================
-- 1. CONTACTS (parallel to tenants — staff / vendor / tenant roles)
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  notes TEXT,
  -- Optional link when this person is also a tenant identity
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  -- Optional login account (staff/admin users, or tenant portal user)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_active ON contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(last_name, first_name);

CREATE TABLE IF NOT EXISTS contact_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('TENANT', 'STAFF', 'VENDOR')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (contact_id, role)
);

CREATE INDEX IF NOT EXISTS idx_contact_roles_contact_id ON contact_roles(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_roles_role ON contact_roles(role);

COMMENT ON TABLE contacts IS 'People directory (tenants, staff, vendors). Parallel to tenants — does not replace occupancy/billing identity.';
COMMENT ON TABLE contact_roles IS 'Many roles per contact (e.g. TENANT + STAFF for a caretaker who also rents).';

-- =====================================================
-- 2. LEASE BILLING CYCLE (on tenant_room_assignments = lease)
-- =====================================================
ALTER TABLE tenant_room_assignments
  ADD COLUMN IF NOT EXISTS billing_cycle_start_day SMALLINT;

-- Backfill from assignment start_date (lease / move-in day of month)
UPDATE tenant_room_assignments
SET billing_cycle_start_day = EXTRACT(DAY FROM start_date)::SMALLINT
WHERE billing_cycle_start_day IS NULL
  AND start_date IS NOT NULL;

-- Clamp invalid / leap-day edge cases into 1–31
UPDATE tenant_room_assignments
SET billing_cycle_start_day = LEAST(GREATEST(billing_cycle_start_day, 1), 31)
WHERE billing_cycle_start_day IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_tra_billing_cycle_start_day'
  ) THEN
    ALTER TABLE tenant_room_assignments
      ADD CONSTRAINT chk_tra_billing_cycle_start_day
      CHECK (
        billing_cycle_start_day IS NULL
        OR (billing_cycle_start_day >= 1 AND billing_cycle_start_day <= 31)
      );
  END IF;
END $$;

COMMENT ON COLUMN tenant_room_assignments.billing_cycle_start_day IS
  'Day of month rent period starts (derived from move-in / lease start). Replaces hardcoded company-wide due day.';

-- =====================================================
-- 3. REVENUE UNIT FLAG (rooms)
-- =====================================================
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS is_revenue_unit BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN rooms.is_revenue_unit IS
  'true = collect rent (residential or STORE). false = ADMIN/owner-use: track utilities, exclude from rent collection.';

CREATE INDEX IF NOT EXISTS idx_rooms_is_revenue_unit ON rooms(is_revenue_unit);

-- =====================================================
-- 4. DEPOSIT LEDGERS (account + transactions)
-- Legacy flat deposit_ledger table is retained for existing code paths.
-- =====================================================
CREATE TABLE IF NOT EXISTS deposit_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Lease = tenant_room_assignments
  assignment_id UUID NOT NULL REFERENCES tenant_room_assignments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deposit_type VARCHAR(20) NOT NULL CHECK (deposit_type IN ('SECURITY', 'UTILITY')),
  initial_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  running_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (assignment_id, deposit_type)
);

CREATE INDEX IF NOT EXISTS idx_deposit_ledgers_assignment_id ON deposit_ledgers(assignment_id);
CREATE INDEX IF NOT EXISTS idx_deposit_ledgers_tenant_id ON deposit_ledgers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deposit_ledgers_type ON deposit_ledgers(deposit_type);
CREATE INDEX IF NOT EXISTS idx_deposit_ledgers_balance ON deposit_ledgers(running_balance)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS deposit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_ledger_id UUID NOT NULL REFERENCES deposit_ledgers(id) ON DELETE CASCADE,
  -- Positive = deposit added; negative = deducted / applied
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Optional links when applied to a bill
  applied_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deposit_transactions_ledger_id ON deposit_transactions(deposit_ledger_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_date ON deposit_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_created_by_contact ON deposit_transactions(created_by_contact_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_invoice ON deposit_transactions(applied_to_invoice_id);

CREATE OR REPLACE FUNCTION sync_deposit_ledger_running_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deposit_ledgers
  SET
    running_balance = (
      SELECT COALESCE(SUM(amount), 0)
      FROM deposit_transactions
      WHERE deposit_ledger_id = COALESCE(NEW.deposit_ledger_id, OLD.deposit_ledger_id)
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.deposit_ledger_id, OLD.deposit_ledger_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deposit_transactions_sync_balance ON deposit_transactions;
CREATE TRIGGER trg_deposit_transactions_sync_balance
  AFTER INSERT OR UPDATE OR DELETE ON deposit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_deposit_ledger_running_balance();

COMMENT ON TABLE deposit_ledgers IS 'Per-lease deposit account (SECURITY or UTILITY) with running balance.';
COMMENT ON TABLE deposit_transactions IS 'Ledger lines: positive adds balance, negative deducts (rent apply, damage, refund).';

-- =====================================================
-- 5. UTILITY ALLOCATION — methods + shared splits + N/A
-- =====================================================

-- Canonical methods (keep legacy values readable during transition)
ALTER TABLE utility_bills
  ALTER COLUMN allocation_method TYPE VARCHAR(30);

-- Map legacy → canonical where unambiguous
UPDATE utility_bills
SET allocation_method = 'SUBMETERED'
WHERE allocation_method IN ('per_unit_metered', 'usage');

UPDATE utility_bills
SET allocation_method = 'SHARED_MANUAL'
WHERE allocation_method IN ('split_evenly', 'equal');

-- flat / custom left as-is for building-wide; NOT_APPLICABLE is new opt-in

ALTER TABLE utility_allocation_rules
  ALTER COLUMN allocation_method TYPE VARCHAR(30);

UPDATE utility_allocation_rules
SET allocation_method = 'SUBMETERED'
WHERE allocation_method IN ('usage');

UPDATE utility_allocation_rules
SET allocation_method = 'SHARED_MANUAL'
WHERE allocation_method IN ('equal');

-- Room / tenant line applicability: distinguishes N/A from ₱0 paid/unpaid
ALTER TABLE tenant_utility_bills
  ADD COLUMN IF NOT EXISTS applicability_status VARCHAR(20) NOT NULL DEFAULT 'APPLICABLE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_tenant_utility_bills_applicability'
  ) THEN
    ALTER TABLE tenant_utility_bills
      ADD CONSTRAINT chk_tenant_utility_bills_applicability
      CHECK (applicability_status IN ('APPLICABLE', 'NOT_APPLICABLE'));
  END IF;
END $$;

COMMENT ON COLUMN tenant_utility_bills.applicability_status IS
  'APPLICABLE = billed amount applies. NOT_APPLICABLE = separate provider account — UI shows dash, not ₱0.';

ALTER TABLE utility_bills
  ADD COLUMN IF NOT EXISTS utility_unit_group_id UUID;

-- Named groups for SHARED_MANUAL (e.g. 3rd-floor water motor → 10 units)
CREATE TABLE IF NOT EXISTS utility_unit_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  utility_type VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_utility_unit_groups_building ON utility_unit_groups(building_id);
CREATE INDEX IF NOT EXISTS idx_utility_unit_groups_type ON utility_unit_groups(utility_type);

CREATE TABLE IF NOT EXISTS utility_unit_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES utility_unit_groups(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (group_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_utility_unit_group_members_group ON utility_unit_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_utility_unit_group_members_room ON utility_unit_group_members(room_id);

-- Manual per-unit split amounts for a parent / shared bill
CREATE TABLE IF NOT EXISTS utility_bill_unit_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_bill_id UUID NOT NULL REFERENCES utility_bills(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  amount DECIMAL(10,2),
  applicability_status VARCHAR(20) NOT NULL DEFAULT 'APPLICABLE'
    CHECK (applicability_status IN ('APPLICABLE', 'NOT_APPLICABLE')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (utility_bill_id, room_id),
  -- N/A must not look like ₱0: amount must be NULL when not applicable
  CONSTRAINT chk_utility_split_na_amount CHECK (
    (applicability_status = 'NOT_APPLICABLE' AND amount IS NULL)
    OR (applicability_status = 'APPLICABLE' AND amount IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_utility_bill_unit_splits_bill ON utility_bill_unit_splits(utility_bill_id);
CREATE INDEX IF NOT EXISTS idx_utility_bill_unit_splits_room ON utility_bill_unit_splits(room_id);
CREATE INDEX IF NOT EXISTS idx_utility_bill_unit_splits_applicability ON utility_bill_unit_splits(applicability_status);

-- FK from utility_bills → group (added after groups table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_utility_bills_unit_group'
  ) THEN
    ALTER TABLE utility_bills
      ADD CONSTRAINT fk_utility_bills_unit_group
      FOREIGN KEY (utility_unit_group_id)
      REFERENCES utility_unit_groups(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_utility_bills_unit_group ON utility_bills(utility_unit_group_id);

COMMENT ON TABLE utility_unit_groups IS 'Named unit sets for SHARED_MANUAL utility splits (e.g. floor motor serving N units).';
COMMENT ON TABLE utility_bill_unit_splits IS 'Per-unit manual amounts for SHARED_MANUAL bills; NOT_APPLICABLE uses null amount + status.';
