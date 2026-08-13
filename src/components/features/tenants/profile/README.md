# Tenant Profile module

Alfonso-style tenant detail at `/admin/tenants/[id]`.

## Layout decisions

- **Left summary card stays mounted** across Profile / Lease / Financials / Documents and the Lease Details drill-down. Right panel content swaps; we do not remount the sidebar.
- **Lease Details is an in-page sub-view** (not a separate Next.js route) so the summary card never unmounts. `View` on Lease History sets local state; Back clears it and returns to the Lease tab.
- **Status badges are derived** from `tenant_room_assignments` (active stay / history), not a single stored “active/inactive” flag that can drift.
- **Financials / documents / occupants** load via existing APIs (`/api/invoices`, `/api/payments`, deposit/credits ledgers, `/api/documents`, `/api/occupants`). No duplicate Prisma models were introduced.

## Shared UI

Reusable primitives live under `src/components/ui/`: `ActionDropdown`, `StatusBadge`, `FileAttachmentChip`, `EditableSectionCard`, `StatBlock`, plus existing `Tabs` / `Pagination` / `Avatar` / `Badge`.
