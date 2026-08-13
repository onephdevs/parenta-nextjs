-- Drop unused / superseded tables after code audit (2026-08-14)
--
-- KEEP (still referenced):
--   deposit_ledger (singular) — live payment/deposit path
--   lease_package_templates, lease_templates, lease_template_sections
--   building_deposit_config, notification_templates
--   lease_expiration_alerts, lease_renewal_requests
--
-- DROP:
--   deposit_transactions + deposit_ledgers — empty Phase-1 scaffold; app never wrote rows;
--     needs-attention now uses deposit_ledger
--   report_templates — DDL only, zero app references

DROP TRIGGER IF EXISTS trg_deposit_transactions_sync_balance ON deposit_transactions;
DROP FUNCTION IF EXISTS sync_deposit_ledger_running_balance();

DROP TABLE IF EXISTS deposit_transactions CASCADE;
DROP TABLE IF EXISTS deposit_ledgers CASCADE;
DROP TABLE IF EXISTS report_templates CASCADE;
