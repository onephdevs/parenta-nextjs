---
name: excel-ledger-sync
description: >-
  Sync and cross-check APARTMENT-1 BALIBAGO / APRTMENT-2 VILLASOL against the
  Jun 16–Jul 15 Excel ledger: tenants, rent invoices, paid allocations,
  utilities, and the payments hub. Use when the user mentions Excel ledger,
  apartment 1/2 sync, Balibago, Villasol, generate Aug/Sep invoices, paid
  not showing on /admin/financial/payments, seed apartment ledgers, or asks
  to cross-reference ledger vs the app after invoice or Dev Test changes.
---

# Excel ledger sync

Source of truth is the Jun 16–Jul 15 2026 apartment spreadsheet, encoded in:

- `scripts/seed-apartment-ledgers.mjs` — cash, utilities, deposits/advances
- `scripts/generate-apartment-aug-sep-invoices.mjs` — this month + next month rent invoices
- `scripts/lib/allocate-excel-ledger-to-aug-invoices.mjs` — apply ledger cash onto August invoices
- `scripts/sync-lease-bills-expenses.mjs` — utilities, lease deposits, period expenses

If Excel figures change, update those scripts first, then re-run sync and verify.

## Hard rules

- Do **not** generate a full lease year of invoices. Only **this month** (sent) + **next month** (draft).
- The payments hub is **invoice-based**. Rows in `payments` with `payment_status=paid` do **not** appear under Paid until they are allocated to an invoice (`payment_allocations` + `invoices.amount_paid` / `invoice_status`).
- Allocate **rent** and **1-month advance** only. Never apply security deposits or the Store hardware cheque (₱25,000) to rent invoices.
- Idempotent: skip existing tagged payments/invoices; allocate only remaining unallocated cash.
- Never touch Apt 1/2 when purging a test property.

## Tags

| Data | Tag |
|---|---|
| Ledger payments / utility bills | `[ledger:2026-06-16:2026-07-15]` |
| Aug/Sep rent invoices | `[excel-ledger-rent:2026-08+09]` |
| Period expenses | `[ledger-exp:2026-06-16:2026-07-15]` |

Buildings: `APARTMENT-1 BALIBAGO` (`%apartment-1%`), `APRTMENT-2 VILLASOL` (`%aprtment-2%` or `%villasol%`).

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

5. **Always verify** after sync, invoice gen, allocation, or deleting a test property:

```bash
npm run verify:excel-ledger
```

Fix failures before reporting “in sync”. Exit 0 = pass.

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

Vacant Excel units must not get rent invoices: Apt 1 Units 5, 8, 9, 28, 30, Admin; Apt 2 Units 3, 8.

## Report format

Lead with pass/fail. Then:

- Occupied vs Excel
- Aug/Sep invoice counts and roll
- Paid / partial / unpaid (name the exceptions)
- Hub paid count and buildings (must not include Dev Test)
- Unpaid utilities
- Any leftover test property data

## Purge test property (only if asked)

```bash
node scripts/purge-dev-test-property.mjs
```

Hard-deletes **Dev Test** only (rooms, tenants, portal users, invoices, payments, txns, docs, pipeline). Re-run verify afterward. Inactive **Sunrise Residences** is unrelated leftover — delete only if the user asks.

## Why Paid was missing

Apt 1/2 were seeded with `payments` and later got invoices, but cash was not allocated. Dev Test looked “paid” because assign/pipeline called `ensureRentInvoicesForLease` and recorded allocations. Ledger sync must always allocate after invoices exist.
