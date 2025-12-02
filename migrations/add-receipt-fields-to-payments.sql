-- Add receipt storage capability to payments table
-- This migration adds fields to store uploaded receipt files

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS receipt_file_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS receipt_file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS receipt_file_size INTEGER;

-- Add index for faster queries on receipt uploads
CREATE INDEX IF NOT EXISTS idx_payments_receipt_uploaded_at 
ON payments(receipt_uploaded_at) 
WHERE receipt_uploaded_at IS NOT NULL;

-- Add comment to document the fields
COMMENT ON COLUMN payments.receipt_file_path IS 'Path to uploaded receipt file (relative to uploads directory)';
COMMENT ON COLUMN payments.receipt_uploaded_at IS 'Timestamp when receipt was uploaded by tenant';
COMMENT ON COLUMN payments.receipt_file_name IS 'Original filename of uploaded receipt';
COMMENT ON COLUMN payments.receipt_file_size IS 'Size of receipt file in bytes';
