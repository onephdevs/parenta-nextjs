# Scalability & Architecture Plan — Modular Monolith

**Date:** 2026-07-28  
**Based on:** `SCALABILITY_AUDIT.md`  
**Status:** APPROVED 2026-07-28 — Phase 3 Step 1 COMPLETE (indexes applied to DB)  
**Constraint:** Single Next.js deployable app. No microservices, API gateway, or service mesh.

---

## Recommended priority order (Phase 3)

Matches the audit’s risk order and your requested sequence:

| Step | Item | Risk | Why first/last |
|------|------|------|----------------|
| 1 | Index migration | Low | Immediate query win; reversible; no API changes |
| 2 | Collapse to one pool + sane config | Low–med | Stops connection exhaustion; prerequisite for real transactions across modules |
| 3 | N+1 refactors (hottest paths) | Med | Correctness must be verified per path |
| 4 | Wrap multi-step writes in transactions | Med | Correctness-critical; needs forced-failure tests |
| 5 | Background jobs (first 2–3 candidates) | Med–high | New infra pattern; Redis **not** required initially |
| 6 | Caching (dashboard metrics first) | Med | Invalidation must be proven |
| 7 | Module boundary cleanup | Low urgency | Highest file count; do last |

Each step: implement → verify → commit separately.

---

## 1. Module boundary cleanup plan

### 1.1 Convention going forward

Align backend with domain ownership (stronger than current UI `components/domain/` which is only badges):

```
API route
  → calls one or more domain modules (lib/api/* and/or lib/services/*)
  → does not contain multi-table business SQL

Domain A needs Domain B’s data/mutations:
  → call B’s exported function, OR
  → route composes A + B

Domain services MUST NOT import another domain’s service file for “convenience”
  when a thin shared function on B’s module exists.

Exception (documented): reporting/dashboard/analytics may JOIN many tables
  in a dedicated reports/dashboard module — they are read aggregators, not owners.
```

This matches how thin routes already call `lib/api/buildings` etc., and extends it to stop workflows from writing foreign tables.

### 1.2 Specific fixes per violation

| Violation | Proposed fix |
|-----------|--------------|
| `payment-allocator` → `tenants` SELECT | Add `getTenantBasicById(id)` in `lib/api/tenants.ts`; allocator calls it (or receives tenant snapshot from route) |
| `payment-allocator` → INSERT `deposit_ledger` / `tenant_credits` | Use `createDepositTransaction` / credit create from `deposit-ledger.ts` / `tenant-credits.ts` — **after** those modules share the same pool/client (Step 2). Prefer overloads that accept optional `PoolClient` for TX |
| `payment-allocator` → UPDATE `invoices` | Add `updateInvoicePaymentState(client, …)` in `lib/api/invoices.ts`; allocator calls it |
| `invoice-generator` → credits/deposits | Same: call deposit/credit API helpers with shared client |
| `lease-management-service` move-out writes | Call `tenants.updateStatus`, `rooms`/`assignments` helpers, deposit/credit APIs instead of raw SQL |
| `bulk-operations-service` inline invoice INSERT | Delegate to `invoice-generator` / `lib/api/invoices.createInvoice` only |
| `bulk-operations` payments + deposits | Call `createPayment` + deposit helper (or shared “record payment” orchestration in payments domain) |
| `rooms.ts` / `tenants.ts` assign cross-writes | Keep one **orchestration** function (e.g. `assignTenantToRoom`) as the single owner; route must call it — remove duplicate SQL from `rooms/[id]/assign/route.ts` |
| `reservations.ts` payments/rooms/tenants | Extract `convertReservationToAssignment` that composes payments + rooms + tenants APIs |
| Duplicate deposit/credit helpers | **Delete** duplicates from `payment-allocator`; re-export thin wrappers from `deposit-ledger` / `tenant-credits` if needed |
| `maintenance/route.ts` inline CRUD | Extract `lib/api/maintenance.ts` (or `services/maintenance-service.ts`); route becomes thin |

### 1.3 API contracts

No request/response shape changes unless a boundary cleanup forces it — if so, confirm with you first. Prefer internal refactors only.

---

## 2. Database fix plan

### 2.1 Index migration (Step 1)

New migration file (e.g. `migrations/add-scalability-indexes.sql`).  
**Do not wrap `CONCURRENTLY` in a transaction.** Run statements one-by-one (or without BEGIN/COMMIT).

```sql
-- Invoice status recalc hot path
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_credits_applied_invoice
  ON tenant_credits(applied_to_invoice_id)
  WHERE applied_to_invoice_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deposit_ledger_applied_invoice
  ON deposit_ledger(applied_to_invoice_id)
  WHERE applied_to_invoice_id IS NOT NULL;

-- Maintenance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_requests_room
  ON maintenance_requests(room_id)
  WHERE room_id IS NOT NULL;

-- Tenant utility bills (currently unindexed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_utility_bills_tenant
  ON tenant_utility_bills(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_utility_bills_building
  ON tenant_utility_bills(building_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_utility_bills_utility_bill
  ON tenant_utility_bills(utility_bill_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_utility_bills_status
  ON tenant_utility_bills(bill_status);

-- Cost allocation history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cost_allocation_history_building
  ON cost_allocation_history(building_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cost_allocation_history_utility_bill
  ON cost_allocation_history(utility_bill_id);

-- List/sort helpers (if EXPLAIN shows seq scans)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created
  ON notifications(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_created
  ON invoices(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created
  ON payments(created_at DESC);
```

**Verify:** `EXPLAIN ANALYZE` on status-recalc queries filtering `applied_to_invoice_id`, maintenance JOINs on `room_id`, and `tenant_utility_bills` by `tenant_id` — before/after Index Scan.

Also verify whether `add-performance-indexes.sql` actually applied in production (`\di` in Supabase). Re-run any missing indexes **without** wrapping CONCURRENTLY in a transaction.

### 2.2 Pool configuration (Step 2)

**Fix:**

1. Single shared pool in `src/lib/db.ts` with `globalThis` guard for Next.js HMR.
2. Replace every `new Pool({…})` in `lib/api/*` and `lib/services/*` with `import pool from '@/lib/db'`.
3. Add config suitable for **single PM2 process + Supabase** (conservative — do not over-provision):

```ts
const globalForPg = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,                        // one process; matches prior default but now shared
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000, // fail fast instead of hanging forever
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export default pool;
```

**Reasoning:** Hostinger is a single Node process. Supabase free/pro poolers often allow low connection counts; 8×10 was the real bug. Keeping `max: 10` on **one** pool is safer than raising max. If you later run 2 PM2 instances, drop `max` to ~5 each or use Supabase transaction pooler + lower max.

**Verify:** Simple concurrent script (e.g. 20 parallel hits to `/api/dashboard/metrics` + `/api/payments`) — no connection errors; `pg_stat_activity` count stays bounded.

### 2.3 N+1 refactors (Step 3) — proposed query shapes

| Hot path | Proposed shape |
|----------|----------------|
| Invoice status recalc (per tenant / all) | One query: unpaid invoices LEFT JOIN aggregated `payment_allocations` + `tenant_credits` + `deposit_ledger` by invoice_id; then bulk `UPDATE … FROM (VALUES …)` or single pass updates |
| Monthly invoice generation | Fetch all active tenant leases in one query; batch-check existing invoices with `WHERE (tenant_id, month) IN (…)`; multi-row `INSERT … SELECT` for missing months |
| Bulk invoice generate | Same as monthly — stop per-tenant SELECT+INSERT; use set-based insert |
| Late fee calculate/apply | Load overdue invoices + settings once (JOIN or `WHERE invoice_id = ANY($1)`); compute in memory; batch apply |
| Notification queue process | Fetch batch of 50; still send emails sequentially (SMTP), but batch DB updates with `WHERE id = ANY($1)` |
| Activity notification fan-out | Prefetch preferences `WHERE user_id = ANY($1)`; single multi-row INSERT into `notifications` |
| Documents bulk-download | `getDocumentsByIds(ids)` with `WHERE id = ANY($1)` instead of `map(getDocumentById)` |
| Cost allocation room lookups | Prefetch rooms for building once; map in memory before inserts |

**Verify each:** same counts/amounts on a fixture tenant/building before vs after; not only latency.

### 2.4 Transactions to wrap (Step 4)

| Operation | Routes / callers | Approach |
|-----------|------------------|----------|
| Payment create + allocate | `api/payments` POST | Single `PoolClient`: create payment + allocate + credits/deposits; commit once. On allocation failure → rollback (or explicit compensating policy — currently swallows errors, which is worse) |
| Manual deposit + payment | `api/tenant/payments/manual` | One TX spanning deposit ledger + payment insert |
| Room assign + invoice gen | `api/rooms/[id]/assign` | Prefer: commit assignment, enqueue invoice job (Step 5). If sync kept temporarily: shared client for assign + invoice inserts, or accept “assignment OK / invoices pending” status with retry |
| Reservation convert + invoices | `api/reservations/[id]/convert` | Same pattern as assign |
| Tenant + user create | `lib/api/tenant-user-link.ts` | Pass `client` into user insert (or inline user INSERT on same client). **Critical correctness bug today** |
| Bulk monthly invoices | `bulk-operations-service` | Outer TX or chunked TXs (e.g. 25 tenants per commit) so a crash doesn’t leave an arbitrary half-set without a job id |
| Forgot-password token rotate | `api/auth/forgot-password` | BEGIN; invalidate; insert; COMMIT |

**Forced-failure test (required):** temporarily throw after first write inside TX; confirm first write rolled back.

---

## 3. Background job proposal

### 3.1 Queue recommendation — **no Redis required for v1**

| Option | Fit | Recommendation |
|--------|-----|----------------|
| BullMQ + Redis | Standard Node pairing | **Defer** — Redis is a **new** ops dependency (not in package.json, Hostinger, or env). Extra process + persistence + monitoring. Flag until you explicitly want multi-instance workers. |
| **Postgres job table + PM2 worker (or cron)** | Matches existing `notification_queue` pattern | **Prefer for first candidates** — zero new infra; works on single Hostinger instance |
| In-request `setTimeout` / fire-and-forget | Fragile under serverless/PM2 restart | Avoid for money-related work |

**Proposed v1 pattern:**

1. Table `background_jobs` (`id`, `type`, `payload jsonb`, `status`, `progress`, `error`, `created_by`, `created_at`, `started_at`, `completed_at`).
2. API route: insert job → return `{ jobId }` immediately (202).
3. Worker: second PM2 process `node scripts/job-worker.js` **or** secured cron hitting `POST /api/jobs/process` (same app, separate process preferred so HTTP workers aren’t blocked).
4. On complete: `logActivitySafe` / in-app notification to requesting admin; optional email via `queueNotification`.
5. Status: `GET /api/jobs/[id]` (or poll existing notifications).

**Redis later:** if you add multiple Node instances or job volume exceeds Postgres polling comfort — revisit BullMQ then.

### 3.2 Highest-value first candidates (pick 2–3)

| Priority | Operation | Why |
|----------|-----------|-----|
| **1** | Monthly / bulk invoice generation (`generate-monthly`, `bulk/invoices/generate`, assign/convert lease invoice gen) | Already O(tenants)×O(months); highest timeout/UX risk; money-critical |
| **2** | Notification queue processing (`/api/notifications/queue/process`, batch email) | Up to 50 sequential SMTP calls in one request |
| **3** | Financial PDF/Excel export (`reports/export/*`, `reports/financial/export`) | CPU-heavy; natural “download when ready” UX |

Defer CSV import / late-fee apply / ZIP download until the pattern is proven.

### 3.3 Job flow (API contract note)

Returning a job ID may change the response shape of bulk invoice / export routes. **Needs your OK before changing those contracts.** Alternative that preserves shapes: keep sync for small N, enqueue only when tenant count > threshold — still a behavior change, confirm first.

---

## 4. Caching proposal

### 4.1 Where to put the cache

| Option | When |
|--------|------|
| **In-memory LRU / Map with TTL** in `src/lib/cache/memory-cache.ts` | **Now** — single PM2 process |
| Redis | Only if multi-instance or shared cache across worker+web — **not recommended yet** |
| Next.js `unstable_cache` | Optional for server components; API routes benefit more from explicit memory/Redis helper |

### 4.2 First candidate + TTLs / invalidation

| Endpoint | TTL | Invalidate on |
|----------|-----|---------------|
| `/api/dashboard/metrics` (+ optionally fold subroutes) | 60s soft TTL | Any successful mutation on payments, invoices, tenants, rooms/assignments, expenses (call `invalidateDashboardCache()` from those write paths) |
| `/api/dashboard/stats` | 60s | Same |
| `/api/analytics` (real aggregations only) | 120s | Same mutations + date-range keyed cache entries |
| Report endpoints | 300s keyed by filters | Optional; lower priority than dashboard |
| Domain `*/stats` | 120s | Domain-specific writes |

**Correctness rule:** Prefer explicit invalidation over long TTL for dashboard money metrics. Stale dashboard for 60s without invalidation is acceptable only if invalidation wiring is incomplete — document that.

**Verify:** Create payment → immediately fetch metrics → must miss cache / show new totals.

---

## 5. What we will **not** do in this initiative

- Split into microservices / API gateway / service mesh
- Add Redis unless you explicitly approve the ops cost
- Change frontend API contracts without confirmation
- Batch unrelated fixes into one commit
- Trust “faster” without correctness checks

---

## 6. Approval checklist

Please confirm or adjust:

1. **Priority order** in the table at the top — OK as-is?
2. **Indexes** — approve the `CREATE INDEX CONCURRENTLY` list (and out-of-transaction apply)?
3. **Pool** — `max: 10` single shared pool OK for Hostinger + Supabase?
4. **Jobs** — Postgres job table + PM2/cron worker (no Redis) for the first 2–3 candidates?
5. **API contracts** — may bulk invoice / export return `{ jobId }` (202), or must we keep sync responses?
6. **Cache** — in-memory for dashboard metrics first OK?

After your approval, Phase 3 starts with **index migration only**, with before/after `EXPLAIN ANALYZE` evidence.
