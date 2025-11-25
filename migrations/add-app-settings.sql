-- Create app_settings table for global application settings
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default currency setting
INSERT INTO app_settings (key, value, description)
VALUES ('currency', 'PHP', 'Default currency for the application')
ON CONFLICT (key) DO NOTHING;

-- Insert other useful default settings
INSERT INTO app_settings (key, value, description)
VALUES 
  ('date_format', 'MM/DD/YYYY', 'Default date format'),
  ('timezone', 'Asia/Manila', 'Default timezone'),
  ('language', 'en', 'Default language')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

