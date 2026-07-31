# Scalability Fixes — Verification Report

**Date:** 2026-07-28  
**Scope:** Verify Phase 3 claims (pool, indexes, transactions, N+1 batching, background jobs, dashboard cache, light concurrency).  
**Method:** Code grep + live DB `EXPLAIN ANALYZE` + forced-failure TX tests + app-function tests via `tsx` + concurrent query smoke.  
**Harness:** `scripts/verify-scalability-claims.js` (kept as a re-runnable verifier; no temporary breakage left in app source).  
**Raw evidence:** `verification-raw.json`

No new features were added in this pass. Temporary forced failures ran only inside verification scripts / one-off `tsx` calls; verification leftovers (`verify_dup_*` users/tenants, `__verify_*` jobs) were deleted afterward.

---

## 1. Confirm pool is truly single-instance

### What was checked
- Repo-wide grep for `new Pool(` and `PrismaClient`
- Read `src/lib/db.ts` singleton / `globalThis` logic
- Confirm deploy model (Hostinger + PM2)

### What was found — **PASS (runtime) / PARTIAL (prod globalThis) / FLAG (scripts)**

| Check | Result |
|-------|--------|
| `new Pool(` under `src/` | **Exactly 1** — `src/lib/db.ts` |
| Prisma client instantiation | **None** in app runtime |
| Modules import shared pool | Former private pools (payment-allocator, invoice generators, deposit-ledger, etc.) now `import pool from '@/lib/db'` |
| `globalThis` HMR guard | Present: reads `__parentaPgPool`, creates if missing |
| Production assignment | **PARTIAL:** pool is only written to `globalThis` when `NODE_ENV !== 'production'` |
| Scripts / tooling | **Many** `new Pool(` under `scripts/`, root migration helpers, `smoke-pool-concurrency.js` — CLI-only, not Next request path |

**Max concurrent connections (current deploy):**
- Target: **Hostinger shared hosting + single PM2 process** (`parenta-app`) — **not serverless**
- Pool `max: 10`
- Multiplier: **1 process**
- **Max ≈ 10** app DB connections (plus occasional CLI script pools if someone runs migrations against the same DB)

### Gaps
1. **Production does not persist the pool on `globalThis`.** Safe for a single module load under PM2, but if the module were re-evaluated in production, a second pool could appear. Suggested follow-up: always assign `globalThis.__parentaPgPool = pool` (trivial).
2. Scripts create their own pools — acceptable for CLI; do not import them from app routes.

---

## 2. Confirm indexes are actually used

### What was checked
- All 12 Phase 3 indexes present in `pg_indexes`
- `EXPLAIN (ANALYZE)` on the motivating query shapes (with `enable_seqscan=off` to prove index eligibility on tiny tables)
- Honesty check: default planner with `enable_seqscan=on` on current small data

### What was found — **PASS (indexes exist + selectable) / PARTIAL (tiny-table default plans)**

| Index / query | Present | Index Scan when seqscan disabled | Exec time |
|---------------|---------|----------------------------------|-----------|
| `idx_tenant_credits_applied_invoice` | ✓ | ✓ Index Scan | 0.034ms |
| `idx_deposit_ledger_applied_invoice` | ✓ | ✓ Index Scan | 0.018ms |
| `idx_maintenance_requests_room` | ✓ | ✓ Index Scan | 0.006ms |
| `idx_tenant_utility_bills_tenant` | ✓ | ✓ Index Scan | 0.008ms |
| `idx_invoices_created` (`ORDER BY created_at DESC`) | ✓ | ✓ Index Scan | 0.035ms |
| `idx_payments_created` | ✓ | ✓ Index Scan | 0.017ms |
| `idx_notifications_created` | ✓ | ✓ Index Scan | 0.017ms |
| Other utility-bill / cost-allocation indexes | ✓ (12/12) | n/a in sample queries | — |

**Optional before/after (same credits filter):**
- Seq-scan forced: **0.024ms**
- Index forced: **0.009ms**
- (Absolute times are noise on ~1-row tables; evidence is plan shape, not speedup magnitude.)

**Default planner (seqscan ON) on current DB:** still chooses **Seq Scan** on `tenant_credits` for the applied-invoice filter — expected when the table is tiny. Indexes are valid and used when selective; they will dominate as row counts grow.

### Gaps
- None blocking. No missing Phase 3 indexes. No wrong composite order found for the queries that motivated them.

---

## 3. Force-test transaction rollback behavior

### What was checked
1. **payment + allocate** — app functions `createPayment(…, client)` + `allocatePaymentToInvoices(…, client)` in one `BEGIN`; force allocate failure (non-existent tenant); `ROLLBACK`; query DB for payment by id/reference.
2. **tenant + user** — same-client pattern: throw after user `INSERT` before tenant; also real `createTenantWithUser` duplicate-email second attempt.
3. **password-reset tokens** — `BEGIN` → invalidate + insert token → throw → `ROLLBACK`; confirm no dangling `token_hash`.

### What was found — **PASS**

| Test | Forced break | Expected | Actual DB after |
|------|--------------|----------|-----------------|
| payment+allocate (script mirror) | throw after payment INSERT | 0 payment rows | **0 orphans — PASS** |
| payment+allocate (app functions) | allocate to fake tenant id | 0 payment rows | **0 orphans — PASS** (`Tenant not found…` → ROLLBACK) |
| tenant+user (script mirror) | throw after user INSERT | 0 users, 0 tenants | **0 / 0 — PASS** |
| tenant+user (app `createTenantWithUser`) | second create same email | first kept; second rolled back | **1 user / 1 tenant — PASS** |
| password-reset tokens | throw after token INSERT | 0 rows for test hash | **0 — PASS** |

Temporary breakage lived only in the verification script / ephemeral `tsx` eval — **not** left in application source. Verification rows cleaned up (`verify_dup_*`, `__verify_*` jobs).

### Gaps
- Room assign / reservation convert still generate invoices **after** assignment COMMIT (known from audit; out of scope to fix here). Not re-broken by this pass.

---

## 4. Verify N+1 fixes are actually batched

### What was checked
- Code inspection of each hot path
- Query-count instrumentation on representative set-based SQL against live data

### What was found

| Hot path | Verdict | Evidence |
|----------|---------|----------|
| Invoice status recalc | **PASS** | 6 invoices → **1** set-based query (joins + aggregates) |
| Bulk invoicing existence + insert | **PASS** | Existence: `ANY($1)` one query; creates: single multi-row `INSERT … VALUES (…), (…)` |
| Documents bulk-download | **PASS (code)** | `getDocumentsByIds` uses `WHERE id = ANY($1::uuid[])`; table empty in this DB so runtime count N/A |
| Activity fan-out | **PASS** | Prefs: `user_id = ANY($1)` one query; notifications: one multi-row `INSERT` |
| Notification queue process | **PASS (batch claim) / expected sequential SMTP** | `UPDATE … WHERE id = ANY($1)` then loop `sendEmail` (I/O bound, not DB N+1) |
| Late fees | **PARTIAL** | Settings loaded once via `ANY($1)`; **`calculate_late_fee()` still 1 DB call per overdue invoice** |

### Gaps
1. **Late-fee apply/calculate still scales with invoice count** for the Postgres function call (settings N+1 is fixed). Follow-up: batch fee computation in SQL or accept per-invoice function cost.
2. Dataset size here is small (6 invoices, 8 tenants). Query *shape* is O(1) round-trips for the fixed paths; linear growth was not observed for those shapes.

---

## 5. Verify background jobs don't silently drop work

### What was checked
- `background_jobs` schema columns
- Forced failure visibility (SQL + real `processPendingJobs` with unknown `jobType`)

### What was found — **PASS (visibility) / GAP (no retry)**

**Schema columns:**  
`id, job_type, payload, status, progress, result, error, created_by, created_at, started_at, completed_at`

| Capability | Present? |
|------------|----------|
| Status (`pending` / `running` / `completed` / `failed` / `cancelled`) | **Yes** |
| Error / failure reason (`error` TEXT) | **Yes** |
| Result JSON | **Yes** |
| Retry count / max attempts | **No** |
| Admin UI for failed jobs | **No** (queryable via `GET /api/jobs/[id]` and SQL) |

**Force-fail test:**
- Enqueued `job_type = '__verify_unknown__'`
- `processPendingJobs` claimed it, `executeJob` threw `Unknown job type: …`
- DB row: `status = 'failed'`, `error = 'Unknown job type: __verify_unknown__'` — **PASS, not silent**
- Also fires `logActivitySafe` with `job.failed`

### Gaps (do **not** implement until confirmed)
1. **No retry / max-attempts.** Failed jobs stay `failed` until someone re-enqueues manually.  
   **Minimal addition if desired:** columns `attempts INT DEFAULT 0`, `max_attempts INT DEFAULT 3`; on failure either re-queue as `pending` with backoff if `attempts < max_attempts`, else leave `failed`. Optional admin “Retry” that resets status to `pending`.
2. No dedicated admin list UI for failed jobs (API/SQL only) — optional UX, not a silent-drop bug.

---

## 6. Verify dashboard cache invalidation covers all mutation paths

### What was checked
- Aggregations inside `getAllDashboardMetrics()`
- Every `invalidateDashboardCache()` call site under `src/`
- Mutation routes that change those numbers but do not invalidate

### Dashboard metrics aggregations (8)
1. `getTotalRevenue`
2. `getOutstandingInvoices`
3. `getOccupancyRate`
4. `getRecentPayments`
5. `getUpcomingDueDates`
6. `getTopTenantsByPayments`
7. `getInvoiceStatusBreakdown`
8. `getMonthlyRevenueTrend`  
(+ `generatedAt`)

`/api/dashboard/stats` is a separate cache key covering buildings/rooms/tenants/payments summary cards.

### Current invalidation triggers
| Trigger | Invalidates? |
|---------|--------------|
| `POST /api/payments` (create) | **Yes** |
| `POST /api/bulk/invoices/generate` (sync) | **Yes** |
| Job: `bulk_invoices_generate` / `monthly_invoices_generate` | **Yes** |

### TTL
- **60s** (`DASHBOARD_TTL_MS`) is a real backstop **and** invalidation exists for the paths above — not TTL-only.  
- **But** for most other mutations, **TTL is the only refresh mechanism** → up to 60s stale (or longer if nothing else touches cache… actually TTL alone refreshes after 60s).

### What was found — **PARTIAL / important gaps**

Mutations that change dashboard-relevant data **without** calling `invalidateDashboardCache()`:

| Mutation path | Affects |
|---------------|---------|
| `POST/PUT/DELETE /api/invoices` (and generate routes other than bulk sync) | outstanding, breakdown, upcoming |
| Payment update/delete / tenant portal payment routes | revenue, recent payments |
| Expenses create/update/delete | (stats financial if used; metrics less so) |
| Tenants create/update/status | tenant counts, top tenants |
| Rooms assign / unassign / status | occupancy |
| Reservations convert | occupancy + invoices |
| Lease move-out | occupancy, tenants |
| Late fee apply | invoices outstanding |

**This is the largest silent gap:** after those actions, cached dashboard can show stale numbers for up to **60 seconds** (or until a payment/bulk-invoice invalidation happens). Stale dashboards are worse than no cache when users just mutated money/occupancy.

### Gaps (follow-up, do not fix in this pass)
- Centralize `invalidateDashboardCache()` into shared mutation helpers or call it from invoice/expense/tenant/room/reservation write routes (and payment non-POST paths).

---

## 7. Basic concurrent load check

### What was checked
- 20 concurrent DB workloads mimicking dashboard aggregations, payment-prep reads, and bulk-ish existence queries against the shared pool config (`max: 10`)

### What was found — **PASS**

| Metric | Value |
|--------|-------|
| Requests | 20 concurrent |
| Success | **20/20** |
| Errors / pool timeouts | **0** |
| p50 | 8ms |
| p95 | 29ms |
| max | 29ms |
| `pg_stat_activity` observed | 10 (bounded by pool max) |

Not a full HTTP load test (no Next server auth round-trip); proves the pool does not exhaust or hang under light concurrent DB use matching the app’s connection budget.

---

## Summary

### Confirmed working as claimed
- Single runtime `pg.Pool` in `src/` (`db.ts` only); max ≈ **10** on Hostinger/PM2
- All **12** Phase 3 indexes present and selectable (Index Scan proven)
- **payment+allocate**, **tenant+user**, **password-reset token** rollbacks leave **no orphans** (app-level + mirror tests)
- Invoice recalc, bulk invoice set ops, activity prefs/inserts, notification claim, documents `ANY` are **batched** (not per-row DB loops)
- Background job failures are **visible** (`status=failed` + `error` text + activity log)
- Light concurrency (20) completes with **no pool exhaustion**
- Dashboard cache TTL 60s exists; invalidation works for payment create + bulk invoice paths

### Found gaps needing follow-up
1. **Dashboard cache invalidation incomplete** — invoices, expenses, tenants, room assign, reservations, late fees, most payment variants do not invalidate → up to 60s stale (or longer relative to user expectation). **Next step:** add `invalidateDashboardCache()` to those write paths (or one shared write hook).
2. **Late fees still O(n) DB function calls** per overdue invoice (settings batching only). **Next step:** decide whether to batch in SQL or accept function cost.
3. **No job retry / max-attempts** — failures are visible but not auto-retried. **Next step (if wanted):** minimal `attempts`/`max_attempts` + requeue or admin retry — confirm scope before implementing.
4. **Production `globalThis` pool assignment skipped** — low risk under single PM2 load; trivial to always set. **Next step:** one-line fix in `db.ts`.
5. **Scripts still create private pools** — fine for CLI; document “never `new Pool` in `src/`”.
6. **Default planner may Seq Scan on tiny tables** — not a defect; indexes ready for growth.

### Cleanup confirmation
- No temporary failure-injection code left in application routes/services.
- Verification harness kept: `scripts/verify-scalability-claims.js`.
- Ephemeral DB rows from this pass (`verify_dup_*`, `__verify_*` jobs) deleted.
