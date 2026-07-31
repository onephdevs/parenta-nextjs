# REFACTOR_NOTES.md

Notes captured during the shared UI component refactor (Phase 3).  
These are **not** fixed in the UI extraction PRs unless separately approved.

## Status

**Phase 3 complete** (2026-07-26): foundation primitives + admin/tenant/auth shells + feature forms, lists, filters, managers, uploads, and report pages migrated to shared `ui/` / `forms/` / `domain/` / `layout/`.

## Toast unification

- Removed `react-hot-toast` `<Toaster />` from root layout.
- `hooks/useNotifications` wraps `NotificationContext` (compatible API).
- Removed nested `NotificationProvider` + duplicate `ToastContainer` from `AdminLayoutClient`.
- Prefer `@/hooks/useNotifications` over `@/context/NotificationContext` in feature/app code.
- Infrastructure still imports context directly: `Providers`, `Toast`, `ToastContainer`, `hooks/useNotifications`.

## Intentional visual / domain changes

- Admin primary CTA: purple (`Button` primary). Was blue in some forms (utility bills, meter readings, tenant payment CTAs historically).
- Tenant portal CTAs: `Button variant="success"` (green).
- Admin sign-in submit: purple (was blue).
- `RoomStatusBadge`: vacant → success (green); occupied → info (blue). Intentional domain standardization.
- Deposit radio groups in room forms: remain native (no Radio primitive yet).

## Pre-existing issues left alone (not UI-refactor scope)

- NextAuth `session.user.role` / `id` typing gaps across pages and APIs.
- Payments list: `payment.status` / `payment.type` vs typed `paymentStatus` / `paymentType`.
- `DocumentUpload` requires `tenantId` but admin documents page used it without (still typed as required).
- `EditRoomForm` / `CreateRoomData` deposit typing mismatches.
- `DocumentTemplateManager` variable types omit `textarea`/`select`/`options` in the TS model (runtime still supports them).
- Various API/model shape mismatches (expense summary fields, tenant stats, etc.).

## Residual / deferred (low priority)

- No shared `Radio` primitive — room deposit radios stay native.
- `Pagination` still uses `next/navigation` inside `ui/` (plan exception).
- Settings custom toggle switches kept (not Checkbox) where on/off chrome is intentional.
- Display-only cards/charts (`RoomCard`, dashboards, image galleries) may still use local Tailwind for layout chrome; interactive controls should use shared primitives.
- `Dialog` overlay offsets for admin sidebar (`lg:left-64`); tenant modals often use local overlays instead.

## Migration inventory (high level)

| Area | Migrated |
|------|----------|
| Primitives | Button, IconButton, Input, Select, Textarea, Checkbox, Card, StatCard, Badge, Alert, EmptyState, Tabs, Dialog, ConfirmDialog, … |
| Domain | Status badges (payment, invoice, room, tenant, asset, condition, maintenance, reservation) |
| Layout/forms | PageHeader, FormField, FormErrorBanner |
| CRUD forms | Buildings, rooms, tenants, invoices, payments, expenses, assets, documents |
| Utility | UtilityBillForm, RoomUtilityBillForm, MeterReadingForm, cost-allocation, deposit config |
| Managers | Assignment, credits, ledger, categories, late fees, bulk ops, templates, export, QR |
| Tenant | Profile, payments, deposits, maintenance, documents, reports, occupants, uploads |
| Auth | Sign-in variants, AuthForm, forgot-password |
| Reports | Admin report filter bars + tenant report/payment/document filters |
