-- Migration: Add advance payment type and replace downpayment
-- Description: Adds 'advance' as a valid payment type to support advance payments (prepaid rent)
--              and removes 'downpayment' from the payment type constraint

-- Drop existing constraint
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_payment_type_check;

-- Add new constraint with advance included (replacing downpayment)
ALTER TABLE payments
ADD CONSTRAINT payments_payment_type_check 
CHECK (payment_type IN ('rent', 'deposit', 'advance', 'late_fee', 'utility', 'asset_rental', 'other'));

-- Update column comment
COMMENT ON COLUMN payments.payment_type IS 'Payment type: rent, deposit, advance (prepaid rent), late_fee, utility, asset_rental, or other';
