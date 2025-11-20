-- Migration: Add Auto-Invoicing Tables
-- Date: 2025-11-20
-- Description: Add tables for tenant credits, deposit ledger, and payment allocations

-- =====================================================
-- TENANT CREDITS TABLE
-- Track advance payments and credit balances for tenants
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('excess_payment', 'refund', 'adjustment', 'manual')),
  description TEXT,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL, -- Reference to payment that created this credit
  applied_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL, -- If credit was applied to an invoice
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'applied', 'refunded')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster tenant credit lookups
CREATE INDEX IF NOT EXISTS idx_tenant_credits_tenant_id ON tenant_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_credits_status ON tenant_credits(status);

-- =====================================================
-- DEPOSIT LEDGER TABLE
-- Track deposit transactions separately from regular payments
-- =====================================================
CREATE TABLE IF NOT EXISTS deposit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'refund', 'applied', 'adjustment')),
  applied_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL, -- If deposit was applied to pay an invoice
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL, -- Link to payment record if applicable
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who performed the transaction
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster deposit lookups
CREATE INDEX IF NOT EXISTS idx_deposit_ledger_tenant_id ON deposit_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deposit_ledger_transaction_type ON deposit_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_deposit_ledger_transaction_date ON deposit_ledger(transaction_date);

-- =====================================================
-- PAYMENT ALLOCATIONS TABLE
-- Track how payments are distributed across invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(10,2) NOT NULL,
  allocation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for faster allocation lookups
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- =====================================================
-- ADD COMPUTED COLUMNS TO INVOICES
-- Add balance_due as a computed column if it doesn't exist
-- =====================================================
DO $$
BEGIN
  -- Check if balance_due column exists and is not already a generated column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND column_name = 'balance_due'
    AND is_generated = 'NEVER'
  ) THEN
    -- Drop the existing column and recreate as generated
    ALTER TABLE invoices DROP COLUMN IF EXISTS balance_due;
    ALTER TABLE invoices ADD COLUMN balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND column_name = 'balance_due'
  ) THEN
    -- Add the column as generated
    ALTER TABLE invoices ADD COLUMN balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED;
  END IF;
END $$;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get tenant's current credit balance
CREATE OR REPLACE FUNCTION get_tenant_credit_balance(p_tenant_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_balance DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN status = 'available' THEN amount
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM tenant_credits
  WHERE tenant_id = p_tenant_id;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant's current deposit balance
CREATE OR REPLACE FUNCTION get_tenant_deposit_balance(p_tenant_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_balance DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type = 'deposit' THEN amount
      WHEN transaction_type IN ('refund', 'applied') THEN -amount
      WHEN transaction_type = 'adjustment' THEN amount
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM deposit_ledger
  WHERE tenant_id = p_tenant_id;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to get total allocated amount for an invoice
CREATE OR REPLACE FUNCTION get_invoice_allocated_amount(p_invoice_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_allocated DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(allocated_amount), 0)
  INTO v_allocated
  FROM payment_allocations
  WHERE invoice_id = p_invoice_id;
  
  RETURN v_allocated;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update invoice amount_paid when payment allocations are added
CREATE OR REPLACE FUNCTION update_invoice_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the invoice's amount_paid based on all allocations
  UPDATE invoices
  SET amount_paid = (
    SELECT COALESCE(SUM(allocated_amount), 0)
    FROM payment_allocations
    WHERE invoice_id = NEW.invoice_id
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.invoice_id;
  
  -- Update invoice status based on payment
  UPDATE invoices
  SET invoice_status = CASE
    WHEN amount_paid >= total_amount THEN 'paid'
    WHEN amount_paid > 0 THEN 'partial'
    ELSE invoice_status
  END
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invoice_amount_paid
AFTER INSERT ON payment_allocations
FOR EACH ROW
EXECUTE FUNCTION update_invoice_amount_paid();

-- Trigger to update tenant_credits updated_at timestamp
CREATE OR REPLACE FUNCTION update_tenant_credits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenant_credits_updated_at
BEFORE UPDATE ON tenant_credits
FOR EACH ROW
EXECUTE FUNCTION update_tenant_credits_timestamp();

-- Trigger to update deposit_ledger updated_at timestamp
CREATE OR REPLACE FUNCTION update_deposit_ledger_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deposit_ledger_updated_at
BEFORE UPDATE ON deposit_ledger
FOR EACH ROW
EXECUTE FUNCTION update_deposit_ledger_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE tenant_credits IS 'Stores tenant credit balances from excess payments and other sources';
COMMENT ON TABLE deposit_ledger IS 'Tracks all deposit-related transactions for tenants';
COMMENT ON TABLE payment_allocations IS 'Maps payments to invoices, showing how each payment is distributed';

COMMENT ON FUNCTION get_tenant_credit_balance IS 'Returns the current available credit balance for a tenant';
COMMENT ON FUNCTION get_tenant_deposit_balance IS 'Returns the current deposit balance for a tenant';
COMMENT ON FUNCTION get_invoice_allocated_amount IS 'Returns the total amount allocated to an invoice from payments';

