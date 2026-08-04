# Audit: Notifications & Recent Activity

**Phase:** 1 — Audit only (no implementation)  
**Date:** 2026-07-26  
**Goal:** Establish what already exists vs. what must be built for a centralized notification + activity-log system.

---

## 1. Executive summary

| Area | Status | Notes |
|------|--------|--------|
| Header bell (admin) | **Decorative / static badge** | Always shows red dot; links to `/admin/notifications`; **no unread count API**, no dropdown |
| Tenant bell | **Ad-hoc UI** | Dropdown of live maintenance + recent payments from dashboard data — **not** the `notifications` table |
| Toast notifications | **Client-only** | `NotificationContext` / `useNotifications` — ephemeral UI toasts, unrelated to DB |
| In-app `notifications` table | **Exists, empty, unused** | Schema present; **0 rows**; nothing `INSERT`s into it |
| `audit_logs` table | **Exists, empty, unused** | Schema present; **0 rows**; dashboard reads it but nothing writes |
| Email reminder system | **Partially built** | Templates / queue / history / settings for payment & lease emails — **orthogonal** to in-app activity |
| Settings “Notifications” tab | **Mostly local UI** | Toggles in React state; not a per-category preference store as specified |
| Activity UI shell | **Present but empty** | Dashboard widget + `/admin/activity-logs` page read `audit_logs` (always empty) |

**Verdict:** There is scaffolding (tables + read APIs + UI shells) but **no write path** from mutating business actions. Phase 2+ should treat this as **mostly greenfield for activity + preference-driven in-app notifications**, while carefully **not breaking** the separate email reminder queue system.

---

## 2. Header bell & related UI

### 2.1 Admin header (`AdminLayoutClient.tsx`)

```tsx
<Link href="/admin/notifications">
  <Bell />
  <span className="... bg-red-500 ..." />  {/* always visible */}
</Link>
```

- **Behavior today:** Navigation only. Red indicator is **hardcoded**, not driven by unread count.
- **Does not:** fetch notifications, open a dropdown, mark-as-read, or deep-link to an entity.

### 2.2 Admin notifications page (`/admin/notifications`)

- Renders `NotificationsManager`.
- **Actual purpose:** Ops tools to **Generate Payment Reminders** and **Process Notification Queue** (email pipeline).
- **Not** an in-app notification inbox.

### 2.3 Dashboard widget (`NotificationsWidget.tsx`)

- Fetches `GET /api/admin/dashboard/notifications`.
- Expects rows from `notifications` with unread count.
- Today always empty → empty state / zero unread.

### 2.4 Recent Activity UI

| Surface | Path / component | Data source |
|---------|------------------|-------------|
| Dashboard widget | `ActivityLogsWidget` | `GET /api/admin/dashboard/activity-logs` → `audit_logs` |
| Full page | `/admin/activity-logs` → `ActivityLogsPageClient` | Same API (limit 20, **no filters**) |

Both are read-only shells over an unused table.

### 2.5 Tenant portal bell (`tenant/page.tsx`)

- Dropdown assembled from **in-memory dashboard payload** (open maintenance + recent payments).
- Badge when those lists are non-empty.
- **No** persistence, preferences, or `notifications` table usage.

### 2.6 Settings → Notifications tab

- Keys: `emailNotifications`, `paymentReminders`, `maintenanceAlerts`, `monthlyReports`.
- UI toggles; persistence goes through generic settings save if user clicks Save — **not** the proposed `notification_preferences` model (no per-category in-app vs email matrix).

### 2.7 Toast system (do not confuse)

- `src/context/NotificationContext.tsx` + `src/hooks/useNotifications.ts`
- In-session toast stack for CRUD feedback (“Tenant created successfully”).
- **Keep as-is**; new system is durable in-app + activity log.

---

## 3. Database: what exists today

Live DB check (2026-07-26): all counts **0**.

### 3.1 Tables related to “notifications”

| Table | Purpose | Used by writers? |
|-------|---------|------------------|
| `notifications` | In-app style rows (`user_id`, `title`, `message`, `is_read`, `priority`, …) | **No** — zero inserts found in codebase |
| `notification_templates` | Email HTML/text templates | Email reminder system |
| `notification_settings` | Building/global email reminder config | Email reminder system |
| `notification_queue` | Outbound email queue | `notification-service.ts` |
| `notification_history` | Sent email history | Email reminder system |

Schema for `notifications` (from `schema.sql`):

- Has: `user_id`, `tenant_id`, `notification_type`, `title`, `message`, `priority`, `is_read`, `read_at`, `scheduled_for`, `sent_at`, `notification_status`, `created_at`
- **Missing vs. desired design:** `category`, `link`, `related_activity_log_id` / FK to activity, preference-aware fan-out

### 3.2 Audit / activity

| Table | Purpose | Used by writers? |
|-------|---------|------------------|
| `audit_logs` | Generic `CREATE|UPDATE|DELETE|READ` + `old_values`/`new_values` JSONB | **No** |

Schema:

- `user_id`, `table_name`, `record_id`, `action`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`
- **Missing vs. desired design:** `action_type` taxonomy (`tenant.created`), `entity_type`/`entity_label`, `actor_role`, `metadata`, category for filtering

### 3.3 Migrations of note

- `migrations/add-notifications-system.sql` — email templates/queue/history/settings (+ reminder SQL helpers)
- `migrations/add-late-fees-system.sql` — includes `send_notification` boolean on late-fee config (email-oriented)
- **No** `activity_log` or `notification_preferences` migration exists

### 3.4 Code search: writers

```
INSERT INTO audit_logs  → none
INSERT INTO notifications → none
```

Only **readers**:

- `GET /api/admin/dashboard/notifications`
- `GET /api/admin/dashboard/activity-logs`

---

## 4. Existing APIs in the “notifications” namespace

These are **email reminder / queue** APIs, not the in-app inbox:

| Route | Role |
|-------|------|
| `/api/notifications/reminders/generate` | Build payment reminders |
| `/api/notifications/queue` | Queue management |
| `/api/notifications/queue/process` | Send queued emails |
| `/api/notifications/send-reminder` | Send one reminder |
| `/api/notifications/email` | **Mock** in-memory email queue (not DB) |
| `/api/notifications/test-email` | SMTP smoke test |
| `/api/notifications/history/[tenantId]` | History lookup |

**Implication for Phase 2+:** Prefer **new route prefixes** for the in-app system (e.g. `/api/activity`, `/api/notification-preferences`, and either extend `/api/admin/dashboard/notifications` or add `/api/notifications/inbox` / `/api/in-app-notifications`) to avoid colliding with email ops routes.

---

## 5. Mutating action inventory (event sources)

Below: **meaningful** write endpoints that should eventually call a shared `logActivity()` (Phase 3). Excludes pure auth password reset, seed/init (optional under `system`), report export downloads, and image-serve.

### 5.1 Core property / people

| Module | Methods | Routes |
|--------|---------|--------|
| Tenants | POST, PUT, DELETE | `/api/tenants`, `/api/tenants/[id]` |
| Tenant extras | POST/DELETE/PUT | profile-picture, agreement, assignments |
| Buildings | POST, PUT, DELETE | `/api/buildings`, `/api/buildings/[id]` |
| Rooms | POST, PUT, DELETE | `/api/rooms`, `/api/rooms/[id]` |
| Room assign | POST | `/api/rooms/[id]/assign` |
| Occupants | POST, PUT, DELETE | `/api/occupants`, `/api/occupants/[id]` (+ tenant variants) |
| Building deposit config | POST | `/api/building-deposit-config` |

### 5.2 Money

| Module | Methods | Routes |
|--------|---------|--------|
| Payments | POST, PUT, DELETE | `/api/payments`, `/api/payments/[id]` |
| Payment allocate | POST | `/api/payments/allocate` |
| Tenant payment claim | POST | `/api/tenant/payments/process`, `/manual` |
| Invoices | POST, PUT, DELETE | `/api/invoices`, `/api/invoices/[id]` |
| Invoice generate | POST | `/api/invoices/generate`, `generate-monthly`, `/api/bulk/invoices/generate` |
| Expenses | POST, PUT, DELETE | `/api/expenses`, `/api/expenses/[id]` |
| Deposit ledger | POST | `/api/deposit-ledger` |
| Tenant credits | POST | `/api/tenant-credits` |
| Late fees | POST, PATCH | apply, settings, waive |
| Payment methods / gateways | POST, PATCH, DELETE | `/api/payment-methods`, `/api/payment-gateways` |

### 5.3 Leases / reservations

| Module | Methods | Routes |
|--------|---------|--------|
| Reservations | POST, PUT, DELETE | `/api/reservations`, `/api/reservations/[id]` |
| Convert reservation | POST | `/api/reservations/[id]/convert` |
| Lease renewals / alerts | POST | `/api/lease/renewals`, `/api/lease/alerts/generate` |

### 5.4 Maintenance / assets / utilities / meters

| Module | Methods | Routes |
|--------|---------|--------|
| Maintenance (admin) | POST, PUT, DELETE | `/api/maintenance` |
| Maintenance (tenant) | POST | `/api/tenant/maintenance` |
| Assets | POST, PUT, DELETE | `/api/assets`, `/api/assets/[id]` |
| Asset assign | POST, DELETE | `/api/assets/[id]/assign`, room asset routes |
| Track asset actions | POST | `/api/track/asset/[id]/actions` |
| Utilities / bills | POST, PUT, DELETE, PATCH | `/api/utilities`, `/api/utility-bills/room`, tenant utility bills |
| Meter readings | POST | `/api/meter-readings` |
| Cost allocation | POST | rules, calculate, generate-bills |

### 5.5 Documents / images / bulk / profile / settings

| Module | Methods | Routes |
|--------|---------|--------|
| Documents | POST, PUT, DELETE | `/api/documents`, `[id]`, categories, templates |
| Images | POST, PUT, DELETE, PATCH | `/api/images`, set-primary |
| Bulk | POST, PATCH | payments import, tenants update-status, invoice generate |
| Profile | PUT, POST | `/api/profile`, password, avatar |
| Settings | PUT, POST | `/api/settings` |
| Export jobs | POST, PUT, DELETE | `/api/export` |

### 5.6 Explicitly low-priority / system

| Module | Notes |
|--------|--------|
| `seed-*`, `init-db`, `migrations/*` | Log as `system.*` if at all; default notify **OFF** |
| Report PDF/Excel generation | Usually not “entity change”; optional `system.report_exported` |
| Auth forgot/reset password | Security-sensitive; recommend **separate** handling, not general activity feed to all admins |

**Approx. Phase 3 wiring surface:** ~70+ mutating handlers across ~50 route files (many files have multiple methods).

---

## 6. Exists vs. must build

### 6.1 Can reuse / enhance

| Asset | Reuse how |
|-------|-----------|
| `notifications` table | **Candidate** for in-app inbox after `ALTER` (add `category`, `link`, `activity_log_id`, maybe rename mental model to “inbox”) |
| Dashboard notifications widget | Wire to real data + mark-read |
| Activity logs widget + `/admin/activity-logs` | Replace data source with new `activity_log` (or migrate) and add filters/detail |
| Admin bell | Replace link-only + static dot with dropdown + unread badge |
| Email queue / templates | Keep for outbound mail; `logActivity` email extension can enqueue later |
| Toast context | Unrelated — keep |

### 6.2 Must build from scratch

| Piece | Why |
|-------|-----|
| Shared `logActivity()` service | No single emission pattern today |
| Wiring into mutating routes | Zero writers |
| `activity_log` (or evolved audit) with taxonomy | `audit_logs` too coarse / unused |
| `notification_preferences` | Does not exist |
| Preference-aware fan-out | Does not exist |
| Inbox APIs (list / read / read-all) | Only a limited dashboard GET exists |
| Preferences GET/PUT APIs | Does not exist |
| Rich `/admin/activity` filters + before/after diff UI | Current page is a thin empty list |
| Notification settings UI (per category × channel) | Settings tab is different shape |
| Real unread badge + dropdown on admin bell | Currently decorative |
| Tenant integration policy | Ad-hoc bell only |

### 6.3 Naming collision risk

- UI label “Notifications” today means **email reminder ops** at `/admin/notifications`.
- Plan should either:
  - **Rename** that page to “Email Reminders” / “Notification Queue”, and use `/admin/notifications` (or `/admin/inbox`) for the in-app feed, **or**
  - Keep ops at `/admin/notifications` and put inbox under `/admin/inbox` / bell dropdown only.

**Recommendation:** Rename ops page to **Email Reminders**; reserve “Notifications” for the in-app inbox UX.

---

## 7. Gaps vs. stated product goals

| Goal | Current state |
|------|----------------|
| Every meaningful action emits an event | ❌ |
| Event → activity always | ❌ (`audit_logs` unused) |
| Event → notification if prefs allow | ❌ |
| Per-category in-app / email toggles | ❌ (fake/local toggles only) |
| Filterable Recent Activity + before/after | ❌ (empty list, no filters, no diff) |
| Bell with real unread + deep links | ❌ |

---

## 8. Open questions for Phase 2 approval

Captured again in `NOTIFICATION_PLAN.md`; called out here for visibility:

1. **Tenant visibility:** Should tenants get a limited activity feed, notifications only, or neither beyond today’s ad-hoc bell?
2. **Table strategy:** New `activity_log` + alter `notifications`, or leave old tables and create parallel names?
3. **Default prefs ON/OFF** per category (see plan).
4. **Rename** `/admin/notifications` email ops page to avoid UX confusion?

---

## 9. Phase 1 conclusion

The app has **UI chrome and empty tables** that look like a notification/activity system, plus a **separate email reminder pipeline**. It does **not** yet have a centralized activity log or preference-driven in-app notifications. Phase 2 design should introduce a single emission API and a clear taxonomy, then Phase 3 wires modules additively without rewriting business logic.
