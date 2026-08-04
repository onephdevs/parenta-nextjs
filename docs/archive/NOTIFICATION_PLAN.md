# Notification & Recent Activity — Phase 2 Plan

**Status:** Approved and implementing (Phase 3+)  
**Related:** `AUDIT_NOTIFICATIONS.md` (Phase 1)

---

## 1. Design principles

1. **One emission path** — every mutating success path calls `logActivity(...)`; that function owns activity insert + optional notification fan-out.
2. **Activity always, notify optionally** — preferences never suppress the activity row.
3. **Additive only** — no changes to business validation/payloads beyond the post-success `logActivity` call.
4. **Separate from email reminder ops** — keep `notification_queue` / templates / `/admin/notifications` ops tools; do not overload them for in-app inbox.
5. **Readable diffs** — store raw JSONB; render human-readable field changes in UI.

---

## 2. Table strategy (recommendation)

| Existing | Proposal |
|----------|----------|
| `audit_logs` | **Leave unused** for now (avoid dual writers). New table `activity_log` matches the product taxonomy. Optional later: backfill/drop `audit_logs`. |
| `notifications` | **Reuse + migrate** — already shaped as in-app inbox (`user_id`, `is_read`, `title`, `message`). Add columns rather than a third parallel table. |
| Email tables | **Untouched** (`notification_templates`, `notification_settings`, `notification_queue`, `notification_history`). |

### 2.1 `activity_log` (new)

```sql
CREATE TABLE activity_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role        VARCHAR(20) NOT NULL CHECK (actor_role IN ('admin', 'tenant', 'system')),
  action_type       VARCHAR(80) NOT NULL,          -- e.g. 'tenant.created'
  category          VARCHAR(40) NOT NULL,          -- denormalized for fast filters
  entity_type       VARCHAR(40) NOT NULL,          -- e.g. 'tenant'
  entity_id         UUID,
  entity_label      VARCHAR(255),                  -- display without join
  before_data       JSONB,
  after_data        JSONB,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_log_created_at ON activity_log (created_at DESC);
CREATE INDEX idx_activity_log_category ON activity_log (category);
CREATE INDEX idx_activity_log_action_type ON activity_log (action_type);
CREATE INDEX idx_activity_log_actor ON activity_log (actor_user_id);
CREATE INDEX idx_activity_log_entity ON activity_log (entity_type, entity_id);
```

### 2.2 `notification_preferences` (new)

```sql
CREATE TABLE notification_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category        VARCHAR(40) NOT NULL,
  in_app_enabled  BOOLEAN NOT NULL DEFAULT true,
  email_enabled   BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, category)
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences (user_id);
```

Missing rows for a `(user_id, category)` pair → apply **defaults** from code (see §5), do not require seeding every user up front. First toggle writes a row.

### 2.3 `notifications` (alter existing)

```sql
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category VARCHAR(40),
  ADD COLUMN IF NOT EXISTS link TEXT,
  ADD COLUMN IF NOT EXISTS related_activity_log_id UUID REFERENCES activity_log(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications (category);
CREATE INDEX IF NOT EXISTS idx_notifications_activity ON notifications (related_activity_log_id);
```

**Mapping:**

| Plan field | Existing column |
|------------|-----------------|
| `body` | `message` (keep DB name `message`; API can expose `body`) |
| `notification_type` | Keep for coarse type / action_type string (e.g. `tenant.created`) |
| `priority` | Keep; default `normal` |

---

## 3. Categories

| Category key | Label (UI) | Typical sources |
|--------------|------------|-----------------|
| `tenants` | Tenants | Tenant CRUD, assignments, occupants, profile picture |
| `buildings` | Buildings & rooms | Buildings, rooms, deposit config |
| `payments` | Payments | Payments, allocations, tenant payment claims, deposit ledger, credits |
| `invoices` | Invoices | Invoice CRUD, generate, bulk generate |
| `expenses` | Expenses | Expense CRUD |
| `maintenance` | Maintenance | Admin + tenant maintenance |
| `leases` | Leases & reservations | Reservations, convert, renewals, lease alerts |
| `utilities` | Utilities & meters | Utility bills, meter readings, cost allocation |
| `documents` | Documents | Documents, templates, categories |
| `assets` | Assets | Assets, assignments, track actions |
| `system` | System | Bulk status updates, imports, settings, seed (optional) |

---

## 4. Action-type taxonomy

Convention: `{entity}.{verb}` — stable string stored in `action_type` and usually in `notifications.notification_type`.

### 4.1 Tenants (`category: tenants`)

| action_type | When |
|-------------|------|
| `tenant.created` | POST `/api/tenants` |
| `tenant.updated` | PUT `/api/tenants/[id]` |
| `tenant.deleted` | DELETE `/api/tenants/[id]` |
| `tenant.status_changed` | Status-only updates / bulk status |
| `tenant.assigned` | Room assignment created |
| `tenant.unassigned` | Assignment ended |
| `occupant.created` / `updated` / `deleted` | Occupant routes |
| `tenant.agreement_uploaded` | Agreement upload |
| `tenant.profile_picture_updated` | Profile picture |

### 4.2 Buildings & rooms (`buildings`)

| action_type |
|-------------|
| `building.created` / `updated` / `deleted` |
| `room.created` / `updated` / `deleted` |
| `room.status_changed` |
| `building.deposit_config_updated` |

### 4.3 Payments (`payments`)

| action_type |
|-------------|
| `payment.recorded` |
| `payment.updated` |
| `payment.deleted` |
| `payment.allocated` |
| `payment.claim_submitted` | Tenant online/manual claim (pending) |
| `payment.refunded` | If/when refund path exists |
| `deposit.ledger_entry` |
| `credit.applied` |

### 4.4 Invoices (`invoices`)

| action_type |
|-------------|
| `invoice.created` |
| `invoice.updated` |
| `invoice.deleted` |
| `invoice.generated` | Manual / monthly / bulk generate |
| `invoice.paid` | Status → paid (when that transition is recorded) |
| `invoice.overdue` | System/job (future) |

### 4.5 Expenses (`expenses`)

| action_type |
|-------------|
| `expense.created` / `updated` / `deleted` |

### 4.6 Maintenance (`maintenance`)

| action_type |
|-------------|
| `maintenance.requested` |
| `maintenance.updated` |
| `maintenance.status_changed` |
| `maintenance.completed` |
| `maintenance.deleted` |

### 4.7 Leases & reservations (`leases`)

| action_type |
|-------------|
| `reservation.created` / `updated` / `cancelled` |
| `reservation.converted` |
| `lease.renewed` |
| `lease.expiring_soon` | System-generated alert job |

### 4.8 Utilities & meters (`utilities`)

| action_type |
|-------------|
| `utility_bill.created` / `updated` / `deleted` |
| `meter_reading.recorded` |
| `cost_allocation.calculated` |
| `cost_allocation.bills_generated` |

### 4.9 Documents (`documents`)

| action_type |
|-------------|
| `document.uploaded` / `updated` / `deleted` |
| `document_template.created` / `updated` / `deleted` |

### 4.10 Assets (`assets`)

| action_type |
|-------------|
| `asset.created` / `updated` / `deleted` |
| `asset.assigned` / `unassigned` |
| `asset.action_logged` | Track portal |

### 4.11 System (`system`)

| action_type |
|-------------|
| `bulk.payments_imported` |
| `bulk.invoices_generated` |
| `bulk.tenants_status_updated` |
| `settings.updated` |
| `export.created` | Optional |
| `system.seed_run` | Optional / rare |

Human-readable copy is derived in UI/service from `action_type` + `entity_label` + actor name, e.g.  
“**Ada Admin** recorded a payment for **Juan Dela Cruz**”.

---

## 5. Default preferences (need your confirmation)

Recommended defaults when no row exists:

| Category | In-app default | Email default |
|----------|----------------|---------------|
| `payments` | **ON** | OFF |
| `invoices` | **ON** | OFF |
| `maintenance` | **ON** | OFF |
| `leases` | **ON** | OFF |
| `tenants` | **ON** (admins) | OFF |
| `buildings` | OFF | OFF |
| `expenses` | OFF | OFF |
| `utilities` | OFF | OFF |
| `documents` | OFF | OFF |
| `assets` | OFF | OFF |
| `system` | **OFF** | OFF |

**Email:** store toggles now; Phase 3 `logActivity` only stubs:

```ts
if (pref.email_enabled) {
  // FUTURE: enqueue email via notification_queue / sendEmail
}
```

Please confirm or adjust this ON/OFF matrix before implementation.

---

## 6. Who gets notified?

### 6.1 Admin recipients

- All **active** users with `role = 'admin'` who have `in_app_enabled` for that category (via row or default).
- Actor **does** receive the notification by default (can revisit: “don’t notify myself”).

### 6.2 Tenant recipients

**Proposal (needs approval):**

| Channel | Tenant access |
|---------|----------------|
| In-app `notifications` | Yes — only events **about their own** tenant/payments/maintenance/invoices |
| Recent Activity page `/admin/activity` | **Admin only** |
| Tenant “activity” | Optional later: slim “My updates” list; not Phase 3–5 scope unless you want it |

Tenant-triggered events (e.g. `maintenance.requested`, `payment.claim_submitted`) → notify **admins** (per prefs) + optionally the **acting tenant** as confirmation.

---

## 7. Shared emission API

### 7.1 Location

`src/lib/services/activity-logger.ts` (name flexible)

### 7.2 Signature

```ts
export type ActivityCategory =
  | 'tenants' | 'buildings' | 'payments' | 'invoices' | 'expenses'
  | 'maintenance' | 'leases' | 'utilities' | 'documents' | 'assets' | 'system';

export interface LogActivityInput {
  actorUserId: string | null;       // null = system job
  actorRole: 'admin' | 'tenant' | 'system';
  actionType: string;               // 'tenant.created'
  category: ActivityCategory;       // or derived from actionType map
  entityType: string;               // 'tenant'
  entityId?: string | null;
  entityLabel?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  /** Deep link for notification click, e.g. /admin/tenants/{id} */
  link?: string | null;
  /** Override fan-out; default: all eligible admins (+ tenant if metadata.tenantUserId) */
  notifyUserIds?: string[];
  /** Skip notification insert (activity only) */
  skipNotifications?: boolean;
}

export interface LogActivityResult {
  activityLogId: string;
  notificationIds: string[];
}

export async function logActivity(input: LogActivityInput): Promise<LogActivityResult>;
```

### 7.3 Internal steps

1. `INSERT INTO activity_log ... RETURNING id`
2. Resolve recipient user IDs (admins ± tenant)
3. For each recipient, resolve prefs (DB row or defaults)
4. If `in_app_enabled` → `INSERT INTO notifications` (`title`, `message`/`body`, `category`, `link`, `related_activity_log_id`, `notification_type = actionType`, `is_read = false`)
5. If `email_enabled` → **no-op stub** with clear `// FUTURE` comment (do not send yet)
6. Never throw into the request hard-fail path ideally: wrap in try/catch and log errors so CRUD still succeeds if logging fails (**recommend soft-fail** — confirm)

### 7.4 Call-site pattern (additive)

```ts
// after successful create
await logActivity({
  actorUserId: session.user.id,
  actorRole: 'admin',
  actionType: 'tenant.created',
  category: 'tenants',
  entityType: 'tenant',
  entityId: tenant.id,
  entityLabel: `${tenant.firstName} ${tenant.lastName}`,
  beforeData: null,
  afterData: sanitize(tenant),
  link: `/admin/tenants/${tenant.id}`,
}).catch(err => console.error('[logActivity]', err));
```

`sanitize` strips password hashes / secrets from JSON snapshots.

### 7.5 Category derivation helper

```ts
ACTION_CATEGORY: Record<string, ActivityCategory> // map actionType → category
```

Call sites may pass `category` explicitly; helper validates consistency.

---

## 8. API routes (Phase 3)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/activity` | Admin | Paginated/filterable activity feed |
| GET | `/api/activity/[id]` | Admin | Detail + before/after for diff UI |
| GET | `/api/notifications` | Session user | Own inbox (unread-first) |
| PATCH | `/api/notifications/[id]/read` | Owner | Mark one read |
| PATCH | `/api/notifications/read-all` | Owner | Mark all read |
| GET | `/api/notification-preferences` | Session user | Prefs (+ defaults merged) |
| PUT | `/api/notification-preferences` | Session user | Upsert category toggles |

**Filters for `GET /api/activity`:** `category`, `actionType` (or verb group), `actorUserId`, `from`/`to`, `entityType` + `entityId`, `q` (entity_label search), `page`/`limit`.

Keep existing dashboard GETs either proxied to new tables or updated to query `activity_log` / enhanced `notifications` so widgets stop reading empty legacy shapes incorrectly.

---

## 9. UI plan (Phases 4–5) — brief

### Phase 4 — Bell & settings

- Admin bell: unread badge (real count), dropdown (recent 10), mark all read, link to inbox page, empty state.
- Settings: replace coarse toggles with **per-category** In-app / Email switches; optimistic save via `PUT /api/notification-preferences`.
- Rename current `/admin/notifications` ops page → **Email Reminders** (or similar) to avoid collision.

### Phase 5 — Recent Activity

- New primary page: `/admin/activity` (can redirect old `/admin/activity-logs`).
- Filters as listed; expandable row or detail drawer with **field-level diff** (not raw JSON).
- Link to entity via `metadata.link` or reconstructed path from `entity_type`/`entity_id`.

---

## 10. Phase 3 rollout order (after approval)

Wire one module at a time; after each: perform action → confirm `activity_log` row → confirm `notifications` row (or absence if category OFF).

1. **Tenants** (create/update/delete) — highest visibility smoke test  
2. **Payments**  
3. **Invoices**  
4. **Maintenance**  
5. **Buildings / Rooms / Assign**  
6. **Reservations / Leases**  
7. **Expenses**  
8. **Utilities / Meters**  
9. **Documents**  
10. **Assets**  
11. **Bulk / System**

---

## 11. Decisions needed from you before coding

Please reply with approvals/edits on:

1. **Table strategy** — OK to add `activity_log` + `notification_preferences` and **ALTER** existing `notifications`? (vs. all-new names)
2. **Category list** — OK as in §3, or merge/split (e.g. fold `buildings` into `tenants`)?
3. **Action taxonomy** — any verbs to add/rename before we lock strings?
4. **Default prefs** — OK with §5 matrix?
5. **Tenant scope** — notifications-only for own entities; **no** full activity feed for tenants?
6. **Self-notify** — should the actor receive an in-app notification for their own action?
7. **Soft-fail logging** — CRUD succeeds even if `logActivity` fails?
8. **Rename** email ops page away from `/admin/notifications`?

---

## 12. Out of scope for first implementation (explicit)

- Actually sending preference-driven emails (stub only)
- Migrating historical data into `activity_log` (there is none)
- Rewriting email reminder SQL jobs
- Staff role (DB currently admin/tenant)
- Real-time websockets; polling / refetch on focus is enough initially

---

**Next step:** Your review of this plan. No migrations or route wiring until you say go.
