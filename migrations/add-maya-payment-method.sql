-- Allow Maya as a payment method (tenant e-wallets)
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS chk_payments_payment_method;

ALTER TABLE payments
  ADD CONSTRAINT chk_payments_payment_method
  CHECK (
    payment_method IS NULL
    OR payment_method IN (
      'cash', 'cheque', 'check', 'bank_transfer', 'gcash', 'maya',
      'other', 'credit_card', 'online'
    )
  );
