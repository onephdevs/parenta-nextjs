#!/usr/bin/env bash
# Apply base schema + incremental migrations to DATABASE_URL from .env.local
# Usage: ./scripts/apply-schema-migrations.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

# Prefer session-mode DIRECT_URL for DDL; strip pgbouncer query param (psql rejects it)
MIGRATE_URL="${DIRECT_URL:-${DATABASE_URL:-}}"
MIGRATE_URL="${MIGRATE_URL//\?pgbouncer=true/}"
MIGRATE_URL="${MIGRATE_URL//\&pgbouncer=true/}"

if [[ -z "${MIGRATE_URL}" ]]; then
  echo "DIRECT_URL/DATABASE_URL is not set (load .env.local first)"
  exit 1
fi

echo "Using: ${MIGRATE_URL//:*@/:***@}"

run_file() {
  local file="$1"
  echo ""
  echo ">>> $(basename "$file")"
  if [[ "$(basename "$file")" == "add-performance-indexes.sql" ]]; then
    sed 's/CREATE INDEX CONCURRENTLY/CREATE INDEX IF NOT EXISTS/g; s/CREATE UNIQUE INDEX CONCURRENTLY/CREATE UNIQUE INDEX IF NOT EXISTS/g' "$file" \
      | psql "$MIGRATE_URL" -v ON_ERROR_STOP=0
  else
    psql "$MIGRATE_URL" -v ON_ERROR_STOP=0 -f "$file"
  fi
}

run_file "$ROOT/src/lib/schema.sql"

MIGRATIONS=(
  add-user-tenant-link.sql
  add-reservations-table.sql
  add-occupants-table.sql
  add-maintenance-requests-table.sql
  add-app-settings.sql
  add-building-deposit-config.sql
  add-room-deposit-config.sql
  add-advance-utility-deposit-to-assignments.sql
  add-advance-utility-to-reservations.sql
  add-downpayment-payment-type.sql
  add-advance-payment-type.sql
  add-receipt-fields-to-payments.sql
  add-room-id-to-expenses.sql
  add-room-support-to-utility-bills.sql
  add-tenant-agreement-field.sql
  add-tenant-profile-picture.sql
  add-late-fees-system.sql
  add-lease-management.sql
  fix-lease-functions.sql
  add-notifications-system.sql
  add-auto-invoicing-tables.sql
  add-dashboard-reports.sql
  add-performance-indexes.sql
  make-maintenance-tenant-nullable.sql
  tenancy-and-asset-location-history.sql
  activity-log-and-notification-prefs.sql
  add-background-jobs.sql
  add-address-locations.sql
  add-pipeline-tasks.sql
  add-pipeline-lost-reason.sql
  add-pipeline-onboarding-flow.sql
  add-pipeline-onboarding-stages-fix.sql
  add-pipeline-lease-dates.sql
)

for m in "${MIGRATIONS[@]}"; do
  run_file "$ROOT/migrations/$m"
done

echo ""
echo "Done. Key tables:"
psql "$DATABASE_URL" -c "SELECT count(*)::int AS public_tables FROM information_schema.tables WHERE table_schema='public';"
