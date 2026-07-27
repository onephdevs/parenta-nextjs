# Scalability & Architecture Audit — Modular Monolith

**Date:** 2026-07-28  
**Scope:** Phase 1 read-only audit (no code changes)  
**Stack:** Next.js 15 App Router · raw `pg` · Supabase PostgreSQL · single Hostinger/PM2 deploy  
**Constraint:** Remains one deployable app — no microservices evaluated or proposed here.

---

## Executive summary

The app already has a useful split between `src/lib/api/` (CRUD) and `src/lib/services/` (workflows), but the **financial core is tightly coupled** (payments ↔ invoices ↔ credits ↔ deposits rewritten from multiple places), and there is a **severe connection-pool bug**: **8 separate `pg.Pool` instances** in runtime code, each defaulting to `max: 10` (~80 connections possible before scripts). Heavy work (bulk invoicing, email queue processing, PDF/Excel export) runs **awaited in the HTTP request**. No Redis, no real job queue, no API response caching.

Highest-risk findings, in order:

1. Multiple independent DB pools (connection exhaustion under load)
2. Un-transacted / broken multi-step writes (payment+allocate, tenant+user, assign-then-invoice)
3. N+1 loops in invoice status recalc, late fees, monthly/bulk invoicing, notification processing
4. Request-path bulk email / invoice generation / report export
5. Uncached dashboard/analytics aggregations
6. Cross-domain write violations (maintainability; lower urgency than correctness/performance)

---

## 1. Module boundary audit

### 1.1 Domain map & where logic lives

| Domain | Service / API module | Logic location | Notes |
|--------|----------------------|----------------|-------|
| Buildings | `lib/api/buildings.ts`, `building-deposit-config.ts` | lib/api | Thin routes |
| Rooms | `lib/api/rooms.ts` | lib/api + **route orchestration** | `rooms/[id]/assign` has inline SQL |
| Tenants | `lib/api/tenants.ts`, `tenant-user-link.ts`, `tenant-credits.ts` | lib/api | Some inline in occupants/check-email |
| Payments | `lib/api/payments.ts` + `payment-allocator`, `receipt-generator` | Split | Allocation in service |
| Invoices | `lib/api/invoices.ts` + generators / late fees / recalculator / backfill | Strong services | CRUD in lib/api |
| Expenses | `lib/api/expenses.ts` | lib/api | Thin routes |
| Maintenance | **None** | **Inline in route** | `api/maintenance/route.ts` full CRUD |
| Reservations | `lib/api/reservations.ts` | lib/api | Heavy cross-domain inside module |
| Leases | `lease-management-service.ts` | Service | Thin routes |
| Meters / utilities | `meterReadings.ts`, `utilities.ts`, `costAllocation.ts`, `room-utility-bills.ts` | lib/api | — |
| Assets | `lib/api/assets.ts` | lib/api | Thin routes |
| Documents | `lib/api/documents.ts`, `images.ts` | lib/api | — |
| Notifications / activity | `notification-service`, `email-service`, `activity-*` | Services + some inline SQL in routes | — |
| Bulk | `bulk-operations-service.ts` | Service | Thin routes |
| Dashboard / reports | `dashboard-service`, `reports-service`, excel/pdf exporters | Services | — |

**Architecture note:** There are **two parallel layers** — `src/lib/api/` (~22 modules) and `src/lib/services/` (~18 modules). Most CRUD domains live in `lib/api`, not `lib/services`. Workflows often bypass CRUD modules and write tables directly.

**API surface:** ~159 `route.ts` files. Namespaces: `/api/tenant` (~22), `/api/admin` (4), `/api/track` (1), flat domain routes (~123). **No `/api/staff` namespace.**

### 1.2 Service inventory (`src/lib/services/`)

| File | Domain | Role |
|------|--------|------|
| `activity-logger.ts` / `activity-taxonomy.ts` / `activity-diff.ts` | Activity | In-app activity + notification fan-out |
| `bulk-operations-service.ts` | Bulk | Monthly invoices, CSV payment import, status update |
| `dashboard-service.ts` | Dashboard | Aggregations for metrics widgets |
| `email-service.ts` | Infra | Nodemailer / Gmail send + batch |
| `excel-export-service.ts` / `pdf-export-service.tsx` | Reports | File generation |
| `invoice-generator.ts` / `monthly-invoice-generator.ts` / `rent-invoice-backfill.ts` | Invoices | Generation workflows |
| `invoice-status-recalculator.ts` | Invoices | Status sync from allocations/credits/deposits |
| `late-fee-service.ts` | Late fees | Calculate / apply / waive |
| `lease-management-service.ts` | Leases | Alerts, renewals, move-outs |
| `notification-service.ts` | Notifications | Queue + reminders |
| `payment-allocator.ts` | Payments | Allocate to invoices, credits, deposits |
| `receipt-generator.tsx` | Payments | Receipt PDF |
| `reports-service.ts` | Reports | Report aggregations |

### 1.3 Boundary violations (cross-domain writes without owning module)

These are the maintainability violations that matter most: domain A mutates domain B’s tables without going through B’s API/service.

| File | Description |
|------|-------------|
| `src/lib/services/payment-allocator.ts` | SELECT `tenants`; INSERT `deposit_ledger` / `tenant_credits`; UPDATE `invoices` — bypasses `lib/api/deposit-ledger`, `tenant-credits`, `invoices` |
| `src/lib/services/invoice-generator.ts` | SELECT `tenants` / JOIN rooms+buildings; INSERT `tenant_credits` and `deposit_ledger` |
| `src/lib/services/lease-management-service.ts` | On move-out: UPDATE `tenants`, `tenant_room_assignments`; INSERT `deposit_ledger` / `tenant_credits` |
| `src/lib/services/bulk-operations-service.ts` | Queries tenants/rooms; INSERT `invoices` inline (duplicates generator); INSERT `payments` + `deposit_ledger`; UPDATE `tenants` |
| `src/lib/api/rooms.ts` | Assign/unassign: SELECT/UPDATE `tenants`; also queries `payments` / `assets` for room financial/assets helpers |
| `src/lib/api/tenants.ts` | INSERT assignments + UPDATE `rooms` |
| `src/lib/api/reservations.ts` | INSERT `payments`; UPDATE `rooms` / `payments`; INSERT assignments; UPDATE `tenants` |
| `src/lib/api/deposit-ledger.ts` | SELECT/UPDATE `invoices` (duplicates allocator’s `applyDepositToInvoice`) |
| `src/app/api/rooms/[id]/assign/route.ts` | Route-level orchestration of rooms/tenants/assignments + invoice generation (bypasses `assignTenantToRoom` in places) |
| `src/app/api/maintenance/route.ts` | Full CRUD SQL in route; JOINs tenants/rooms/buildings — no lib/api or service |

**Duplicate helpers (boundary smell):**

- `getTenantDepositBalance` / `applyDepositToInvoice` in both `payment-allocator.ts` and `deposit-ledger.ts`
- `getTenantCreditBalance` in both `payment-allocator.ts` and `tenant-credits.ts`

**Soft (acceptable for reporting/enrichment):** dashboard, reports, analytics, notification reminders JOINing many tables for read DTOs.

### 1.4 Circular imports

**None found** among `src/lib/services` or `src/lib/api`. Import DAG is acyclic (e.g. bulk → invoice-generator; payment-allocator → invoice-generator; notification → email).

### 1.5 UI folder consistency

- `src/components/domain/` — only shared badges (`StatusBadges`, `AmenityBadges`), not a real domain module layer
- `src/components/features/` — hybrid flat + nested (`tenant/`, `dashboard/`, `reservations/`, etc.)
- Backend domain folders under `lib/api` / `app/api` are clearer than the UI tree

---

## 2. Database layer audit

### 2.1 Connection pool — **BUG FOUND (critical)**

**Primary pool** — `src/lib/db.ts`:

```ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
```

| Setting | Current | Assessment |
|---------|---------|------------|
| `max` | unset → pg default **10** | Underspecified for shared hosting + Supabase limits |
| `min` | unset | OK |
| `idleTimeoutMillis` | unset → **10000** | Default OK |
| `connectionTimeoutMillis` | unset → **0** (wait forever) | **Bad** — hung requests under pool exhaustion |
| Singleton | Module-level only | Not per-request, but **no `globalThis` HMR guard** |
| Extra pools | **Yes — 7 more** | **Severe** |

**Not a per-request `new Pool()` in route handlers** — good. The bug is **multiple module-level pools**:

| File | Own `new Pool()` |
|------|------------------|
| `src/lib/db.ts` | ✓ (canonical) |
| `src/lib/api/financial-reports.ts` | ✓ |
| `src/lib/api/tenant-credits.ts` | ✓ |
| `src/lib/api/deposit-ledger.ts` | ✓ |
| `src/lib/services/payment-allocator.ts` | ✓ |
| `src/lib/services/invoice-generator.ts` | ✓ |
| `src/lib/services/invoice-status-recalculator.ts` | ✓ |
| `src/lib/services/monthly-invoice-generator.ts` | ✓ |
| `src/lib/services/rent-invoice-backfill.ts` | ✓ |

**Impact:** Up to **~80 concurrent connections** from app code alone (8 × default max 10). Dangerous against Supabase pooler limits on Hostinger single-instance deploy. Also means payment create (uses `@/lib/db`) and allocate (uses its own pool) **cannot share a transaction client**.

Services that correctly reuse `@/lib/db`: late-fee, lease-management, bulk-operations, notification-service, most routes.

### 2.2 Schema & indexes

**Sources:** `src/lib/schema.sql` (canonical), `migrations/*.sql`, `prisma/schema.prisma` (datasource only — **no models**; app uses raw SQL).

**Existing coverage:** Core FKs/status/dates for tenants, rooms, buildings, assignments, payments, invoices, documents, assets, notifications are indexed in `schema.sql`. `migrations/add-performance-indexes.sql` adds more composites/partials — but wraps `CREATE INDEX CONCURRENTLY` inside `BEGIN`…`COMMIT`, which **Postgres rejects** (`CONCURRENTLY` cannot run in a transaction). That migration may have failed partially or needed manual out-of-transaction runs.

#### Missing indexes (tied to actual query patterns)

| Table | Column(s) | Why it matters |
|-------|-----------|----------------|
| `tenant_credits` | `applied_to_invoice_id` | Filtered on every invoice status recalc (`invoice-status-recalculator.ts` ~71) |
| `deposit_ledger` | `applied_to_invoice_id` | Same (~79) |
| `maintenance_requests` | `room_id` | JOIN/filter; only tenant/building/status/date indexed today |
| `tenant_utility_bills` | `tenant_id`, `building_id`, `utility_bill_id`, `bill_status` | Table has **no indexes** in `schema.sql` |
| `cost_allocation_history` | `building_id`, `utility_bill_id` | No indexes |
| `invoices` / `payments` / `tenants` / `notifications` | `created_at` (DESC sorts) | Heavy `ORDER BY created_at DESC` in lists/dashboard (partial coverage via other date cols) |
| `maintenance_requests` | `priority` (optional) | Used in ORDER BY CASE + filters |

Core tenant/room/invoice/payment FK indexes look solid if the performance migration applied (verify in production with `\di`).

### 2.3 N+1 query instances

| File | Line(s) | Pattern |
|------|---------|---------|
| `src/lib/services/invoice-status-recalculator.ts` | 156–167 | `for (row of invoices)` → `recalculateInvoiceStatus` (BEGIN + 4+ queries each) |
| `src/lib/services/invoice-status-recalculator.ts` | 204–214 | `for (tenantId)` → above → **N×M** |
| `src/lib/services/monthly-invoice-generator.ts` | 232–247 | `for (tenantId)` → `generateNextMonthRentInvoice` |
| `src/lib/services/rent-invoice-backfill.ts` | 177–230 | `for (tenant)` → generate + allocate + recalc chain |
| `src/lib/services/bulk-operations-service.ts` | 92–162 | `for (tenant)` → existence check + number + INSERT (no outer TX) |
| `src/lib/services/bulk-operations-service.ts` | 198–288 | `for (csv row)` → tenant/room lookups + inserts (inside TX, still N+1 queries) |
| `src/lib/services/late-fee-service.ts` | 56–79, 234–277 | `for (invoice)` → calculate/apply + settings lookup |
| `src/lib/services/invoice-generator.ts` | ~109–200 | `for (month)` → INSERT invoice (+ line items) per month |
| `src/lib/services/payment-allocator.ts` | 128–179, 329–346 | Loop unpaid invoices / credits (inside TX — better, still chatty) |
| `src/lib/api/costAllocation.ts` | 346–394 | `for (allocation)` → SELECT room + INSERT bill (in TX) |
| `src/lib/services/notification-service.ts` | 152–219+ | `for (notification)` → send email + UPDATE/INSERT per item |
| `src/lib/services/activity-logger.ts` | 138–167+ | `for (userId)` → preference lookup + INSERT |
| `src/app/api/documents/bulk-download/route.ts` | 30–38 | `Promise.all(ids.map → getDocumentById)` — parallel N+1 |
| `src/lib/api/invoices.ts` | ~241+ | Line-item inserts in loop (inside TX — acceptable) |
| `src/lib/seed-data.ts` | 110–186 | Seed loops (dev-only) |

**Client-amplified variants (not server N+1, but pool pressure):** `BulkRoomActions.tsx`, `BulkDocumentOperations.tsx`, `AssetQRCodeManager.tsx` fire many parallel/sequential API calls.

### 2.4 Un-transacted multi-step operations

| Location | What | Risk |
|----------|------|------|
| `src/app/api/payments/route.ts` ~150–164 | `createPayment` then `allocatePaymentToInvoices` on **different pools** | Payment saved, allocation fails → unpaid invoices stay unpaid; error is swallowed |
| `src/app/api/tenant/payments/manual/route.ts` ~60–104 | Deposit ledger then separate payment INSERT | Ledger without payment (or reverse) |
| `src/app/api/rooms/[id]/assign/route.ts` ~233–249 | COMMIT assignment, **then** `generateInvoicesForTenant` outside TX | Occupied room / active tenant with no invoices |
| `src/app/api/reservations/[id]/convert/route.ts` ~42–66 | Convert TX then invoice gen outside | Same |
| `src/lib/api/tenant-user-link.ts` ~46–114 | `BEGIN` on `client`, but `createUser()` uses **`pool.query`**, not `client` | User persists even if tenant INSERT fails / ROLLBACK |
| `src/app/api/auth/forgot-password/route.ts` ~58–68 | Invalidate tokens + INSERT new token, no TX | Race / orphaned tokens |
| `src/app/api/profile/route.ts` ~89–113 | UPDATE users + separate profile extras | Partial profile update |
| `src/lib/services/bulk-operations-service.ts` `generateBulkInvoices` ~92–162 | Sequential inserts, **no BEGIN** | Partial bulk month invoices |
| `src/lib/services/rent-invoice-backfill.ts` / monthly generator | Per-tenant multi-service chain, no outer TX | Partial monthly/backfill runs |

**Well-transacted examples (good patterns to reuse):** `payment-allocator` internals, `reservations` convert core, `rooms` assign helpers, `invoices` create/delete, `deposit-ledger`, `costAllocation.generateTenantUtilityBills`, lease move-out core.

---

## 3. Heavy / slow operation audit

All of the following are **awaited in the HTTP request** unless noted. No Bull/BullMQ/pg-boss/Redis. Closest thing: Postgres `notification_queue` + manual `/api/notifications/queue/process` (still inline).

| Operation | Path | Timeout risk |
|-----------|------|--------------|
| Bulk monthly invoices | `api/bulk/invoices/generate` → `bulk-operations-service` | **High** — O(tenants) queries |
| Monthly rent generation | `api/invoices/generate-monthly` → `monthly-invoice-generator` | **High** |
| Lease invoice generation | `invoice-generator` via assign/convert routes | **High** for 12–24 month leases |
| Rent backfill | `rent-invoice-backfill.ts` | **Very high** |
| Notification queue process | `api/notifications/queue/process` → up to 50 `await sendEmail` | **High** |
| Batch emails | `email-service.sendBatchEmails` (100ms delay each) | **High** |
| Forgot-password email | `api/auth/forgot-password` awaits SMTP | Medium |
| CSV payment import | `api/bulk/payments/import` | High for large CSVs |
| Late fee apply-all | `api/late-fees/apply` | Medium–high |
| Cost allocation bill gen | `api/cost-allocation/generate-bills` | Medium |
| PDF export | `api/reports/export/pdf` + `@react-pdf/renderer` | Medium–high |
| Excel export | `api/reports/export/excel`, `reports/financial/export` | **High** (multi-query + exceljs) |
| Receipt PDF | `tenant/payments/[id]/print` | Medium |
| ZIP bulk download | `documents/bulk-download` (max compression) | Medium–high |
| Mock export queue | `api/export` | Stub `setTimeout` — not production |

**External APIs (Twilio / ElevenLabs / OpenAI):** none found in `src/` or `package.json`.

**Infra:** Single Hostinger instance + PM2 (`parenta-app`). Redis **not** in package.json, docker-compose, or env docs (only mentioned in an unimplemented task doc).

---

## 4. Caching candidate audit

**Existing cache:** ISR `revalidate` on some admin pages; `Cache-Control` on image/document static serve. **No** `unstable_cache`, Redis, or in-memory API cache. `src/lib/cache` does not exist.

| Rank | Endpoint | Shape | Data change rate | Score (freq × cost) |
|------|----------|-------|------------------|---------------------|
| 1 | `/api/dashboard/metrics` → `getAllDashboardMetrics()` | 8 parallel aggregations | Every payment/invoice/assignment | **Highest** |
| 2 | `/api/dashboard/stats` | buildings/rooms/tenants/financial summary | Same | High |
| 3 | `/api/analytics` | Multiple GROUP BY series | Daily–hourly | High |
| 4 | `/api/reports/*` + `reports-service` | Large nested JSON | On-demand, heavy | Medium–high |
| 5 | Financial export / P&L | Multi-aggregation → Excel | Period-based | Medium–high |
| 6 | `/api/{utilities,assets,rooms,tenants,documents}/stats` | Stat cards | Slow-changing | Medium |
| 7 | Dashboard subroutes (revenue, occupancy, recent payments…) | Narrow slices of #1 | Same | Medium (dedupe with #1) |

**Note:** Parts of `/api/financial-analytics` and some analytics cases still return mock/stub data — not worth caching until real.

---

## 5. Notifications (reuse for job completion)

Usable today:

1. **In-app** — `logActivity` / `logActivitySafe` → `notifications` table + `/api/notifications`
2. **Email queue** — `queueNotification` → `notification_queue` (processing must leave the request path)

Activity-driven email preference is still a stub (`console.debug` in activity-logger).

---

## 6. Findings checklist (Phase 1 output)

- [x] Module boundary violations — listed in §1.3  
- [x] Connection pool status — **bug: 8 pools, defaults, no globalThis** (§2.1)  
- [x] Missing indexes — §2.2  
- [x] N+1 instances — §2.3  
- [x] Un-transacted multi-step ops — §2.4  
- [x] Sync ops that should background — §3  
- [x] Caching candidates ranked — §4  

**Next:** See `SCALABILITY_PLAN.md` for proposed fixes. Implementation waits for approval.
