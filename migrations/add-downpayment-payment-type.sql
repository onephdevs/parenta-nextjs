-- Migration: Add downpayment payment type
-- Date: 2024-12-19
-- Description: Adds 'downpayment' as a valid payment type to support downpayment payments

-- Drop existing constraint
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_payment_type_check;

-- Add new constraint with downpayment included
ALTER TABLE payments 
ADD CONSTRAINT payments_payment_type_check 
CHECK (payment_type IN ('rent', 'deposit', 'downpayment', 'late_fee', 'utility', 'asset_rental', 'other'));

-- Add comment for documentation
COMMENT ON COLUMN payments.payment_type IS 'Payment type: rent, deposit, downpayment, late_fee, utility, asset_rental, or other';
