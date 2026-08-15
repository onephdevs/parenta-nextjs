---
name: excel-ledger-sync
description: >-
  Sync and cross-check APARTMENT-1 BALIBAGO / APRTMENT-2 VILLASOL against the
  Jun 16–Jul 15 Excel ledger across tenants, portal logins, leases, invoices,
  payments, credits, deposit ledger, utilities, expenses, people/contacts,
  activity, notes, task-board cards, and the July collection waterfall / grand
  total. Use when the user mentions Excel ledger, apartment 1/2 sync, Balibago,
  Villasol, generate Aug/Sep invoices, paid not showing on
  /admin/financial/payments, seed apartment ledgers, pipeline/onboarding cards
  missing for Apt 1/2, July grand total, disbursement waterfall, payments
  waiting confirmation, or asks to record ledger data into other modules. Do
  not use for deleting tenants — use purge-tenant.
---

# Excel ledger sync

Source of truth is the Jun 16–Jul 15 2026 apartment spreadsheet, encoded in:

- `scripts/seed-apartment1-tenants.mjs` / `seed-apartment2-tenants.mjs` — profiles + portal users + leases
- `scripts/seed-apartment-ledgers.mjs` — cash, utilities, deposits/advances
- `scripts/generate-apartment-aug-sep-invoices.mjs` — this month + next month rent invoices
- `scripts/lib/allocate-excel-ledger-to-aug-invoices.mjs` — apply ledger cash onto August invoices
- `scripts/sync-lease-bills-expenses.mjs` — utilities, lease deposits, period expenses
- `scripts/sync-excel-ledger-modules.mjs` — contacts, activity, deposit ledger, notes, task-board cards

If Excel figures change, update those scripts first, then re-run sync and verify.

## Hard rules

- Do **not** generate a full lease year of invoices. Only **this month** (sent) + **next month** (draft).
- The payments hub is **invoice-based**. Rows in `payments` with `payment_status=paid` do **not** appear under Paid until they are allocated to an invoice (`payment_allocations` + `invoices.amount_paid` / `invoice_status`).
- Allocate **rent** and **1-month advance** only. Never apply security deposits or the Store hardware cheque (₱25,000) to rent invoices.
- Idempotent: skip existing tagged payments/invoices; allocate only remaining unallocated cash.
- Synced ledger cash is **already paid**. Do **not** require a GCash / bank reference (the field is optional until we tighten later). Do **not** leave tagged Jun 16–Jul 15 payments in `pending` or payment-board `pending_verification`.
- September invoices are **drafts**. Payment-board focus and Rent Payment follow-ups must use August (sent/partial/overdue), never the next-month draft. After a full paid sync the board is **32 Paid + Unit 7 open + Unit 27 overdue**, not 33 Upcoming.
- July **Total Collection** is tenant cash only (rent + advance + deposit + paid occupied utilities). Vacant / Admin meter bills are expenses, not collection. Cheques are added on the waterfall after Ima cash allowance.
- Never invent photos, maintenance tickets, reservations, extra occupants, late fees, or lease PDFs the spreadsheet does not contain.
- Never purge Apt 1/2 tenants from this skill. Tenant wipes belong in **purge-tenant**.

## Tags

| Data | Tag |
|---|---|
| Ledger payments / utility bills | `[ledger:2026-06-16:2026-07-15]` |
| Aug/Sep rent invoices | `[excel-ledger-rent:2026-08+09]` |
| Period expenses | `[ledger-exp:2026-06-16:2026-07-15]` |
| Module backfill | `[excel-ledger-modules]` |

Buildings: `APARTMENT-1 BALIBAGO` (`%apartment-1%`), `APRTMENT-2 VILLASOL` (`%aprtment-2%` or `%villasol%`).

## Modules the ledger must record

Occupied Excel units must show up in the same places a UI create-tenant + assign would:

| Module | Recorded by | Required |
|---|---|---|
| Tenants — profiles | `seed-apartment*-tenants` | yes |
| Users — portal logins | same (`Apartment1UnitN` / `Apartment2UnitN`, password `tenant123`) | yes |
| Leases — room assignments | same | yes |
| Invoices + line items | `generate-apartment-aug-sep-invoices` | yes (this + next month only) |
| Payments — rent / advance / deposit | `seed-apartment-ledgers` + allocator | yes |
| Credits / deposit ledger | `sync-excel-ledger-modules` (from deposit payments) | yes when deposit cash exists |
| Activity log | `sync-excel-ledger-modules` | yes |
| Contacts / people (`TENANT` role) | `sync-excel-ledger-modules` | yes |
| Notes | `sync-excel-ledger-modules` when tenant.notes is set | if present |
| Onboarding task cards (won / lease signed) | `sync-excel-ledger-modules` | yes |
| Payments task cards | `sync-excel-ledger-modules` (paid vs open from August invoice) | yes |
| Expenses + utilities | `sync-lease-bills-expenses` | yes |
| Expenses task cards | `sync-excel-ledger-modules` for tagged period expenses | yes |
| Documents / lease PDFs / signatures | — | no (Excel has none) |
| Photos | — | no |
| Occupants (extra people) | — | no |
| Reservations | — | no |
| Maintenance | — | no |
| Notifications / reminders | — | no |
| Late fees / renewals / move-out inspections | — | no unless Excel states a move-out |
| Assets | — | no |

After sync, `/admin/tasks` onboarding should list occupied Apt 1/2 as **Lease signed**, payments board should show August rent follow-ups, and `/admin/people` should list the tenant contacts.

## Sync workflow

Run from repo root. Use `DIRECT_URL` or `DATABASE_URL` from `.env.local`.

1. Tenants (only if rooms have no occupants):

```bash
npm run seed:apartment1-tenants
npm run seed:apartment2-tenants
```

2. Cash + utilities for the Excel period:

```bash
npm run seed:apartment-ledgers
```

3. This month + next month rent invoices, then allocate ledger cash onto August:

```bash
node scripts/generate-apartment-aug-sep-invoices.mjs
```

(`seed-apartment-ledgers` and `sync-lease-bills-expenses` also call the same allocator if August invoices already exist.)

4. Align utilities / deposits / expenses if those drifted:

```bash
node scripts/sync-lease-bills-expenses.mjs
```

5. Record the other modules (contacts, activity, deposit ledger, notes, task boards):

```bash
node scripts/sync-excel-ledger-modules.mjs
```

6. **Always verify** after sync, invoice gen, allocation, module backfill, or any “is the grand total the same?” question:

```bash
npm run verify:excel-ledger
```

`scripts/verify-excel-ledger-sync.mjs` is the source of truth for pass/fail. It checks occupancy, July waterfall / grand total, Aug/Sep invoices, hub Paid, payment-board stages, unpaid utilities, module coverage, and leftover Dev Test. Fix failures before reporting “in sync”. Exit 0 = pass.

## Expected targets (current Excel)

Monthly rent roll: Apt 1 **₱123,500** (26 occupied) + Apt 2 **₱50,000** (8 occupied) = **₱173,500**.

August invoices: **34**. After allocation:

| Status | Count | Units |
|---|---|---|
| Paid | 32 | All occupied except the two below |
| Partial | 1 | Apt 1 Unit 7 — ₱3,000 of ₱4,800 |
| Unpaid | 1 | Apt 1 Unit 27 — deposit used, no rent/advance cash |

September: **34 drafts**, amount-matched, unpaid.

New-tenant **advance** covers August rent: Apt 1 Units 3 & 19 (₱4,800), Apt 2 Unit 10 (₱8,000).

Unpaid utilities (expenses board): Apt 1 U26 electric ₱2,590, U27 water ₱194, Apt 2 U10 electric ₱144 + water ₱152.

Hub `/admin/financial/payments?dueDate=upcoming_month&status=paid` should list the **32 paid** August invoices (Apt 1 + Apt 2 only). Quick Link **Rent Payment** is tenants with open `sent|partial|overdue` balance — **2** after a full paid sync (Unit 7 + Unit 27), not 34.

Payments board (`/admin/tasks`, Rent Payment): **32 Paid**, Unit 7 open (partial ₱1,800), Unit 27 Overdue. Zero `pending_verification`.

Vacant Excel units must not get rent invoices: Apt 1 Units 5, 8, 9, 28, 30, Admin; Apt 2 Units 3, 8.

## July waterfall (Jun 16–Jul 15) — must match Excel grand total

Admin Home / disbursement: Collection − expenses − Ima cash allowance + hardware cheque = Grand Total. Period for month key `2026-07` is **2026-06-16 … 2026-07-15**.

| Line | Amount | Notes |
|---|---|---|
| Rent cash | ₱149,300 | Occupied rent received; excludes ₱25,000 cheque |
| Advance | ₱17,600 | Apt 1 U3 & U19 ₱4,800; Apt 2 U10 ₱8,000 |
| Deposit | ₱32,200 | Security + utility deposits |
| Paid utilities | ₱50,823 | Occupied units only; unpaid Excel utilities stay unpaid |
| **Total collection** | **₱249,923** | Tenant cash; not vacant/Admin meters |
| Less expenses | ₱110,353 | Sheet total; Ima is **not** in this line |
| Ima cash allowance | ₱20,000 | Waterfall only, category `cash_allowance` |
| Hardware cheque | +₱25,000 | Store; `payment_method` cheque; not allocated to rent |
| **Grand total** | **₱144,570** | Must match app + Excel |

If collection is ~₱6,660 high, vacant meter amounts were counted as tenant cash. If the payments board shows ~33 Upcoming, September drafts were used as the focus invoice — re-run `sync-excel-ledger-modules.mjs` after `getFocusInvoiceForTenant` ignores `draft`.

## Report format

Lead with pass/fail from `npm run verify:excel-ledger`. Then:

- Occupied vs Excel
- **July waterfall vs table above** (collection, expenses, Ima, cheque, grand total)
- Aug/Sep invoice counts and roll
- Paid / partial / unpaid (name the exceptions)
- Hub paid count and buildings (must not include Dev Test)
- Payments board: 32 Paid, Unit 7 + Unit 27 open, no pending verification
- Pending payment claims for Apt 1/2: **0** (synced cash needs no reference code)
- Unpaid utilities
- Module coverage: portal users, contacts, activity, deposit ledger, onboarding cards, payments cards, expense cards
- Any leftover test property data

## Why Paid was missing

Apt 1/2 were seeded with `payments` and later got invoices, but cash was not allocated. Dev Test looked “paid” because assign/pipeline called `ensureRentInvoicesForLease` and recorded allocations. Ledger sync must always allocate after invoices exist.

## Why Upcoming looked unconfirmed

Payment-board stage follows the tenant’s **focus invoice**. If that query picks the latest row including September **drafts**, paid August tenants look like they are waiting for confirmation. Focus must skip `draft` / `cancelled`. Synced ledger rows have no GCash reference — confirm without requiring one.
