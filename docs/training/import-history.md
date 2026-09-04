---
# Job: Import old Excel history

**Replaces:** Re-typing years of Excel payments and occupancy into the app by hand.

**Who does this:** Admin

**When:** One-time (or rare) load of past payments, expenses, tenants+assignments, or meter readings. Not in the sidebar — `/admin/tools/history-import`.

## Steps
1. Open **Historical data migration**. Back link **Bulk operations**.
2. **Import setup:** pick **Data type** (**Payments / collections**, **Expenses**, **Tenants + room assignments**, **Utility meter readings**). **Download CSV template**, fill it, **Upload CSV** or paste **CSV content**.
3. Click **Preview (dry-run)**. Only if the preview looks right: **Commit import**.

## Also on this page
- Always dry-run first. Commit writes for real.
- Linked from Bulk Operations. No list search of existing records on this page.
- Occupancy names from the Start & End Date sheet are a different office process — ask before using this for dummy **Tenant Unit N** rows.

## Done when
Preview counts match the spreadsheet. After commit and refresh, sample rows appear on Payments / Expenses / Tenants / Meter Readings.

## Watch out for
**Commit import** cannot be casually undone. A bad CSV can duplicate payments. Never skip **Preview (dry-run)**.

## Video
[link placeholder]
---
