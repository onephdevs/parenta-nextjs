---
# Job: Collect rent (record a payment against an invoice)

**Replaces:** GCash screenshot in Messenger, then a tick on the Excel ledger.

**Who does this:** Office admin / Owner

**When:** You received cash, GCash, Maya, bank, or cheque in the office and need it on the books. If the tenant uploaded a receipt, use **Confirm a tenant’s uploaded GCash receipt** instead.

## Steps
1. Sidebar **Payments** (`/admin/financial/payments`). Click **Process Payment**. Choose **Property**, optional **Room**, then **Tenant**. Click **Continue**.
2. **1. Select invoice to pay** — click one invoice row. **2. Enter payment details:** **Mode of Payment** (**Cash**, **Cheque**, **Bank transfer**, **GCash**, **Maya**, **Other**), **Payment Date**, **Amount Received**. Optional: **OR Date**, **Notes (optional)**, **Upload Proof of Payment** (**Take photo** or **Choose file**).
3. Click **Confirm Payment**, then **Yes, Confirm Payment**.

## Also on this page
**Payments list**
- Description: **Review tenant receipts, confirm collections, and follow up on open invoices.**
- Banner if pay details missing: **Tenant Pay now is blocked** → **Add tenant pay details**.
- Cards: **Outstanding**, **Collected**, **Overdue**, **Pending verification**.
- **Pending verification** — receipts waiting for office confirmation. Badge **Pending**. Open a row to **Confirm payment** / **Reject** (see confirm-receipt). Empty: **No payments waiting for verification.**
- **Search** — **Tenant, unit, or invoice**.
- Filters: **Due date** (**Upcoming month**, **Overdue**, **This week**, **This month**, **Next 30 days**, **Past due dates**, **All due dates**); **Property** (**All properties**); **Type** (**All types**, **Rent**, **Utilities**, **Deposit**, **Penalty**, **Other**); **Status** (**All statuses**, **Unpaid**, **Partially paid**, **Paid**, **Overdue**); **Payment period**.
- Table **Collections**. Row statuses: **Paid**, **Partially paid**, **Overdue**, **Unpaid**.
- Pagination 10 per page (**Previous** / **Next**).
- No column sort. No bulk actions. No export. No Clear filters button.
- Empty: **Process Payment**.

**Process Payment** (`/admin/financial/payments/new`)
- One invoice at a time (**Only one invoice can be selected for payment at a time.**).
- Empty invoices: **No unpaid invoices for this tenant.**
- **OR No.** is filled for you (read-only).
- Checkbox **Send receipt to tenant via email** (on by default). **Preview receipt**. **Back**.
- Sidebar: **Tenant Information**, **Recent Payments** / **See all**.

**Payment receipt** (`/admin/financial/payments/[id]`)
- **← Back to payments**.
- **Refund** — keeps the row as **Refunded** and restores the invoice. Later pay = new payment. Confirm: **Refund this payment?**
- **Void** — removes a mistake. Confirm: **Void this payment?** Cannot be undone.
- **Download** (receipt). **Download proof** if a photo was uploaded.
- **Payment notes** / **Add note**.
- Pending claims: **Awaiting verification**, **Tenant conversation** (**Message the tenant…**).
- **View tenant profile**.

**Other ways in**
- Dashboard / property / room rail **Record Payment** or **Make Payment** opens the same form.
- Invoice detail **Record Payment**. Tenant profile **Pay** → **Regular Payment**.

## Done when
You land on the payment receipt. After refresh, **Payments** shows **Paid** or **Partially paid** for that invoice.

## Watch out for
**Confirm Payment** stays off until an invoice is selected and **Amount Received** is greater than 0. There must already be an invoice — create one first if you see **No unpaid invoices for this tenant.**

## Video
[link placeholder]
---
