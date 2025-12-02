-- Building Deposit Configuration Table
-- Stores building-specific rules for deposits, advance payments, and utility deposits

CREATE TABLE IF NOT EXISTS building_deposit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL UNIQUE REFERENCES buildings(id) ON DELETE CASCADE,
  
  -- Deposit Configuration
  deposit_months DECIMAL(4,2) DEFAULT 1, -- Number of months for deposit (e.g., 1, 2)
  deposit_type VARCHAR(20) DEFAULT 'months' CHECK (deposit_type IN ('fixed', 'percentage', 'months')),
  deposit_amount DECIMAL(10,2), -- Fixed amount if type is 'fixed'
  deposit_percentage DECIMAL(5,2), -- Percentage if type is 'percentage' (e.g., 50 for 50%)
  
  -- Advance Payment Configuration
  advance_months DECIMAL(4,2) DEFAULT 1, -- Number of months for advance (e.g., 1)
  advance_type VARCHAR(20) DEFAULT 'months' CHECK (advance_type IN ('fixed', 'percentage', 'months')),
  advance_amount DECIMAL(10,2), -- Fixed amount if type is 'fixed'
  advance_percentage DECIMAL(5,2), -- Percentage if type is 'percentage'
  
  -- Utility Deposit
  utility_deposit_amount DECIMAL(10,2) DEFAULT 0, -- Fixed utility deposit amount
  
  -- Deposit Validity Rules
  deposit_validity_days INTEGER DEFAULT 5, -- Deposit valid for X days (default 5)
  deposit_refundable_after_days INTEGER DEFAULT 5, -- After X days, non-refundable (default 5)
  minimum_deposit_amount DECIMAL(10,2) DEFAULT 3000, -- Minimum deposit (e.g., 3000)
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_building_deposit_config_building_id ON building_deposit_config(building_id);
CREATE INDEX IF NOT EXISTS idx_building_deposit_config_is_active ON building_deposit_config(is_active);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_building_deposit_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_building_deposit_config_updated_at
  BEFORE UPDATE ON building_deposit_config
  FOR EACH ROW
  EXECUTE FUNCTION update_building_deposit_config_updated_at();

-- Comments for documentation
COMMENT ON TABLE building_deposit_config IS 'Building-specific deposit, advance, and utility deposit configuration rules';
COMMENT ON COLUMN building_deposit_config.deposit_months IS 'Number of months rent for deposit calculation (e.g., 2 months = 2 × monthly_rate)';
COMMENT ON COLUMN building_deposit_config.deposit_type IS 'How deposit is calculated: fixed amount, percentage of rent, or months of rent';
COMMENT ON COLUMN building_deposit_config.advance_months IS 'Number of months rent for advance payment calculation';
COMMENT ON COLUMN building_deposit_config.utility_deposit_amount IS 'Fixed utility deposit amount required for this building';
COMMENT ON COLUMN building_deposit_config.deposit_validity_days IS 'Number of days deposit remains valid (default 5 days)';
COMMENT ON COLUMN building_deposit_config.deposit_refundable_after_days IS 'After this many days, deposit becomes non-refundable';
COMMENT ON COLUMN building_deposit_config.minimum_deposit_amount IS 'Minimum deposit amount required (e.g., 3000)';

