---
name: purge-tenant
description: >-
  Hard-delete a tenant and related rows across leases, invoices, payments,
  documents, pipeline, maintenance, and other modules. Use when the user asks
  to delete a tenant, purge a tenant, wipe tenant data from all modules,
  remove occupancy-history-blocked tenants, or delete leftover seed/test
  tenants (for example tenant@parenta.com). Not for Excel ledger Apt 1/2
  sync — use excel-ledger-sync for that.
---

# Purge tenant

`DELETE /api/tenants/:id` **refuses** when `tenant_room_assignments` exist (`HISTORY_PROTECTED`). Duplicate Create Tenant retries also leave extra invoices and payments. For a named tenant the user asked to wipe, do **not** use the API delete.

## Workflow

1. Inventory (dry run):

```bash
node scripts/purge-tenants.mjs <tenantId-or-admin-url> [...]
```

2. Show the inventory, then delete:

```bash
node scripts/purge-tenants.mjs <tenantId-or-admin-url> [...] --confirm
```

Apt 1/2 protection is on by default. Only add `--allow-apartment-ledger` if the user named those tenants. Remaining occupants of the same room must stay. Do **not** delete rooms or buildings.

Whole **Dev Test** property (only if asked):

```bash
node scripts/purge-dev-test-property.mjs
```

After a Dev Test building wipe, run `npm run verify:excel-ledger`. Inactive **Sunrise Residences** is unrelated leftover — delete only if the user asks.

## Modules

| Module | Tables |
|---|---|
| Tenants / portal | `tenants`, `users` (role=tenant, unlinked) |
| Leases | `tenant_room_assignments` |
| Invoices | `invoices`, `invoice_line_items` |
| Payments | `payments`, `payment_allocations` |
| Credits / deposits | `tenant_credits`, `deposit_ledger` |
| Documents / leases | `documents`, `lease_agreement_snapshots`, `lease_signature_events` |
| Photos / notes | `images` (entity_type=tenant), `entity_notes` |
| Onboarding / tasks | `pipeline_cards`, `pipeline_card_events` |
| Maintenance | `maintenance_requests`, updates, attachments, reactions |
| Occupants / reservations | `occupants`, `reservations` |
| Notifications | `notifications`, queue, history, `communications`, `scheduled_reminders` |
| Late fees / renewals | `late_fee_applications`, `lease_expiration_alerts`, `lease_renewal_requests` |
| Move-out | `moveout_processing`, `moveout_inspection_items` |
| Assets | `asset_assignments`, `asset_billing` |
| Expenses / utilities | `expenses`, `tenant_utility_bills` |
| Contacts / activity | `contacts`, `activity_log` |
