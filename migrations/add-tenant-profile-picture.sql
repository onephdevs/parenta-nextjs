-- Add profile_picture_url field to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_profile_picture ON tenants(profile_picture_url) WHERE profile_picture_url IS NOT NULL;

