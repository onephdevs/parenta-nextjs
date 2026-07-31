# AUDIT_COMPONENTS.md — Phase 1: Shared UI Component Audit

**Project:** parenta-nextjs  
**Date:** 2026-07-26  
**Scope:** `src/app/` (~71 pages) + `src/components/` (~127 feature/layout files)  
**Reference:** LikhaIt `frontend/src/vibes/` (Button, TextField, SelectBox, FormControl, Modal, ItemTable, Pagination)  
**Status:** Audit only — no code changes in this phase

---

## Executive summary

The app already has a thin `src/components/ui/` layer (12 files), but **almost nothing uses it**. Product UI is copy-pasted Tailwind across pages/features. LikhaIt’s `vibes/` pattern (small primitives + thin domain wrappers) is the right model; Parenta has the folder but not the discipline.

| Severity | Finding |
|----------|---------|
| **Critical** | Dual toast systems, both exported as `useNotifications` (react-hot-toast hook vs NotificationContext) |
| **Critical** | Shared `Button` imported in **2** files vs **~414** raw `<button>` elements |
| **High** | **Zero** shared Input / Select / Textarea / FormField — same purple input class pasted **~107×** |
| **High** | No Card / Table / Badge / Tabs / EmptyState / PageHeader / Avatar |
| **High** | `FullScreenModal` ≈ `AdminFullScreenModal` (near-duplicates) |
| **Scale warning** | Migrating everything touches **~100–120+ TSX files**. Recommend scoping Phase 3 to **admin first**, then tenant/auth. |

**Brand inconsistency:** Shared `Button` primary = **blue-600**. Dominant admin CTAs = **purple-600**. Reports/auth often blue. Phase 2 must pick one primary (recommend **purple** to match current admin chrome).

---

## Existing `src/components/ui/` inventory

| File | Purpose | Actually reused? | Prop API quality |
|------|---------|------------------|------------------|
| `Button.tsx` | Variants primary/secondary/outline/ghost; sizes; loading | **No** — 2 imports (`AuthForm`, `LogoutButton`) | Decent API; wrong brand color vs product |
| `Breadcrumb.tsx` | Crumbs + `h1` + actions slot | Partial — ~5 building/room pages | Couples crumbs + page title |
| `ConfirmDialog.tsx` | Centered confirm (danger/warning/info) | **Underused** — ~2 feature callers; many reinvent with `confirm()` or local overlays | Good |
| `FullScreenModal.tsx` | Form modal inset past sidebar | Partial — Add/Edit building/room, convert reservation | Good |
| `AdminFullScreenModal.tsx` | Same as FullScreenModal | 1 caller (CreateReservation) | **Duplicate — merge** |
| `Pagination.tsx` | URL/`searchParams` page links | 3 pages (buildings/rooms/tenants) | Good for SSR; no `onPageChange` for client lists |
| `Toast.tsx` / `ToastContainer.tsx` | Custom toast cards | Used via NotificationContext in admin layout | Conflicts with react-hot-toast |
| `Skeleton.tsx` / `SkeletonCard` / `SkeletonList` / `SkeletonTable` | Loading placeholders | ~15 consumers; ~27 files still hand-roll `animate-pulse` | Good |

**Missing from ui/ (needed):** Input, Select, Textarea, Checkbox, Label, FormField, Card, StatCard, Table, Badge, Tabs, EmptyState, Alert/Banner, Avatar, PageHeader, IconButton, Dialog (centered, not fullscreen).

---

## Pattern catalog

### 1. Buttons

| Metric | Count |
|--------|------:|
| Raw `<button` elements | ~414 |
| Files with `<button` | ~116 |
| Imports of `@/components/ui/Button` | **2** |
| `bg-purple-600` (mostly CTAs) | ~105 matches / 67 files |
| Outline `inline-flex … border-gray-300` | ~57 / 29 files |
| `disabled:opacity-50` | ~121 / 62 files |
| `animate-spin` (loading) | ~67 / 56 files |

**Variations found:**
1. Admin purple primary (`inline-flex px-4 py-2 bg-purple-600 … focus:ring-purple-500`) — ~28–37 files
2. Gray outline secondary — ~29 files
3. Blue primary (auth, reports, older forms) — ~41 files with `bg-blue-600`
4. Danger solid `bg-red-600` / danger outline `border-red-300 text-red-700`
5. Compact `px-3 py-1` / icon-only (Eye/Edit/Trash in tables)
6. Shared `Button` (blue) — AuthForm only
7. ConfirmDialog’s own button styles (ring-inset cancel)

**Recommendation:** Extend `ui/Button` with `variant: primary | secondary | outline | ghost | danger | success`, make `primary` = purple; add `isLoading`, `isDisabled` aliases or standardize on `loading`/`disabled`; add `IconButton`. Migrate CTAs section-by-section.

---

### 2. Form inputs

| Element | Matches | Files |
|---------|--------:|------:|
| `<input` | ~333 | ~76 |
| `<select` | ~144 | ~68 |
| `<textarea` | ~35 | ~33 |
| checkbox / radio / file | ~27 / 7 / 6 | — |

**Shared Input/Select/Textarea/FormField:** **none**.

**Dominant duplicated class (Variant A):**  
`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent` — **~107× across 13 files** (modals/forms for buildings, rooms, invoices, reservations, documents).

Other variants: blue ring (auth/assets/maintenance), `rounded-lg`, auth `pl-10` icon inputs, shadow-sm purple.

**Label/error:**
- Labels: ~497; many without `htmlFor`
- Field-level `errors.x` + red text: ~7 richer forms (`TenantForm`, `PaymentForm`, `ExpenseForm`, …)
- Form-level `bg-red-50` banners: ~63 matches

**Recommendation:** Add `Input`, `Select`, `Textarea`, `Checkbox`, `FormField` (label + control + error + hint). Default focus ring = purple.

---

### 3. Cards / panels / section containers

| Pattern | Approx |
|---------|--------|
| `bg-white` + `shadow` + `rounded-lg` | ~80–90 files |
| Dashboard metric grids (4-col) | ~15+ admin pages |
| Feature-local stats: `AssetStatsCards`, `UtilityStatsCards`, local `StatCard` | 3+ implementations |

**No shared `Card` / `StatCard`.**

**Recommendation:** `Card`, `CardHeader`, `CardBody`, `StatCard` (icon + title + value + subtitle).

---

### 4. Tables vs lists

| Pattern | Approx |
|---------|--------|
| `<table` with `min-w-full divide-y` | ~28–29 files |
| `overflow-x-auto` wrappers | ~28 |
| Shared DataTable | **0** |
| Card/list UIs (`BuildingCard`, `RoomCard`, `TenantCard`) | domain-specific |

Nearly identical thead/tbody/hover-row recipes in: TenantsList, RoomsList, AssetsList, DocumentsList, UtilityBillsList, ReservationsList, report pages, tenant payments.

**Recommendation:** Presentational `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableCell` + optional `DataTable` shell (toolbar slot, empty state). Keep domain row content in features.

---

### 5. Modals / dialogs

| Component | Usage |
|-----------|--------|
| `FullScreenModal` | ~4 feature modals |
| `AdminFullScreenModal` | 1 (duplicate of above) |
| `ConfirmDialog` | ~2 |
| Local `fixed inset-0` overlays | ~24 |
| Named `*Modal.tsx` files | ~10 |
| Native `confirm()` / `window.alert` | scattered |

**Recommendation:** Merge FullScreen twins → one `FullScreenModal`. Keep `ConfirmDialog`. Add centered `Dialog`/`Modal` for small forms (assets add, categories). Escape + focus trap a11y required.

---

### 6. Toasts / alerts / banners

| System | Location | Consumers |
|--------|----------|-----------|
| **A** react-hot-toast via `hooks/useNotifications.ts` | root `Toaster` in `app/layout.tsx` | ~36 files |
| **B** NotificationContext + `Toast`/`ToastContainer` | AdminLayoutClient | ~33 files |
| Inline banners `bg-{green,red,yellow,blue}-50` | pages/forms | ~75 files |

**Both hooks are named `useNotifications` — naming collision / confusion risk.**

**Recommendation (Phase 2 decision):** Pick **one** stack (prefer NotificationContext for title+message+loading update, or hot-toast for simplicity). Add `Alert`/`Banner` for inline form/page messages. Unify import path.

---

### 7. Badges / status pills

| Metric | Approx |
|--------|--------|
| Files with `bg-*-100 text-*-800` status styling | ~53 |
| Local `getStatusColor` / `statusColors` maps | ≥8 |

Domains: invoice, payment, room, tenant, asset, maintenance, reservation, export job.

**Recommendation:** Generic `Badge` + domain wrappers (`PaymentStatusBadge`, `InvoiceStatusBadge`, `RoomStatusBadge`, `MaintenanceStatusBadge`, `AssetStatusBadge`, `ReservationStatusBadge`).

---

### 8. Page headers

| Pattern | Approx |
|---------|--------|
| `h1` text-2xl/3xl + subtitle + action row | ~45–52 |
| `Breadcrumb` component | ~5 pages |
| Admin layout already has top breadcrumb bar | all admin |

**Recommendation:** `PageHeader` (`title`, `description`, `actions`, optional `breadcrumbs`). Stop duplicating white-shadow header chrome inside pages when layout already provides nav.

---

### 9. Empty / loading / error states

| Pattern | Approx |
|---------|--------|
| Skeleton* consumers | ~15 |
| Hand-rolled `animate-pulse` | ~27 |
| “No … found/available/yet” empties | ~43 |
| Route `loading.tsx` | 3 (buildings, tenants, documents) |
| Route `error.tsx` | **0** |

**Recommendation:** `EmptyState` (icon, title, description, action); push Skeleton adoption; add `error.tsx` later (out of scope for pure UI extract — log in REFACTOR_NOTES).

---

### 10. Avatar / user info

| Sites | Files |
|-------|--------|
| Initials avatars | TenantsList, TenantCard, ProfileClient, AdminLayoutClient, tenant dashboard |

**Recommendation:** `Avatar` (`name` | `src` | `size`).

---

### 11. Pagination

| Mode | Usage |
|------|--------|
| Shared URL `Pagination` | buildings, rooms, tenants pages |
| Inline Prev/Next | AssetsList, DocumentsList, UtilityBillsList, UtilitiesDashboard, TenantUtilityBills |

**Recommendation:** Extend Pagination with `mode: 'url' | 'controlled'` + `onPageChange`.

---

### 12. Tabs

| Pattern | Approx |
|---------|--------|
| Inline `activeTab` + `border-b-2` nav | ~12 files |

AssetsDashboard, PaymentGatewayManager, AdvancedFinancialDashboard, SettingsClient, analytics page, tenant payments, etc.

**Recommendation:** `Tabs` / `TabList` / `Tab` / `TabPanels`.

---

## Master audit table

| Pattern | # duplicate implementations (approx) | Files affected (approx) | Existing shared component | Recommendation |
|---------|--------------------------------------|-------------------------|---------------------------|----------------|
| Buttons (CTA / outline / danger / icon) | 6–8 visual styles; ~414 inline | ~116 | `ui/Button` (unused) | Extend + migrate; add IconButton |
| Text inputs | 4–5 class variants; ~333 inputs | ~76 | **None** | Add Input/Select/Textarea/Checkbox |
| Form field (label+error+hint) | 2 error UX styles | ~68 labels files | **None** | Add FormField (+ forms/) |
| Cards / panels | ~80–90 | ~80–90 | **None** | Add Card |
| Stat/metric cards | ~15+ grids + 3 feature suites | ~20 | Feature-only | Add StatCard |
| Tables | ~28–29 identical shells | ~28–29 | SkeletonTable only | Add Table primitives |
| Modals (fullscreen) | 2 near-identical + local | ~15 | FullScreen + AdminFullScreen | Merge → one |
| Dialogs / centered overlays | ~24 local + ConfirmDialog | ~30 | ConfirmDialog (underused) | Add Dialog; adopt ConfirmDialog |
| Toasts | **2 systems** | ~69 | Toast* + hot-toast | Unify to one |
| Inline alerts/banners | ~75 | ~50+ | **None** | Add Alert |
| Status badges | ≥8 color maps | ~53 | **None** | Badge + domain wrappers |
| Page headers | ~45–52 | ~45–52 | Breadcrumb (partial) | Add PageHeader |
| Empty states | ~43 ad hoc | ~43 | **None** | Add EmptyState |
| Loading skeletons | shared + ~27 inline | ~40 | Skeleton* | Adopt Skeleton*; keep |
| Avatar | ~4–5 | ~5 | **None** | Add Avatar |
| Pagination | 1 shared + ~5 inline | ~8 | Pagination (URL-only) | Extend for client lists |
| Tabs | ~12 | ~12 | **None** | Add Tabs |

---

## LikhaIt `vibes/` mapping (reference)

| LikhaIt vibes | Parenta equivalent (proposed) |
|---------------|-------------------------------|
| `Button` | `ui/Button` (extend) |
| `TextField` | `ui/Input` |
| `SelectBox` | `ui/Select` |
| `FormControl` | `forms/FormField` |
| `Modal` | `ui/Dialog` (+ keep FullScreenModal for large forms) |
| `ItemTable` / `ColumnBase` | `ui/Table` (+ domain columns) |
| `Pagination` | `ui/Pagination` (extend) |
| *(domain in `components/`)* | `components/domain/` + keep `features/` for heavy screens |

---

## Scope recommendation (before Phase 3)

Duplication is **deeper than a small PR**:

- ~116 files with buttons  
- ~76 with inputs  
- ~80+ with cards  
- ~71 app pages  

**Ask before Phase 3:** proceed with **admin-only first** (highest ROI: buildings → rooms → tenants → financial lists), then tenant portal, then auth? Full-repo migration in one PR is not reviewable.

---

## Next step

See **COMPONENT_PLAN.md** for proposed folder structure, prop APIs, a11y requirements, and migration order. **Do not start Phase 3 until that plan is approved.**
