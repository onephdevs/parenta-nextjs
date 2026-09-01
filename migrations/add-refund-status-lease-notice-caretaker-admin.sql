-- Refunded payments stay on the ledger (new pay = new payment id).
-- Lease notice: planned move-out date without vacating the room.
-- Caretaker is the same office role as admin.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'paid',
    'partial',
    'overdue',
    'cancelled',
    'refunded'
  ));

COMMENT ON CONSTRAINT payments_payment_status_check ON payments IS
  'refunded = money returned, row kept; cancelled = voided/rejected claim';

ALTER TABLE tenant_room_assignments
  ADD COLUMN IF NOT EXISTS planned_move_out_date DATE,
  ADD COLUMN IF NOT EXISTS contract_terminated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_terminated_reason TEXT;

COMMENT ON COLUMN tenant_room_assignments.planned_move_out_date IS
  'Office-chosen expected leave date (Terminate). Room stays occupied until End Assignment / finalize.';
COMMENT ON COLUMN tenant_room_assignments.contract_terminated_at IS
  'When the office ended the lease on paper. Occupancy is unchanged.';
COMMENT ON COLUMN tenant_room_assignments.contract_terminated_reason IS
  'Optional reason captured when Terminate is confirmed.';

CREATE INDEX IF NOT EXISTS idx_assignments_planned_move_out
  ON tenant_room_assignments (planned_move_out_date)
  WHERE planned_move_out_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_contract_terminated
  ON tenant_room_assignments (contract_terminated_at)
  WHERE contract_terminated_at IS NOT NULL;

UPDATE users
SET role = 'admin',
    updated_at = CURRENT_TIMESTAMP
WHERE role = 'caretaker';
