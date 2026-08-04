-- Move-in payment gate for onboarding → Generate lease.
-- Deposit/advance must be marked paid on the opportunity before lease generation.

ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS move_in_payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS move_in_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS move_in_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS move_in_payment_notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pipeline_cards_move_in_payment_status_check'
  ) THEN
    ALTER TABLE pipeline_cards
      ADD CONSTRAINT pipeline_cards_move_in_payment_status_check
      CHECK (move_in_payment_status IN ('unpaid', 'paid'));
  END IF;
END $$;
