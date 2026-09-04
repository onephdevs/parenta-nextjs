---
# Job: Issue this month’s rent invoices

**Replaces:** Writing a rent row in Excel so there is something to tick when money arrives.

**Who does this:** Office admin

**When:** Start of the billing period, before you collect rent. One invoice per tenant you expect to pay. To bill everyone at once, see **Generate all rent invoices for the month**.

## Steps
1. Sidebar **Payments** → **Invoices** (`/admin/financial/invoices`). Click **Create Invoice**.
2. **Tenant & Room:** **Tenant**, then **Room**. **Billing Period:** **Due Date** (required). Optional: **Billing Period Start**, **Billing Period End**.
3. **Invoice Items:** **Description**, **Type** (**Rent**, **Utilities**, **Fees**, **Deposit**, **Other**), **Quantity**, **Unit Price**. Click **Create Invoice**.

## Also on this page
**Invoice Management list**
- Description: **Create, track, and collect invoices**.
- Cards: **Paid Invoices**, **Unpaid Invoices**, **Overdue**, **Total Invoices**.
- **Search** — **Invoice #, tenant...**
- Filters: **Status** (**All Statuses**, **Draft**, **Sent**, **Paid**, **Overdue**, **Cancelled**); **Tenant** (**All Tenants**).
- Pagination 20 per page. No sort UI. No bulk. No export.
- Table: **Open an invoice from the View action.** Empty: **Get started by creating a new invoice**.

**Create Invoice form**
- Nav: **Tenant**, **Dates**, **Items**, **Notes**.
- **Add Item** / **Remove** for extra lines. **Notes** optional.
- **Cancel**.

**Invoice detail** (`/admin/financial/invoices/[id]`)
- **Back to invoices**. **Record Payment**. **Fully paid** (disabled when already paid). **View Tenant Profile**. **Print Invoice**.
- Sections: **Invoice Details**, **Line Items**, **Payment History**, **Status**, **Amount Summary**, **Invoice Statistics**, **Billing agreements**.
- **Negotiate due date** / **Save deadline**. **Discretionary discount** / **Apply discount**. Copy: **No late-fee penalties — agree a new deadline when rent is delayed, or apply a discretionary discount.**
- No edit-invoice form and no delete button on this screen (API exists; office UI does not).

**Related**
- **Collect rent** applies a payment to this invoice.
- Sidebar has no “bill all tenants” — that is **Bulk Operations** (`/admin/bulk-operations`).

## Done when
The invoice list shows the new row after refresh. **Collect rent** can attach a payment to it.

## Watch out for
**Please select a tenant**, **Please select a room**, **Please set a due date**, and valid item prices are required. Creating an invoice does not collect money.

## Video
[link placeholder]
---
