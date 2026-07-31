# COMPONENT_PLAN.md — Phase 2: Shared Component Layer Design

**Status:** Phase 3 **complete** (foundation + shells + feature forms/lists/filters/managers)  
**Companion:** `AUDIT_COMPONENTS.md`  
**Inspiration:** LikhaIt `frontend/src/vibes/` — primitives in one folder, domain composites consume them

**Decisions locked:** purple primary (admin/auth); tenant CTAs use `success` (green); NotificationContext toasts via `@/hooks/useNotifications`.  
**See:** `REFACTOR_NOTES.md` for residuals and intentional visual deltas.  

---

## Goals

1. One place to change button/input/card/table look-and-feel.
2. Pages and feature modules **compose** primitives; they do not re-declare Tailwind recipes.
3. `ui/` stays dumb (no fetch, no routes). Next.js-specific behavior lives in `layout/` or via composition (e.g. wrap Button in `Link` outside ui/).
4. Strict TypeScript props; consistent naming across the layer.

---

## Naming conventions (locked for the whole layer)

| Concern | Prop name | Notes |
|---------|-----------|--------|
| Visual style | `variant` | Never `type` / `kind` / `color` for style |
| Size | `size` | `'sm' \| 'md' \| 'lg'` (Avatar may add `'xs'`) |
| Loading | `isLoading` | Prefer over `loading` going forward; Button will accept both during migration (`loading` deprecated alias) |
| Disabled | `isDisabled` | Alias to native `disabled`; both accepted on form controls |
| Open state | `isOpen` | Modals/dialogs/tabs controlled mode |
| Extra classes | `className` | Always optional; merged with `cn()` |
| Children | `children` | Typed `React.ReactNode` |
| Test id | `data-testid` | Optional on interactive primitives |

**Brand token decision (needs your OK):**  
Admin chrome is purple today. Shared `Button` primary is blue.  
**Proposal:** `variant="primary"` → **purple-600 / purple-700** (match admin). Keep `variant="info"` or secondary blue only if reports need it — otherwise use `outline` / `secondary`.

Until design tokens exist in `@theme`, map variants to existing Tailwind classes (`purple-600`, `gray-300`, `red-600`, etc.) already used in the app. Later, promote to CSS variables in `globals.css`.

---

## Proposed folder structure

```
src/components/
├── ui/                          # Primitives — no business logic, no next/link/next/navigation
│   ├── index.ts                 # barrel exports
│   ├── Button.tsx               # extend existing
│   ├── IconButton.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Textarea.tsx
│   ├── Checkbox.tsx
│   ├── Label.tsx
│   ├── Card.tsx                 # Card, CardHeader, CardBody, CardFooter
│   ├── StatCard.tsx
│   ├── Badge.tsx
│   ├── Alert.tsx
│   ├── Avatar.tsx
│   ├── Table.tsx                # Table, TableHeader, TableBody, TableRow, TableHead, TableCell
│   ├── Tabs.tsx                 # Tabs, TabList, Tab, TabPanel
│   ├── Dialog.tsx               # centered modal
│   ├── FullScreenModal.tsx      # keep; delete AdminFullScreenModal after merge
│   ├── ConfirmDialog.tsx        # keep; align button props with ui/Button
│   ├── EmptyState.tsx
│   ├── Pagination.tsx           # extend existing
│   ├── Skeleton.tsx             # keep suite
│   ├── SkeletonCard.tsx
│   ├── SkeletonList.tsx
│   ├── SkeletonTable.tsx
│   ├── Toast.tsx                # keep after toast unification decision
│   └── ToastContainer.tsx
│
├── forms/                       # Composed form patterns
│   ├── FormField.tsx            # label + control slot + error + hint
│   └── FormErrorBanner.tsx      # top-of-form bg-red-50 pattern
│
├── layout/                      # Already exists — extend
│   ├── AdminLayoutClient.tsx
│   ├── AdminSidebar.tsx
│   ├── PageHeader.tsx           # NEW
│   └── Breadcrumb.tsx           # MOVE from ui/ OR re-export (layout owns nav chrome)
│
├── domain/                      # Thin wrappers around ui/ — status maps only
│   ├── PaymentStatusBadge.tsx
│   ├── InvoiceStatusBadge.tsx
│   ├── RoomStatusBadge.tsx
│   ├── TenantStatusBadge.tsx
│   ├── AssetStatusBadge.tsx
│   ├── MaintenanceStatusBadge.tsx
│   └── ReservationStatusBadge.tsx
│
└── features/                    # Keep — heavy screens; gradually consume ui/ + domain/
```

**LikhaIt parallel:** `vibes/` ≈ `ui/` + `forms/`; LikhaIt `components/` ≈ our `features/` + `domain/`.

---

## Component specs

### 1. `Button`

**Replaces:** ~414 inline buttons; extends existing `ui/Button`.

```ts
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** @deprecated use isLoading */
  loading?: boolean;
  isDisabled?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Optional leading icon node */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

**A11y:** native `<button>`; when `isLoading`, set `aria-busy` and keep focusable disabled semantics; visible spinner + do not remove label text (or swap to “Saving…” via children from caller).

**No `next/link` inside.** For link-looking CTAs: `<Link href="…"><Button asChild>` **or** (simpler, avoid radix): pages wrap with Link and style via `Button` rendered as child — prefer:

```tsx
// Call site
<Link href="/admin/tenants/new" className="…">
  <Button variant="primary">Add Tenant</Button>
</Link>
```

If we need a single control: optional later `href` prop living in `layout/LinkButton.tsx`, not in `ui/Button`.

---

### 2. `IconButton`

**Replaces:** table action Eye/Edit/Trash icon buttons.

```ts
interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'children'> {
  variant?: 'ghost' | 'outline' | 'danger' | 'primary';
  size?: 'sm' | 'md';
  label: string; // required — becomes aria-label
  isDisabled?: boolean;
  isLoading?: boolean;
  children: React.ReactNode; // icon only
}
```

**A11y:** `aria-label={label}` required; tooltip via `title={label}` optional.

---

### 3. `Input` / `Select` / `Textarea` / `Checkbox`

**Replaces:** Variant A purple inputs (~107×), blue/auth variants via `variant` or className override.

```ts
type FieldSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'disabled'> {
  size?: FieldSize;
  isDisabled?: boolean;
  isInvalid?: boolean; // applies red border
  className?: string;
}

// SelectProps, TextareaProps analogous (Textarea: rows)
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'disabled'> {
  isDisabled?: boolean;
  label?: React.ReactNode; // optional adjacent label
}
```

Default classes match current purple focus ring. `isInvalid` → `border-red-300 focus:ring-red-500`.

**A11y:** callers associate via `FormField` `htmlFor` / `id`; Checkbox with `label` wraps or uses `aria-labelledby`.

---

### 4. `FormField` (`forms/`)

**Replaces:** duplicated label + error + helper markup; mirrors LikhaIt `FormControl`.

```ts
interface FormFieldProps {
  label?: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode; // the Input/Select/Textarea
  className?: string;
}
```

Renders: label (with required asterisk) → children → hint OR error (`role="alert"` when error).

---

### 5. `FormErrorBanner` (`forms/`)

**Replaces:** `bg-red-50` top-of-form banners.

```ts
interface FormErrorBannerProps {
  title?: string;
  message: string;
  className?: string;
}
```

---

### 6. `Card` + `StatCard`

**Replaces:** ~80–90 white shadow panels; ~15+ metric grids.

```ts
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'purple' | 'blue' | 'green' | 'yellow' | 'red';
  className?: string;
}
```

---

### 7. `Badge`

**Replaces:** ad hoc `rounded-full px-2 py-1 bg-*-100` pills.

```ts
type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  className?: string;
}
```

Domain wrappers map status strings → `tone` + label (capitalize). Example:

```ts
// domain/PaymentStatusBadge.tsx
export function PaymentStatusBadge({ status }: { status: string }) {
  const tone = mapPaymentStatus(status); // paid→success, pending→warning, …
  return <Badge tone={tone}>{formatLabel(status)}</Badge>;
}
```

---

### 8. `Alert`

**Replaces:** inline success/error/info banners on pages (not toasts).

```ts
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}
```

**A11y:** `role="status"` for info/success; `role="alert"` for danger/warning.

---

### 9. `Table` primitives

**Replaces:** repeated `min-w-full divide-y` shells (~28 files).

```ts
// Compound components — presentational only
Table, TableHeader, TableBody, TableRow, TableHead, TableCell
// Table wraps overflow-x-auto + table element
```

Optional later (Phase 3b, not required for first pass): `DataTable` with `columns`/`data` — **defer** to avoid over-engineering; start with compound primitives so list UIs stay flexible.

---

### 10. `EmptyState`

```ts
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode; // typically a Button
  className?: string;
}
```

---

### 11. `Tabs`

```ts
interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}
// TabList, Tab (value, children), TabPanel (value, children)
```

**A11y:** `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`, arrow-key navigation (basic).

---

### 12. `Dialog` (centered) + `FullScreenModal` + `ConfirmDialog`

| Component | Use when |
|-----------|----------|
| `Dialog` | Small forms (add asset, category), detail peek |
| `FullScreenModal` | Large multi-section forms (building/room/reservation) |
| `ConfirmDialog` | Destructive / irreversible confirms |

**Merge:** Delete `AdminFullScreenModal`; re-export `FullScreenModal` as alias during migration.

```ts
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}
```

**A11y (all modals):** Escape closes; overlay click closes (configurable); `role="dialog"` + `aria-modal`; focus trap (lightweight); restore focus on close; body scroll lock.

---

### 13. `Pagination`

**Extend existing:**

```ts
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  mode?: 'url' | 'controlled'; // default 'url' for backward compat
  onPageChange?: (page: number) => void; // required when mode=controlled
  className?: string;
}
```

**Note:** URL mode uses `next/navigation` — acceptable in Pagination **or** split `PaginationLinks` (layout) vs presentational `PaginationControls` (ui). Prefer: keep Next.js in current Pagination file but document it as the only ui/ exception, **or** move URL Pagination to `layout/Pagination.tsx` and leave presentational controls in ui/. **Proposal:** move URL-aware component to `layout/UrlPagination.tsx`; `ui/Pagination` is controlled-only (buttons). Re-export for compatibility.

---

### 14. `PageHeader` (`layout/`)

```ts
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}
```

Does **not** duplicate AdminLayout breadcrumbs (already in top bar). Optional secondary crumbs only on deep detail pages via existing Breadcrumb.

---

### 15. `Avatar`

```ts
interface AvatarProps {
  name: string; // used for initials + aria-label
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

---

### 16. Toast unification (decision required)

**Option A (recommended):** Keep NotificationContext + ToastContainer as the single admin system; rewrite `hooks/useNotifications.ts` to re-export context API (or delete hook and fix imports). Remove react-hot-toast from layout when unused.

**Option B:** Standardize on react-hot-toast; delete custom Toast UI.

**Phase 3 must not leave both.** Please pick A or B in your go-ahead.

Temporary Phase 3 rule: new code uses **one** import path: `@/hooks/useNotifications` after it becomes a thin wrapper over the chosen system.

---

## What each primitive replaces (Phase 1 crosswalk)

| New / extended component | Replaces (from audit) |
|--------------------------|----------------------|
| Button + IconButton | Purple/blue/outline/danger CTAs; table icon actions |
| Input/Select/Textarea/Checkbox | ~333/~144/~35 inputs; Variant A class string |
| FormField + FormErrorBanner | Label/error/hint + red banners |
| Card + StatCard | White panels + metric grids; eventually AssetStatsCards layout |
| Table* | List table shells in features + report pages |
| Badge + domain/* | Local status color maps |
| Alert | Inline page banners |
| EmptyState | “No X found” blocks |
| Tabs | ~12 activeTab navs |
| Dialog | Local centered `fixed inset-0` forms |
| FullScreenModal (merged) | FullScreen + AdminFullScreen |
| ConfirmDialog | `window.confirm` + one-off delete modals (gradual) |
| Pagination (extended) | Inline Prev/Next in Assets/Documents/Utilities lists |
| PageHeader | Repeated h1 + subtitle + action rows |
| Avatar | Initials circles in list/profile/layout |
| Toast unify | Dual useNotifications |

---

## Migration order (Phase 3 — only after approval)

Commit after each section. No business-logic changes. Bugs → `REFACTOR_NOTES.md`.

### Recommended scope: **Admin first**

| Step | Section | Why |
|------|---------|-----|
| 0 | Build/extend ui/ primitives + forms/ + domain badges (no page swaps yet) | Foundation |
| 1 | Toast unification (mechanical import fix) | Unblocks consistent feedback |
| 2 | `admin/buildings/` (+ Add/Edit modals) | Clear FullScreen + forms |
| 3 | `admin/rooms/` | Same patterns |
| 4 | `admin/tenants/` (+ reservations) | Highest traffic |
| 5 | `admin/financial/` list pages (invoices, payments, expenses) | Repeated header+stats+table |
| 6 | `admin/documents`, `maintenance`, `assets`, `utilities`, reports | More lists/tabs |
| 7 | Tenant portal | Different accent (green) — map primary carefully |
| 8 | Auth pages | Blue CTAs — decide if auth keeps blue via `variant` or aligns purple |

**Stop and re-scope** if any single step exceeds ~25 files without a clean commit boundary.

---

## Out of scope for this refactor

- Changing API routes, Prisma/SQL, auth rules
- Redesigning the product visually (new colors beyond unifying purple primary)
- Building a full design-system docs site
- Converting all tables to a headless data-grid library
- Fixing functional bugs found mid-migration (log only)

---

## Accessibility checklist (apply to every interactive primitive)

- [ ] Buttons/inputs have discernible names (visible text or `aria-label`)
- [ ] FormField associates `label.htmlFor` with control `id`
- [ ] Errors announced (`role="alert"` / `aria-describedby`)
- [ ] Dialogs: Escape, focus trap, `aria-modal`, restore focus
- [ ] Tabs: keyboard arrows + `aria-selected`
- [ ] Icon-only controls: required `label` prop
- [ ] Loading buttons: `aria-busy`, not silently emptied

---

## Decisions needed from you before Phase 3

1. **Primary brand color:** Approve purple as `Button` `primary`? (Recommended: yes)
2. **Toast system:** Option A (NotificationContext) or B (react-hot-toast)?
3. **Phase 3 scope:** Admin-only first, or full repo?
4. **Pagination placement:** URL pagination in `layout/` vs exception inside `ui/`?
5. **Any primitives to defer?** (e.g. skip Tabs/Avatar in first PR)

---

## Approval gate

Phase 3 was approved and completed. Locked decisions and residuals live in `REFACTOR_NOTES.md`.  
Next work (if any): Radio primitive, typing pass for NextAuth/session models, or visual QA on high-traffic flows.
