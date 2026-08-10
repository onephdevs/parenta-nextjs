-- Alfonso / owner-admin ops defaults:
-- - Tenant portal off (staff use admin)
-- - Late fees off (renegotiate deadlines instead of penalties)
INSERT INTO app_settings (key, value, description)
VALUES
  (
    'tenant_portal_enabled',
    'false',
    'When false, tenant portal pages and tenant sign-in are disabled'
  ),
  (
    'late_fees_enabled',
    'false',
    'When false, late-fee apply is blocked; use invoice negotiate deadlines'
  )
ON CONFLICT (key) DO NOTHING;
