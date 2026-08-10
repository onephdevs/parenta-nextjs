-- Phase 7a — Caretaker role for limited admin access
-- Caretakers can enter payments; cash-flow / expense reports stay owner/admin-only.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'tenant', 'staff', 'caretaker'));

COMMENT ON CONSTRAINT users_role_check ON users IS
  'admin = full access; caretaker = enter payments only; staff = legacy ops; tenant = portal';
