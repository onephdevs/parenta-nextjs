---
# Job: Generate all rent invoices for the month

**Replaces:** Copying one Excel rent row per occupied unit at period start.

**Who does this:** Admin

**When:** You would otherwise click **Create Invoice** once per tenant. Not in the sidebar — `/admin/bulk-operations` (linked from History import).

## Steps
1. Open **Bulk Operations** (`/admin/bulk-operations`). Tab **Generate Invoices**.
2. Set **Target Month**. Optional **Building Filter (Optional)**.
3. Click **Generate Invoices for All Tenants**.

## Also on this page
- Link **History import**.
- Tabs: **Generate Invoices**, **Import Payments**, **Update Tenants**.
- **Import Payments** — CSV of payments.
- **Update Tenants** — tenant IDs + **New Status** **Active** / **Former / inactive**; **Update Tenant(s) to …**
- No search of a live invoice grid here — check **Invoices** after.

## Done when
After refresh, **Payments** → **Invoices** shows a rent invoice per active tenant for that month (skipping ones that already exist, if the tool is idempotent).

## Watch out for
Wrong **Target Month** bills the wrong period. This does not collect money. Prefer one-by-one **Create Invoice** if you only have a few rooms.

## Video
[link placeholder]
---
