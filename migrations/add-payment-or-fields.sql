-- Official receipt fields for admin process-payment flow.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS or_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS or_date DATE;

COMMENT ON COLUMN payments.or_number IS 'Official receipt number recorded by admin when processing payment';
COMMENT ON COLUMN payments.or_date IS 'Official receipt date recorded by admin when processing payment';
