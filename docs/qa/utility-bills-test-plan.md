# QA test plan — Utility Bills

**Routes:** `/admin/bills-expenses/utility-bills`, `/admin/bills-expenses/utility-bills/new`, `/admin/bills-expenses/utility-bills/[id]`  
**Source:** `RoomUtilityBillForm.tsx`, list page, `POST/PUT/DELETE /api/utility-bills/room`  
**Training job:** [utility-bill.md](../training/utility-bill.md)

| # | Scenario | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- |
| 1 | Happy path: building-wide ₱4,800 electric bill, equal-split | **Utility Bills** → **Add Bill**. **Scope** Building-wide, **Building** prefer Balibago. **Utility Type** Electric, **Allocation method** Shared — manual split, **Equal-split** checked. Period start/end/due. **Amount** `4800` → **Create Bill**. | Toast **Utility bill created successfully**. List shows the bill. Child per-room shares exist; vacant rooms are owner-absorbed (`cost_bearer = OWNER`). | Critical |
| 2 | Required field validation: building, amount, and dates | Building-wide with no building. Amount empty. Dates empty → **Create Bill**. | **Building is required for building-wide bills**. **Amount must be greater than 0**. **Start date is required**, **End date is required**, **Due date is required**. Toast **Validation Error** / **Please fix the form errors**. | Critical |
| 3 | Invalid input: amount 0 and end date before start | Amount `0`. End date before start date. | **Amount must be greater than 0**. **End date must be on or after start date**. API: **Amount must be a positive number**; **Billing period end must be on or after start**. | Critical |
| 4 | Specific unit / room does not split | **Scope** Specific unit / room, pick a unit, amount `4800`, dates valid → **Create Bill**. | One bill for that room only (no child equal-split rows). | Important |
| 5 | Edit/update: Mark as Paid | On the list, **Mark as Paid** → confirm **Mark bill as paid?** | Confirm copy: **This marks the utility bill paid. It does not record a tenant payment.** Toast **Bill marked as paid**. Status **Paid**. | Important |
| 6 | Delete a parent bill also removes per-room shares | Create an equal-split bill. **Delete** → **Delete bill?** Reload. Check children via API `includeChildren`. | Toast **Bill deleted successfully**. Parent **and** `parent_bill_id` children are **hard-deleted**. Tenant’s equal-split charge disappears with the parent. (`tenant_utility_bills.utility_bill_id` is ON DELETE SET NULL for cost-allocation rows — different pipeline.) | Critical |
| 7 | No validation found — flag as bug: bill detail has no edit | Open `/admin/bills-expenses/utility-bills/[id]`. | Read-only **Overview**. **No edit / mark paid / delete on this page** (only the list). Not a missing validator — missing actions on detail. | Nice-to-check |
| 8 | Data persists correctly after a page refresh | Create bill, reload the list, search the building name. | Bill still listed with the same amount. | Critical |
| 9 | Permission check: utility-bills API is admin only | Unauthenticated `/admin/bills-expenses/utility-bills`. Tenant session on the same URL. Unauthenticated `POST /api/utility-bills/room`. | Pages redirect to sign-in. API **401 Unauthorized** (`role !== 'admin'`). | Critical |
| 10 | Search bills | `aria-label` **Search utility bills** — type Balibago / QA room. | Matching rows remain. | Important |
| 11 | Filter by building, utility type, and status | `#building`, `#utilityType` (Electricity/Water), `#status` (Pending/Paid). | Client + query filters apply. | Important |
| 12 | Export / sort on the list | Look for sort, bulk, Excel/PDF on this list. | **No sort. No bulk. No export or print** on the list (Reports under Bills & Expenses is a different screen). | Nice-to-check |
