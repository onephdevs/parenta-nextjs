---
name: lease-history-import
description: >-
  Import messy Start & End Date Excel occupancy drafts into tenants (Person)
  and tenant_room_assignments (Lease) for APARTMENT-1 BALIBAGO / APRTMENT-2
  VILLASOL. Dry-run first, then --commit to rename dummy Tenant Unit N
  occupants, attach former people, and show names on properties, rooms, and
  leases. Use when the user mentions lease history, occupancy history, Start
  & End Date spreadsheet, dummy Tenant Unit names, Balibago/Villasol unit
  blocks, deposit/advance/utility split from Excel, or importing previous
  and present tenants. Not for Jun 16–Jul 15 cash ledger sync — use
  excel-ledger-sync. Not for deleting tenants — use purge-tenant.
---

# Lease history import

There is no `Person` or `Lease` table. Mapping:

| Term | Table | Notes |
|---|---|---|
| Person | `tenants` | Permanent identity. `is_tenant` is derived from an active assignment. |
| Room | `rooms` | `room_number` like `Unit 1`. `room_status` is denormalized. |
| Lease | `tenant_room_assignments` | Time-bound stay. Active = `assignment_status = 'active'` and `end_date` null/future. |
| Building | `buildings` | Apt 1 = `APARTMENT-1 BALIBAGO`. Apt 2 = `APRTMENT-2 VILLASOL`. |

Dummy seed occupants are `first_name = 'Tenant'`, `last_name = 'Unit N'` with a portal login. Rename them in place so invoices and portal stay on the same `tenants.id`.

Jun 16–Jul 15 **cash occupancy** (who is billed now) stays with **excel-ledger-sync**. This skill only imports named stay history and replaces dummy names. Do not occupy a room the ledger has vacant (Apt 1 units 5, 8, 9, 28, 30, Admin).

## Scripts

- `scripts/lib/lease-history-parse.mjs` — grouping, notes vs names, deposit templates
- `scripts/import-apartment-lease-history.mjs` — dry-run / `--commit`
- Workbook: `data/imports/apartment1-balibago-lease-history.xlsx` (header row 2, data row 5)
- Apt 2 later: `data/imports/apartment2-villasol-lease-history.xlsx`

## Workflow

1. Place/copy the Excel file to the path above.
2. Dry-run (default — no writes):

```bash
node scripts/import-apartment-lease-history.mjs
# Apt 2:
# node scripts/import-apartment-lease-history.mjs --apartment=2 --file=data/imports/apartment2-villasol-lease-history.xlsx
```

3. Show the report to the user. Do **not** `--commit` until they review dummy replacements and flagged units.
4. Commit:

```bash
node scripts/import-apartment-lease-history.mjs --commit
```

5. Backfill `contacts` + `contact_roles` (`TENANT`) for Apt people who have stays but no contact row.
6. Verify the same joins the UI uses (properties / rooms / `/admin/leasing`). Refresh those pages.

Idempotent on `(room_id, start_date)`. Re-running dry-run after commit should show `already_imported` / skip flagged.

## Hard rules

- Dry-run is the default. Never `--commit` without the user confirming the report.
- Do not guess deposit splits. Apt 1 expected = `rent × 3 + utility` → store `deposit_paid = rent×2`, `advance_paid = rent×1`, `utility_deposit_paid = utility`. Mismatch → flag, skip write.
- Apt 2 template (when that file exists): ₱6,000 deposit + ₱6,000 advance + ₱3,000 utility.
- Dummy current occupant → **rename** that Person (and `users` / `contacts`). Do not create a second live Person or move invoices onto a former row.
- After dummy rename, if a former Person with the same name still exists, **merge** the former into the live portal Person (`scripts/merge-duplicate-people.mjs --name="…" --commit`) so People has one id. Keep the portal row; re-point stays; delete the absorb row.
- Fail loudly if a sheet unit has no matching `rooms.room_number`.
- Do not insert a second active assignment on a room (`uq_tra_one_active_per_room`).
- Do not put one Person on two active rooms (`uq_tra_one_active_per_tenant`).
- Sheet “Occupied / up to present” on a **vacant** ledger room → flag `sheet_active_room_vacant`, do not occupy.
- After commit, properties/rooms/leases must show Excel names, not `Tenant Unit N`, for resolved units.

## Parsing (do not reimplement — the script already does this)

See [parsing-rules.md](parsing-rules.md) if you must change the parser. Summary:

- Group by unit block; blank tenant name = renewal (forward-fill last real name).
- `"New Tenant"` in the **contact** cell starts a new tenant (no forward-fill).
- Sentence-like tenant cells (long, digits, `frm` / `up to` / `terminated` / …) are **notes** on the previous real tenant’s stay, not a new Person.
- `"VACANT"` in a date cell → skip that row.
- `"up to present"` or blank end on the last data row of a block → active (`end_date` null).
- Placeholders (`Old Tenant`) and unnamed stacks → flag, do not invent names.

## Apt 1 flags (current workbook)

Blocked on commit until the user names them or decides:

| Unit | Why |
|---|---|
| 2 | Tenant name is `Old Tenant`; sheet Vacant but app occupied by dummy |
| 5 | Unnamed vacant history; two rows ₱10,600 ≠ expected ₱15,400; `VACANT` date cell |
| 6 | One unnamed row, no move-out |
| 8 | Sheet Occupied / present; ledger vacant — do not occupy |
| 9 | Same name+phone as Unit 10; ledger vacant — do not occupy |

Warning (dummy rename still allowed): Units 9 and 10 both list **Ronnalyn Cuna Lopez** / `09494113840`. Unit 10 current dummy may be renamed; do not activate Unit 9.

Units 11–30 are not in this workbook; they stay `Tenant Unit N` until a later sheet.

## After commit — UI check

These reads must show Excel names for resolved occupied units:

- Properties: `getPropertyBuildingDetail` joins active `tenant_room_assignments` → `tenants.first_name/last_name`
- Rooms list: `getRoomsForRoomsPage` same join → `tenantName`
- Room history: `getRoomAssignmentHistory` uses `tenant_name_snapshot` then live name
- `/admin/leasing`: `getLeases` uses assignment + tenant name / snapshot

## Related

- Cash / invoices / payments for the Jun–Jul ledger: **excel-ledger-sync**
- Wipe a tenant: **purge-tenant**
