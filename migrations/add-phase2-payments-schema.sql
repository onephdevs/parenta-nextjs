-- Phase 2 — Payments: negotiated due dates, bill status, adjustments,
-- per-building auto late fees, expanded payment methods.
-- Idempotent where practical.

-- =====================================================
-- 1. INVOICE / BILL FIELDS
-- =====================================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS negotiated_due_date DATE,
  ADD COLUMN IF NOT EXISTS negotiated_due_reason TEXT,
  ADD COLUMN IF NOT EXISTS adjustment_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment_reason TEXT,
  ADD COLUMN IF NOT EXISTS bill_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_bill_status'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT chk_invoices_bill_status
      CHECK (bill_status IN ('PAID', 'UNPAID', 'PARTIAL'));
  END IF;
END $$;

UPDATE invoices
SET bill_status = CASE
  WHEN COALESCE(balance_due, total_amount - amount_paid, 0) <= 0.009 THEN 'PAID'
  WHEN COALESCE(amount_paid, 0) > 0.009 THEN 'PARTIAL'
  ELSE 'UNPAID'
END
WHERE bill_status IS NULL
   OR bill_status NOT IN ('PAID', 'UNPAID', 'PARTIAL');

CREATE INDEX IF NOT EXISTS idx_invoices_bill_status ON invoices(bill_status);
CREATE INDEX IF NOT EXISTS idx_invoices_negotiated_due_date ON invoices(negotiated_due_date)
  WHERE negotiated_due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_effective_due
  ON invoices (COALESCE(negotiated_due_date, due_date));

COMMENT ON COLUMN invoices.negotiated_due_date IS
  'Renegotiated deadline (e.g. salary schedule). Effective due = COALESCE(negotiated_due_date, due_date).';
COMMENT ON COLUMN invoices.bill_status IS
  'Formal collection status: PAID | UNPAID | PARTIAL (queryable; not a UI-only highlight).';
COMMENT ON COLUMN invoices.adjustment_amount IS
  'Discount/credit applied to this bill (positive reduces amount owed).';

-- =====================================================
-- 2. PER-PROPERTY AUTO LATE FEE TOGGLE
-- =====================================================
ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS auto_late_fee BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN buildings.auto_late_fee IS
  'When false, skip automatic late-fee penalties; use negotiated due-date workflow instead.';

UPDATE buildings
SET auto_late_fee = false
WHERE auto_late_fee = true
  AND (
    name ILIKE '%BALIBAGO%'
    OR name ILIKE '%VILLASOL%'
    OR name ILIKE '%APARTMENT-1%'
    OR name ILIKE '%APRTMENT-2%'
    OR name ILIKE '%APARTMENT-2%'
  );

-- =====================================================
-- 3. PAYMENT METHOD ENUM EXPANSION
-- =====================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname AS name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'payments'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%payment_method%'
  LOOP
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', r.name);
  END LOOP;
END $$;

ALTER TABLE payments
  ALTER COLUMN payment_method TYPE VARCHAR(50);

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS chk_payments_payment_method;

ALTER TABLE payments
  ADD CONSTRAINT chk_payments_payment_method
  CHECK (
    payment_method IS NULL
    OR payment_method IN (
      'cash', 'cheque', 'check', 'bank_transfer', 'gcash',
      'other', 'credit_card', 'online'
    )
  );

UPDATE payments SET payment_method = 'cheque' WHERE payment_method = 'check';

-- =====================================================
-- 4. EFFECTIVE-DUE HELPER VIEW
-- =====================================================
CREATE OR REPLACE VIEW invoice_effective_dues AS
SELECT
  i.id,
  i.tenant_id,
  i.invoice_number,
  i.due_date AS scheduled_due_date,
  i.negotiated_due_date,
  COALESCE(i.negotiated_due_date, i.due_date) AS effective_due_date,
  i.bill_status,
  i.balance_due,
  i.total_amount,
  i.amount_paid,
  i.adjustment_amount,
  i.invoice_status
FROM invoices i;

COMMENT ON VIEW invoice_effective_dues IS
  'Single source for scheduled vs negotiated due dates and bill_status.';
