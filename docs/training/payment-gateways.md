---
# Job: Set up online pay (gateways)

⚠️ Partially built — page shows **Test Mode**. Tenants today pay by GCash/Maya/bank then upload a receipt (**Tenant pay details** + **Confirm a receipt**).

**Replaces:** TBD - ask client (live card checkout was not how Alfonso collected rent).

**Who does this:** Admin

**When:** Only if you will turn on a real payment gateway. Otherwise skip this job.

## Steps
1. Open the financial hub `/admin/financial` → **Payment gateways** (`/admin/financial/payment-gateways`). Not under Payments children.
2. Review **Payment Gateway Configuration**. Badge **Test Mode**.
3. **Save Configuration** only after the owner agrees. Keep **Test Mode** on until go-live.

## Also on this page
- Cards: **Active Gateways**, **Payment Methods**, **Avg Processing Fee**, **Webhooks Status**.
- Settings labels: **Currency**, **Test Mode**, **Require CVV**, **Allow Save Card**, **Auto-capture Payments**, **Enable Recurring Payments**.
- **Back**. **Test Mode Active**.
- This does not replace **Payment phone number** on Pay online.

## Done when
If you must use this: after refresh **Test Mode** still matches what you saved. For day-to-day Alfonso collection, **Tenant pay details** is the done state instead.

## Watch out for
Saving live keys in **Test Mode** will not take real tenant card payments. Prefer GCash + **Confirm payment**.

## Video
[link placeholder]
---
