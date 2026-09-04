# QA test plan — Payments

**Routes:** `/admin/financial/payments`, `/admin/financial/payments/new`, `/admin/financial/payments/[id]`  
**Source:** `ProcessPaymentClient.tsx`, `PaymentRefundVoidActions.tsx`, `PaymentsHub.tsx`, `POST /api/payments`, `PUT/DELETE /api/payments/[id]`  
**Training job:** [collect-rent.md](../training/collect-rent.md)

| # | Scenario | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- |
| 1 | Happy path: record ₱4,800 GCash against a rent invoice | Seed a QA tenant + unpaid ₱4,800 invoice. **Payments** → **Process Payment**. Property (prefer Balibago) → **Tenant** → **Continue**. Select the invoice. **Mode of Payment** GCash, **Amount Received** `4800` → **Confirm Payment** → **Yes, Confirm Payment**. | Lands on the payment receipt. Invoice shows **Paid** (or **Partially paid** if amount &lt; balance). | Critical |
| 2 | Required field validation: Confirm Payment stays off until invoice and amount | Open Process Payment, pick tenant, do **not** select an invoice, leave **Amount Received** empty/`0`. | **Confirm Payment** is **disabled** until tenant + invoice + payment date + amount **&gt; 0**. | Critical |
| 3 | Invalid input: amount must be greater than 0 | Select an invoice, set **Amount Received** to `0`, then try API `POST /api/payments` with `amount: 0`. | Button stays disabled. API **400 Valid amount is required** / **Amount must be greater than 0**. | Critical |
| 4 | Invalid input: missing payment type or date on the API | `POST /api/payments` with tenant + amount but no `paymentType` / no `paymentDate`. | **400 Payment type is required**. **400 Payment date is required**. | Important |
| 5 | Edit/update: refund keeps the row and restores the invoice | Record (or seed) a completed ₱4,800 payment. Receipt → **Refund** → confirm **Refund this payment?** | Toast/API **Payment refunded — invoice balances restored**. Row status **Refunded**. Invoice is unpaid again. A later pay is a **new** payment id. | Critical |
| 6 | Delete/deactivate: void deletes the payment and restores the invoice | Seed a second completed payment. Receipt → **Void** → **Void this payment?** | API **Payment voided — invoice balances restored**. Payment row is **gone**. Cannot be undone. | Critical |
| 7 | Duplicate/conflict: a second payment on the same invoice is allowed — flag as bug | Pay ₱4,800 against an invoice, then process another ₱4,800 against the same invoice (or POST again). | **No uniqueness guard.** Second payment succeeds; excess typically becomes tenant advance/credit. **Unexpectedly permissive** if the office expected “already paid” to block. | Critical |
| 8 | Data persists correctly after a page refresh | After happy-path pay, reload `/admin/financial/payments` and search the tenant / invoice number. | Collections row still **Paid** / **Partially paid**. Receipt still opens. | Critical |
| 9 | Permission check: tenant cannot open office Payments; refund/void are admin | Unauthenticated `/admin/financial/payments`. Tenant session on the same URL. | Redirect `/auth/signin`. List/create APIs allow admin (caretaker normalized to admin). `PUT/DELETE /api/payments/[id]` is **admin only**. | Critical |
| 10 | Search collections | `#payments-search` placeholder **Tenant, unit, or invoice**. Search the QA invoice number / tenant name. | Matching row visible. | Important |
| 11 | Filter by status | Open filters if collapsed. **Status** (`#payments-status`) → **Paid**, then **Unpaid**. | Paid QA invoice appears under Paid; Unpaid hides it. | Important |
| 12 | Filter by type | **Type** (`#payments-type`) → **Rent**. | Rent invoices remain; other types drop out. | Important |
| 13 | Filter by property | **Property** (`#payments-building`) → Balibago / All properties. | List scoped to that building. | Important |
| 14 | Export on Payments | Look for export/sort/bulk/clear-filters. | **No column sort. No bulk. No export. No Clear filters** (training). | Nice-to-check |
