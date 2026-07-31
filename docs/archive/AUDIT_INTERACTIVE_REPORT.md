# Full-App Interactive Audit Report

**Generated:** 2026-07-25T17:23:06.489929+00:00

**Base URL:** http://localhost:3030

**Method:** Playwright browser interaction + direct Postgres verification + code trace for stubs/unwired

**Prior static audit file:** not present (no `AUDIT_FINDINGS.md` in repo)

**Runner:** `scripts/full-interactive-audit.mjs`

**Artifacts:** `/tmp/full-audit-1784999954303/`


## Summary counts


| Result | Count |
|--------|-------|
| ✅ | 68 |
| ⚠️ | 6 |
| ❌ | 19 |
| 🚫 | 7 |
| ⛔ | 9 |
| **Total findings** | **109** |
| Pages visited (load checks) | 64 |


### Legend

- ✅ WORKING — wired, API OK, DB verified (for mutations), UI reflects

- ⚠️ PARTIAL — works with gaps (UX, refresh, race, auth edge)

- ❌ BROKEN — error, wrong behavior, or security failure on probe

- 🚫 STUB/MOCK — fake success / in-memory / hardcoded

- ⛔ UNWIRED — no handler


## Core loop mutations (DB-verified)


### /admin/buildings — Create Building
- Purpose: Create building record and redirect to detail
- API called: POST /api/buildings
- Test input used: name=Audit Bldg 1784999954303
- Result: ✅
- Evidence: HTTP 200 success=true; DB count 9->10; row={"id":"3d43373c-b082-4bbb-a11e-84e0208b790e","name":"Audit Bldg 1784999954303"}

### /admin/buildings/3d43373c-b082-4bbb-a11e-84e0208b790e/rooms/new — Create Room
- Purpose: Create room under building
- API called: POST /api/rooms
- Test input used: roomNumber + monthlyRate=12000
- Result: ✅
- Evidence: HTTP 200; DB rooms 0->1; roomId=ff151797-6eb7-47c7-9e40-73c0803d8439

### /admin/tenants/new — Create Tenant
- Purpose: Create tenant + user; assign room; auto-invoice
- API called: POST /api/tenants
- Test input used: audit.1784999954303@parenta.com
- Result: ✅
- Evidence: API success=true; DB tenants 10->11; tenantId=b080d90e-5c27-4680-ac02-1ecaceae4df1
- Notes: Password not returned to admin UI (known gap)

### /admin/tenants/new — Create Tenant (assign step)
- Purpose: Assign room and generate invoices
- API called: POST /api/rooms/ff151797-6eb7-47c7-9e40-73c0803d8439/assign
- Test input used: deposit floored to min 3000
- Result: ⚠️
- Evidence: assign success=false; active assignment=true; invoices=13
- Notes: Room ended up assigned with auto-invoices; assign API response reported failure (likely already-assigned race/duplicate). Treat as partial.

### /admin/financial/invoices/new — Create Invoice
- Purpose: Create invoice with line items
- API called: POST /api/invoices
- Test input used: Audit rent 12000
- Result: ✅
- Evidence: HTTP 201; invoices 13->14; id=9a1c2067-14ef-483c-971b-3b18b1c490ab

### /admin/financial/payments/new — Record Payment
- Purpose: Insert payment and allocate to invoices
- API called: POST /api/payments
- Test input used: amount=12000 cash rent
- Result: ✅
- Evidence: HTTP 201; payments 0->1; invoice amount_paid sum 0->12000
- Notes: Invoice balances updated

### /tenant/maintenance — Submit Request
- Purpose: Create maintenance request visible to admin
- API called: POST /api/tenant/maintenance
- Test input used: Tenant audit 1784999954303
- Result: ✅
- Evidence: HTTP 200; DB 4->5; row={"id":"905e8eca-48c7-4f87-a458-0ab5bbb2da3a","title":"Tenant audit 1784999954303"}

## Findings by page


## /admin

### /admin — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/admin/dashboard/active-tenants, GET /api/settings, GET /api/admin/dashboard/activity-logs, GET /api/admin/dashboard/notifications, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 65 interactive els; no page crash


## /admin (layout)

### /admin (layout) — Global search
- Purpose: Search entities
- API called: none (mock)
- Test input used: n/a
- Result: 🚫
- Evidence: GlobalSearchModal mock results; real /api/search commented out

### /admin (layout) — Header notifications / settings icons
- Purpose: Open notifications/settings
- API called: none
- Test input used: n/a
- Result: ⛔
- Evidence: No onClick in AdminLayout


## /admin/activity-logs

### /admin/activity-logs — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/admin/dashboard/activity-logs, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 44 interactive els; no page crash


## /admin/analytics

### /admin/analytics — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/buildings, GET /api/analytics, GET /api/analytics
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 48 interactive els; no page crash

### /admin/analytics — Export PDF/Excel/CSV
- Purpose: Export analytics file
- API called: none
- Test input used: select format
- Result: 🚫
- Evidence: TODO + setTimeout then success notification; no fetch


## /admin/assets

### /admin/assets — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/assets/stats, GET /api/buildings, GET /api/assets
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 49 interactive els; no page crash


## /admin/bills-expenses

### /admin/bills-expenses — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/utility-bills/room, GET /api/expenses
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 48 interactive els; no page crash


## /admin/bills-expenses/reports

### /admin/bills-expenses/reports — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/buildings, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 52 interactive els; no page crash


## /admin/bills-expenses/utility-bills

### /admin/bills-expenses/utility-bills — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/buildings, GET /api/settings, GET /api/utility-bills/room, GET /api/utility-bills/room
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 48 interactive els; no page crash


## /admin/bills-expenses/utility-bills/new

### /admin/bills-expenses/utility-bills/new — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/rooms
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 51 interactive els; no page crash


## /admin/buildings

### /admin/buildings — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 73 interactive els; no page crash

### /admin/buildings — Create Building
- Purpose: Create building record and redirect to detail
- API called: POST /api/buildings
- Test input used: name=Audit Bldg 1784999954303
- Result: ✅
- Evidence: HTTP 200 success=true; DB count 9->10; row={"id":"3d43373c-b082-4bbb-a11e-84e0208b790e","name":"Audit Bldg 1784999954303"}


## /admin/buildings/3d43373c-b082-4bbb-a11e-84e0208b790e/rooms/new

### /admin/buildings/3d43373c-b082-4bbb-a11e-84e0208b790e/rooms/new — Create Room
- Purpose: Create room under building
- API called: POST /api/rooms
- Test input used: roomNumber + monthlyRate=12000
- Result: ✅
- Evidence: HTTP 200; DB rooms 0->1; roomId=ff151797-6eb7-47c7-9e40-73c0803d8439


## /admin/buildings/b90843a1-77cc-4eee-afaf-4f38edf9423e

### /admin/buildings/b90843a1-77cc-4eee-afaf-4f38edf9423e — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 55 interactive els; no page crash


## /admin/buildings/b90843a1-77cc-4eee-afaf-4f38edf9423e/rooms

### /admin/buildings/b90843a1-77cc-4eee-afaf-4f38edf9423e/rooms — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 59 interactive els; no page crash


## /admin/buildings/b90843a1-77cc-4eee-afaf-4f38edf9423e/rooms/new

### /admin/buildings/b90843a1-77cc-4eee-afaf-4f38edf9423e/rooms/new — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 57 interactive els; no page crash


## /admin/bulk-operations

### /admin/bulk-operations — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 47 interactive els; no page crash


## /admin/documents

### /admin/documents — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 47 interactive els; no page crash


## /admin/documents/categories

### /admin/documents/categories — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 47 interactive els; no page crash


## /admin/documents/templates

### /admin/documents/templates — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session, GET /api/documents/templates
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 56 interactive els; no page crash


## /admin/export

### /admin/export — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/export, GET /api/export, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 50 interactive els; no page crash

### /admin/export — Advanced Export Manager
- Purpose: Queue and download real exports
- API called: POST /api/export (+ fake /api/export/download/*)
- Test input used: page inspection
- Result: 🚫
- Evidence: Mock queue + setTimeout processing; download route missing
- Notes: Unwired Run Report / Edit / Clone buttons also present

### /admin/export — Download export
- Purpose: Download generated file
- API called: GET /api/export/download/{id}
- Test input used: n/a
- Result: ❌
- Evidence: downloadUrl points to missing route
- Notes: Broken route

### /admin/export — Run Report / Edit / Clone / Create Scheduled / Use Template
- Purpose: Manage scheduled exports
- API called: none
- Test input used: n/a
- Result: ⛔
- Evidence: Buttons without handlers in AdvancedExportManager


## /admin/financial

### /admin/financial — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 55 interactive els; no page crash


## /admin/financial/advanced-analytics

### /admin/financial/advanced-analytics — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/financial-analytics, GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 56 interactive els; no page crash

### /admin/financial/advanced-analytics — (page data)
- Purpose: Show real financial analytics from DB
- API called: GET/POST /api/financial-analytics
- Test input used: n/a
- Result: ⚠️
- Evidence: API status=200; mock names visible=false
- Notes: Hardcoded mock metrics

### /admin/financial/advanced-analytics — Analytics charts / metrics
- Purpose: Show real portfolio financial metrics
- API called: GET/POST /api/financial-analytics
- Test input used: n/a
- Result: 🚫
- Evidence: generateAdvancedFinancialMetrics returns hardcoded Sunset/Downtown/Garden View data


## /admin/financial/dashboard

### /admin/financial/dashboard — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 49 interactive els; no page crash


## /admin/financial/expenses

### /admin/financial/expenses — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 50 interactive els; no page crash


## /admin/financial/expenses/[id]

### /admin/financial/expenses/[id] — Delete expense
- Purpose: Delete expense record
- API called: none
- Test input used: n/a
- Result: ⛔
- Evidence: Delete button no onClick

### /admin/financial/expenses/[id] — Edit Expense
- Purpose: Open expense editor
- API called: none
- Test input used: n/a
- Result: ❌
- Evidence: Links to /admin/financial/expenses/[id]/edit which does not exist
- Notes: Broken route


## /admin/financial/expenses/new

### /admin/financial/expenses/new — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/buildings, GET /api/rooms
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 51 interactive els; no page crash


## /admin/financial/invoices

### /admin/financial/invoices — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 75 interactive els; no page crash


## /admin/financial/invoices/528336ef-ac4a-4174-a6e6-b75c6aed0b8b

### /admin/financial/invoices/528336ef-ac4a-4174-a6e6-b75c6aed0b8b — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 52 interactive els; no page crash


## /admin/financial/invoices/new

### /admin/financial/invoices/new — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/tenants
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 52 interactive els; no page crash

### /admin/financial/invoices/new — Create Invoice
- Purpose: Create invoice with line items
- API called: POST /api/invoices
- Test input used: Audit rent 12000
- Result: ✅
- Evidence: HTTP 201; invoices 13->14; id=9a1c2067-14ef-483c-971b-3b18b1c490ab


## /admin/financial/late-fees/apply

### /admin/financial/late-fees/apply — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 48 interactive els; no page crash


## /admin/financial/late-fees/settings

### /admin/financial/late-fees/settings — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/late-fees/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 48 interactive els; no page crash


## /admin/financial/payment-gateways

### /admin/financial/payment-gateways — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/payment-gateways, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 52 interactive els; no page crash

### /admin/financial/payment-gateways — Save Config / Toggle Active
- Purpose: Persist gateway configuration
- API called: POST /api/payment-gateways
- Test input used: n/a
- Result: 🚫
- Evidence: In-memory mockGateways; POST does not mutate store; refresh resets
- Notes: Stub

### /admin/financial/payment-gateways — Create Test Payment
- Purpose: Fire test charge
- API called: none
- Test input used: n/a
- Result: ⛔
- Evidence: Button with no onClick


## /admin/financial/payments

### /admin/financial/payments — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 53 interactive els; no page crash


## /admin/financial/payments/[id]

### /admin/financial/payments/[id] — Download Receipt
- Purpose: Download payment receipt
- API called: none
- Test input used: n/a
- Result: ⛔
- Evidence: Button no onClick


## /admin/financial/payments/b567abf8-b389-4aa3-aaf0-c2ba389cac8f

### /admin/financial/payments/b567abf8-b389-4aa3-aaf0-c2ba389cac8f — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 51 interactive els; no page crash


## /admin/financial/payments/new

### /admin/financial/payments/new — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/tenants
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 51 interactive els; no page crash

### /admin/financial/payments/new — Record Payment
- Purpose: Insert payment and allocate to invoices
- API called: POST /api/payments
- Test input used: amount=12000 cash rent
- Result: ✅
- Evidence: HTTP 201; payments 0->1; invoice amount_paid sum 0->12000
- Notes: Invoice balances updated


## /admin/financial/reports

### /admin/financial/reports — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 49 interactive els; no page crash


## /admin/lease-management

### /admin/lease-management — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/lease/alerts
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 47 interactive els; no page crash


## /admin/maintenance

### /admin/maintenance — (page data APIs)
- Purpose: Load supporting data for page
- API called: GET /api/maintenance
- Test input used: n/a
- Result: ⚠️
- Evidence: 500 GET /api/maintenance {"success":false,"error":"Failed to fetch maintenance requests","details":"colum
- Notes: One or more API calls failed during page load

### /admin/maintenance — Create maintenance UI
- Purpose: Admin should create maintenance requests
- API called: unknown
- Test input used: n/a
- Result: ⚠️
- Evidence: Could not locate create form fields on page
- Notes: List page may load; create flow unclear

### /admin/maintenance — (list reflects tenant submission)
- Purpose: Admin queue shows tenant-created request
- API called: GET /api/maintenance
- Test input used: n/a
- Result: ⚠️
- Evidence: title visible in admin UI=false; DB has row=true
- Notes: DB row exists but admin UI may filter/paginate differently

### /admin/maintenance — GET list
- Purpose: List maintenance requests
- API called: GET /api/maintenance
- Test input used: n/a
- Result: ❌
- Evidence: 500: column b.address does not exist
- Notes: Schema drift in maintenance query


## /admin/notifications

### /admin/notifications — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 45 interactive els; no page crash


## /admin/profile

### /admin/profile — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 46 interactive els; no page crash

### /admin/profile — Save Profile / Change Password
- Purpose: Persist admin profile and password
- API called: none (setTimeout simulate)
- Test input used: n/a (code+prior click)
- Result: 🚫
- Evidence: ProfileClient uses setTimeout; real fetch commented out
- Notes: Fake success toast

### /admin/profile — Avatar camera button
- Purpose: Upload avatar
- API called: none
- Test input used: n/a
- Result: ⛔
- Evidence: No onClick in ProfileClient


## /admin/reports

### /admin/reports — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 72 interactive els; no page crash


## /admin/reports/collected-amount

### /admin/reports/collected-amount — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 54 interactive els; no page crash


## /admin/reports/deposits

### /admin/reports/deposits — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 54 interactive els; no page crash


## /admin/reports/tenant-list

### /admin/reports/tenant-list — (page load)
- Purpose: Render page without client crash
- API called: none
- Test input used: n/a
- Result: ❌
- Evidence: pageerror=buildings.map is not a function body=Application error: a client-side exception has occurred while loading localhost (see the browser console for more information).
- Notes: Client-side exception on load

### /admin/reports/tenant-list — Building filter dropdown
- Purpose: Filter tenants by building
- API called: GET /api/buildings
- Test input used: page load
- Result: ❌
- Evidence: buildings.map is not a function — API shape mismatch (expects array, got wrapped object)


## /admin/reports/vacant-rooms

### /admin/reports/vacant-rooms — (page load)
- Purpose: Render page without client crash
- API called: none
- Test input used: n/a
- Result: ❌
- Evidence: pageerror=buildings.map is not a function body=Application error: a client-side exception has occurred while loading localhost (see the browser console for more information).
- Notes: Client-side exception on load

### /admin/reports/vacant-rooms — Building filter dropdown
- Purpose: Filter vacant rooms by building
- API called: GET /api/buildings
- Test input used: page load
- Result: ❌
- Evidence: buildings.map is not a function


## /admin/rooms

### /admin/rooms — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 80 interactive els; no page crash


## /admin/rooms/2ffd82fe-c6d3-44f8-81d2-b076b6954bbe

### /admin/rooms/2ffd82fe-c6d3-44f8-81d2-b076b6954bbe — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/rooms/2ffd82fe-c6d3-44f8-81d2-b076b6954bbe
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 55 interactive els; no page crash


## /admin/settings

### /admin/settings — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 52 interactive els; no page crash

### /admin/settings — Notification / 2FA toggles
- Purpose: Persist security preferences
- API called: none for those fields
- Test input used: n/a
- Result: 🚫
- Evidence: Local state only; handleSave persists currency/language/timezone/date_format only

### /admin/settings — Change Password / Clear Cache / Export Data
- Purpose: Account/security actions
- API called: none
- Test input used: n/a
- Result: ⛔
- Evidence: Buttons have no onClick


## /admin/tenants

### /admin/tenants — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 67 interactive els; no page crash


## /admin/tenants/5be393f4-a262-47c3-a4a7-232dd9afeb14

### /admin/tenants/5be393f4-a262-47c3-a4a7-232dd9afeb14 — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 51 interactive els; no page crash


## /admin/tenants/5be393f4-a262-47c3-a4a7-232dd9afeb14/edit

### /admin/tenants/5be393f4-a262-47c3-a4a7-232dd9afeb14/edit — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 55 interactive els; no page crash


## /admin/tenants/new

### /admin/tenants/new — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session, GET /api/buildings, GET /api/rooms
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 49 interactive els; no page crash

### /admin/tenants/new — Create Tenant
- Purpose: Create tenant + user; assign room; auto-invoice
- API called: POST /api/tenants
- Test input used: audit.1784999954303@parenta.com
- Result: ✅
- Evidence: API success=true; DB tenants 10->11; tenantId=b080d90e-5c27-4680-ac02-1ecaceae4df1
- Notes: Password not returned to admin UI (known gap)

### /admin/tenants/new — Create Tenant (assign step)
- Purpose: Assign room and generate invoices
- API called: POST /api/rooms/ff151797-6eb7-47c7-9e40-73c0803d8439/assign
- Test input used: deposit floored to min 3000
- Result: ⚠️
- Evidence: assign success=false; active assignment=true; invoices=13
- Notes: Room ended up assigned with auto-invoices; assign API response reported failure (likely already-assigned race/duplicate). Treat as partial.

### /admin/tenants/new — Create Tenant → tenant can sign in
- Purpose: New tenant receives usable credentials
- API called: POST /api/tenants
- Test input used: email without password field
- Result: ⚠️
- Evidence: User created with random password; password not returned/shown; login requires DB reset
- Notes: Cross-page handoff broken


## /admin/tenants/reservations

### /admin/tenants/reservations — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 47 interactive els; no page crash


## /admin/utilities/cost-allocation

### /admin/utilities/cost-allocation — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/buildings, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 49 interactive els; no page crash


## /admin/utilities/readings

### /admin/utilities/readings — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 47 interactive els; no page crash

### /admin/utilities/readings — Add Reading
- Purpose: Record meter reading
- API called: none
- Test input used: n/a
- Result: ⛔
- Evidence: Buttons no onClick; fake setTimeout loading
- Notes: 🚫+⛔


## /api/buildings|rooms|tenants|payments

### /api/buildings|rooms|tenants|payments — Mutating routes without session
- Purpose: Require authenticated admin
- API called: POST/PUT/DELETE various
- Test input used: unauthenticated / tenant session
- Result: ❌
- Evidence: Live probes: POST /api/buildings 200 unauth; tenant POST /api/buildings 200; payments reaches DB layer without auth
- Notes: 28 mutating routes lack getServerSession


## /auth/admin/signin

### /auth/admin/signin — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 5 interactive els; no page crash


## /auth/forgot-password

### /auth/forgot-password — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 3 interactive els; no page crash


## /auth/signin

### /auth/signin — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 3 interactive els; no page crash


## /auth/signup

### /auth/signup — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 3 interactive els; no page crash


## /auth/staff/signin

### /auth/staff/signin — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 5 interactive els; no page crash

### /auth/staff/signin — Sign In → /staff
- Purpose: Staff portal landing after login
- API called: POST credentials
- Test input used: admin@parenta.com as staff role
- Result: ❌
- Evidence: landed=http://localhost:3030/auth/staff/signin; body=Back to Home
Staff Portal

Sign in to manage daily operations

Invalid email or password
Email Address
Password
Remember
- Notes: src/app/staff does not exist


## /auth/tenant/signin

### /auth/tenant/signin — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 5 interactive els; no page crash


## /staff

### /staff — (page load)
- Purpose: Staff portal home
- API called: none
- Test input used: n/a
- Result: ❌
- Evidence: HTTP page; title=Parenta Property Management
- Notes: Route missing


## /tenant

### /tenant — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/settings, GET /api/auth/session, GET /api/tenant/maintenance, GET /api/tenant/profile, GET /api/tenant/payments
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 13 interactive els; no page crash


## /tenant/documents

### /tenant/documents — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/tenant/documents
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 1 interactive els; no page crash


## /tenant/maintenance

### /tenant/maintenance — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/tenant/maintenance
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 2 interactive els; no page crash

### /tenant/maintenance — Submit Request
- Purpose: Create maintenance request visible to admin
- API called: POST /api/tenant/maintenance
- Test input used: Tenant audit 1784999954303
- Result: ✅
- Evidence: HTTP 200; DB 4->5; row={"id":"905e8eca-48c7-4f87-a458-0ab5bbb2da3a","title":"Tenant audit 1784999954303"}


## /tenant/payments

### /tenant/payments — (page load)
- Purpose: Render page without client crash
- API called: none
- Test input used: n/a
- Result: ❌
- Evidence: pageerror=Rendered more hooks than during the previous render. body=Application error: a client-side exception has occurred while loading localhost (see the browser console for more information).
- Notes: Client-side exception on load

### /tenant/payments — (page load)
- Purpose: Show tenant payment history matching DB
- API called: GET /api/tenant/payments
- Test input used: n/a
- Result: ❌
- Evidence: Client crash: Application error: a client-side exception has occurred while loading localhost (see the browser console for more inform / Rendered more hooks than during the previous render.
- Notes: Rules of Hooks: useState after early return

### /tenant/payments — (API vs DB payment history)
- Purpose: Tenant payment API reflects admin-recorded payments
- API called: GET /api/tenant/payments
- Test input used: n/a
- Result: ✅
- Evidence: DB payments=1; API historyLen=1; success=true


## /tenant/profile

### /tenant/profile — (page load)
- Purpose: Page renders for authenticated role
- API called: GET /api/auth/session, GET /api/settings, GET /api/tenant/profile, GET /api/tenant/occupants, GET /api/tenant/occupants
- Test input used: n/a
- Result: ✅
- Evidence: HTTP 200; 6 interactive els; no page crash


## /tenant/reports

### /tenant/reports — (page load)
- Purpose: Render page without client crash
- API called: none
- Test input used: n/a
- Result: ❌
- Evidence: pageerror=Rendered more hooks than during the previous render. body=Application error: a client-side exception has occurred while loading localhost (see the browser console for more information).
- Notes: Client-side exception on load


## /track/asset/00000000-0000-0000-0000-000000000001

### /track/asset/00000000-0000-0000-0000-000000000001 — (page load)
- Purpose: Page should exist for this role
- API called: none
- Test input used: n/a
- Result: ❌
- Evidence: HTTP 404; 404 content
- Notes: Route 404


## /track/asset/[id]

### /track/asset/[id] — Report Issue / Request Maintenance / Update Location
- Purpose: Public asset actions
- API called: none
- Test input used: n/a
- Result: ⛔
- Evidence: Unwired; page uses mockAssetData
- Notes: Also 🚫 mock data


## (auth probe)

### (auth probe) — POST /api/buildings unauthenticated
- Purpose: Reject unauthenticated mutations
- API called: POST /api/buildings
- Test input used: no session
- Result: ❌
- Evidence: HTTP 200 body={"success":true,"data":{"id":"e3af482a-ea1f-43ec-a7f6-9378e0622df0","name":"Hack","addressLine1":"a","addressLine2":null,"city":"c","state":"s","postalCode":"1","country":"PH","description":null,"buil
- Notes: SECURITY GAP: mutating route accepts unauthenticated request

### (auth probe) — POST /api/rooms unauthenticated
- Purpose: Reject unauthenticated mutations
- API called: POST /api/rooms
- Test input used: no session
- Result: ❌
- Evidence: HTTP 400 body={"success":false,"error":"Missing required fields","details":"Building ID, room number, and room type are required"}
- Notes: SECURITY GAP: mutating route accepts unauthenticated request

### (auth probe) — POST /api/tenants unauthenticated
- Purpose: Reject unauthenticated mutations
- API called: POST /api/tenants
- Test input used: no session
- Result: ❌
- Evidence: HTTP 200 body={"success":true,"data":{"id":"ed3ae109-e8b0-4605-a635-2ef6c4c43fde","tenantId":"ed3ae109-e8b0-4605-a635-2ef6c4c43fde","userId":"f124001e-092e-491b-a663-034d937efeb8"},"message":"Tenant and user accoun
- Notes: SECURITY GAP: mutating route accepts unauthenticated request

### (auth probe) — POST /api/payments unauthenticated
- Purpose: Reject unauthenticated mutations
- API called: POST /api/payments
- Test input used: no session
- Result: ❌
- Evidence: HTTP 500 body={"success":false,"error":"Failed to create payment","details":"Failed to create payment: insert or update on table \"payments\" violates foreign key constraint \"payments_tenant_id_fkey\""}
- Notes: SECURITY GAP: mutating route accepts unauthenticated request

### (auth probe) — POST /api/invoices unauthenticated
- Purpose: Reject unauthenticated mutations
- API called: POST /api/invoices
- Test input used: no session
- Result: ✅
- Evidence: HTTP 401 body={"error":"Unauthorized"}

### (auth probe) — POST /api/maintenance unauthenticated
- Purpose: Reject unauthenticated mutations
- API called: POST /api/maintenance
- Test input used: no session
- Result: ✅
- Evidence: HTTP 401 body={"success":false,"error":"Unauthorized"}

### (auth probe) — tenant → POST /api/buildings
- Purpose: Tenant must not mutate admin resources
- API called: POST /api/buildings
- Test input used: tenant session
- Result: ❌
- Evidence: HTTP 200
- Notes: Role check missing or insufficient

### (auth probe) — tenant → DELETE /api/invoices/00000000-0000-0000-0000-000000000001
- Purpose: Tenant must not mutate admin resources
- API called: DELETE /api/invoices/00000000-0000-0000-0000-000000000001
- Test input used: tenant session
- Result: ✅
- Evidence: HTTP 401


## Page load matrix


| Role | Route | HTTP | Crash | Failed APIs | Notes |
|------|-------|------|-------|-------------|-------|
| admin | `/admin` | 200 | False | 0 | ✅  |
| admin | `/admin/activity-logs` | 200 | False | 0 | ✅  |
| admin | `/admin/analytics` | 200 | False | 0 | ✅  |
| admin | `/admin/assets` | 200 | False | 0 | ✅  |
| admin | `/admin/bills-expenses` | 200 | False | 0 | ✅  |
| admin | `/admin/bills-expenses/reports` | 200 | False | 0 | ✅  |
| admin | `/admin/bills-expenses/utility-bills` | 200 | False | 0 | ✅  |
| admin | `/admin/bills-expenses/utility-bills/new` | 200 | False | 0 | ✅  |
| admin | `/admin/buildings` | 200 | False | 0 | ✅  |
| admin | `/admin/bulk-operations` | 200 | False | 0 | ✅  |
| admin | `/admin/documents` | 200 | False | 0 | ✅  |
| admin | `/admin/documents/categories` | 200 | False | 0 | ✅  |
| admin | `/admin/documents/templates` | 200 | False | 0 | ✅  |
| admin | `/admin/export` | 200 | False | 0 | ✅  |
| admin | `/admin/financial` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/advanced-analytics` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/dashboard` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/expenses` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/expenses/new` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/invoices` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/invoices/new` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/late-fees/apply` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/late-fees/settings` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/payment-gateways` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/payments` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/payments/new` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/reports` | 200 | False | 0 | ✅  |
| admin | `/admin/lease-management` | 200 | False | 0 | ✅  |
| admin | `/admin/maintenance` | 200 | False | 1 | ⚠️ 500 /api/maintenance |
| admin | `/admin/notifications` | 200 | False | 0 | ✅  |
| admin | `/admin/profile` | 200 | False | 0 | ✅  |
| admin | `/admin/reports` | 200 | False | 0 | ✅  |
| admin | `/admin/reports/collected-amount` | 200 | False | 0 | ✅  |
| admin | `/admin/reports/deposits` | 200 | False | 0 | ✅  |
| admin | `/admin/reports/tenant-list` | 200 | True | 0 | ❌ buildings.map is not a function |
| admin | `/admin/reports/vacant-rooms` | 200 | True | 0 | ❌ buildings.map is not a function |
| admin | `/admin/rooms` | 200 | False | 0 | ✅  |
| admin | `/admin/settings` | 200 | False | 0 | ✅  |
| admin | `/admin/tenants` | 200 | False | 0 | ✅  |
| admin | `/admin/tenants/new` | 200 | False | 0 | ✅  |
| admin | `/admin/tenants/reservations` | 200 | False | 0 | ✅  |
| admin | `/admin/utilities/cost-allocation` | 200 | False | 0 | ✅  |
| admin | `/admin/utilities/readings` | 200 | False | 0 | ✅  |
| admin | `/admin/buildings/b90843a1-77cc-4eee-afaf-4f38edf9423e` | 200 | False | 0 | ✅  |
| admin | `/admin/buildings/b90843a1-77cc-4eee-afaf-4f38edf9423e/rooms` | 200 | False | 0 | ✅  |
| admin | `/admin/buildings/b90843a1-77cc-4eee-afaf-4f38edf9423e/rooms/new` | 200 | False | 0 | ✅  |
| admin | `/admin/rooms/2ffd82fe-c6d3-44f8-81d2-b076b6954bbe` | 200 | False | 0 | ✅  |
| admin | `/admin/tenants/5be393f4-a262-47c3-a4a7-232dd9afeb14` | 200 | False | 0 | ✅  |
| admin | `/admin/tenants/5be393f4-a262-47c3-a4a7-232dd9afeb14/edit` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/invoices/528336ef-ac4a-4174-a6e6-b75c6aed0b8b` | 200 | False | 0 | ✅  |
| admin | `/admin/financial/payments/b567abf8-b389-4aa3-aaf0-c2ba389cac8f` | 200 | False | 0 | ✅  |
| auth | `/auth/signin` | 200 | False | 0 | ✅  |
| auth | `/auth/admin/signin` | 200 | False | 0 | ✅  |
| auth | `/auth/tenant/signin` | 200 | False | 0 | ✅  |
| auth | `/auth/staff/signin` | 200 | False | 0 | ✅  |
| auth | `/auth/signup` | 200 | False | 0 | ✅  |
| auth | `/auth/forgot-password` | 200 | False | 0 | ✅  |
| public | `/track/asset/00000000-0000-0000-0000-000000000001` | 404 | False | 0 | ❌ 404 |
| tenant | `/tenant` | 200 | False | 0 | ✅  |
| tenant | `/tenant/profile` | 200 | False | 0 | ✅  |
| tenant | `/tenant/payments` | 200 | True | 0 | ❌ Rendered more hooks than during the previous render. |
| tenant | `/tenant/maintenance` | 200 | False | 0 | ✅  |
| tenant | `/tenant/documents` | 200 | False | 0 | ✅  |
| tenant | `/tenant/reports` | 200 | True | 0 | ❌ Rendered more hooks than during the previous render. |

## Prioritized punch list


### 1. Broken (❌) — fix first

- **/admin/reports/tenant-list** — (page load): pageerror=buildings.map is not a function body=Application error: a client-side exception has occurred while loading localhost (see the browser console for more information).
- **/admin/reports/vacant-rooms** — (page load): pageerror=buildings.map is not a function body=Application error: a client-side exception has occurred while loading localhost (see the browser console for more information).
- **/track/asset/00000000-0000-0000-0000-000000000001** — (page load): HTTP 404; 404 content
- **(auth probe)** — POST /api/buildings unauthenticated: HTTP 200 body={"success":true,"data":{"id":"e3af482a-ea1f-43ec-a7f6-9378e0622df0","name":"Hack","addressLine1":"a","addressLine2":null,"city":"c","state":"s","postalCode":"1","coun
- **(auth probe)** — POST /api/rooms unauthenticated: HTTP 400 body={"success":false,"error":"Missing required fields","details":"Building ID, room number, and room type are required"}
- **(auth probe)** — POST /api/tenants unauthenticated: HTTP 200 body={"success":true,"data":{"id":"ed3ae109-e8b0-4605-a635-2ef6c4c43fde","tenantId":"ed3ae109-e8b0-4605-a635-2ef6c4c43fde","userId":"f124001e-092e-491b-a663-034d937efeb8"}
- **(auth probe)** — POST /api/payments unauthenticated: HTTP 500 body={"success":false,"error":"Failed to create payment","details":"Failed to create payment: insert or update on table \"payments\" violates foreign key constraint \"paym
- **(auth probe)** — tenant → POST /api/buildings: HTTP 200
- **/tenant/payments** — (page load): pageerror=Rendered more hooks than during the previous render. body=Application error: a client-side exception has occurred while loading localhost (see the browser console for mor
- **/tenant/reports** — (page load): pageerror=Rendered more hooks than during the previous render. body=Application error: a client-side exception has occurred while loading localhost (see the browser console for mor
- **/tenant/payments** — (page load): Client crash: Application error: a client-side exception has occurred while loading localhost (see the browser console for more inform / Rendered more hooks than during the previou
- **/auth/staff/signin** — Sign In → /staff: landed=http://localhost:3030/auth/staff/signin; body=Back to Home
Staff Portal

Sign in to manage daily operations

Invalid email or password
Email Address
Password
Remember
- **/staff** — (page load): HTTP page; title=Parenta Property Management
- **/admin/export** — Download export: downloadUrl points to missing route
- **/admin/financial/expenses/[id]** — Edit Expense: Links to /admin/financial/expenses/[id]/edit which does not exist
- **/api/buildings|rooms|tenants|payments** — Mutating routes without session: Live probes: POST /api/buildings 200 unauth; tenant POST /api/buildings 200; payments reaches DB layer without auth
- **/admin/maintenance** — GET list: 500: column b.address does not exist
- **/admin/reports/tenant-list** — Building filter dropdown: buildings.map is not a function — API shape mismatch (expects array, got wrapped object)
- **/admin/reports/vacant-rooms** — Building filter dropdown: buildings.map is not a function

### 2. Stubs / mocks needing real implementation (🚫)

- **/admin/export** — Advanced Export Manager: Unwired Run Report / Edit / Clone buttons also present
- **/admin/profile** — Save Profile / Change Password: Fake success toast
- **/admin/settings** — Notification / 2FA toggles: Local state only; handleSave persists currency/language/timezone/date_format only
- **/admin/financial/payment-gateways** — Save Config / Toggle Active: Stub
- **/admin/financial/advanced-analytics** — Analytics charts / metrics: generateAdvancedFinancialMetrics returns hardcoded Sunset/Downtown/Garden View data
- **/admin/analytics** — Export PDF/Excel/CSV: TODO + setTimeout then success notification; no fetch
- **/admin (layout)** — Global search: GlobalSearchModal mock results; real /api/search commented out

### 3. Unwired buttons (⛔)

- **/admin/profile** — Avatar camera button
- **/admin/settings** — Change Password / Clear Cache / Export Data
- **/admin/financial/payment-gateways** — Create Test Payment
- **/admin/export** — Run Report / Edit / Clone / Create Scheduled / Use Template
- **/admin/financial/expenses/[id]** — Delete expense
- **/admin/financial/payments/[id]** — Download Receipt
- **/admin/utilities/readings** — Add Reading
- **/track/asset/[id]** — Report Issue / Request Maintenance / Update Location
- **/admin (layout)** — Header notifications / settings icons

### 4. Partial / UX / propagation gaps (⚠️)

- **/admin/maintenance** — (page data APIs): 500 GET /api/maintenance {"success":false,"error":"Failed to fetch maintenance requests","details":"colum
- **/admin/tenants/new** — Create Tenant (assign step): assign success=false; active assignment=true; invoices=13
- **/admin/maintenance** — Create maintenance UI: Could not locate create form fields on page
- **/admin/financial/advanced-analytics** — (page data): API status=200; mock names visible=false
- **/admin/maintenance** — (list reflects tenant submission): title visible in admin UI=false; DB has row=true
- **/admin/tenants/new** — Create Tenant → tenant can sign in: User created with random password; password not returned/shown; login requires DB reset

## Relational / cross-page checks


| Action | Expected propagation | Result |
|--------|---------------------|--------|
| Admin create building/room/tenant | Rows in DB; lists grow | ✅ verified via COUNT + row lookup |
| Assign room | Active assignment + invoices | ⚠️ assignment+invoices present; assign API status flaky |
| Record payment | payments row + invoice amount_paid | ✅ |
| Tenant submit maintenance | Admin maintenance queue | ⚠️ DB row created; admin list API 500 so UI empty |
| Admin payment → tenant payment history API | History shows payment | ✅ API vs DB |
| Admin create tenant → tenant sign-in | Can log in with known password | ⚠️ password not disclosed; needs DB reset |
| Staff sign-in → /staff | Staff portal | ❌ route missing |

## Auth / permission probes (live)


| Probe | HTTP | Expected | Result |
|-------|------|----------|--------|
| Unauth POST /api/buildings | 200 created building | 401/403 | ❌ GAP |
| Unauth POST /api/rooms | 400 validation (no auth gate) | 401/403 | ❌ GAP |
| Unauth POST /api/tenants | 200 created tenant+user | 401/403 | ❌ GAP |
| Unauth POST /api/payments | 500 FK (reached handler) | 401/403 | ❌ GAP |
| Unauth POST /api/invoices | 401 | 401 | ✅ |
| Unauth POST /api/maintenance | 401 | 401 | ✅ |
| Tenant POST /api/buildings | 200 | 401/403 | ❌ GAP |
| Tenant DELETE /api/invoices/:id | 401 | 401/403 | ✅ |

Code scan: **28/124** mutating handlers lack `getServerSession`; no `middleware.ts`.


## New issues found by dynamic testing

(Not just inferred from reading code — confirmed in a running browser + DB.)


1. **`/tenant/payments` and `/tenant/reports` crash** — Rules of Hooks (`useState` after early return). APIs can still 200.

2. **`/admin/reports/tenant-list` and `/vacant-rooms` crash** — `buildings.map is not a function` (response shape `{buildings:[...]}` treated as array).

3. **`GET /api/maintenance` 500** — `column b.address does not exist` (schema drift); blocks admin queue + hides tenant-submitted tickets in UI.

4. **Unauth + tenant can POST `/api/buildings` (and create tenants)** — live HTTP 200 with DB writes.

5. **Staff portal dead-end** — sign-in UI works for invalid role messaging; `/staff` does not exist.

6. **Tenant password handoff** — create-tenant UI never surfaces credentials → cannot complete admin→tenant login path without ops intervention.

7. **Export download 404 path** — UI invents `/api/export/download/{id}` which is not implemented.

8. **Track asset** with no seeded asset → 404; with mock page code, actions still unwired.

9. Page-load false confidence from RSC HTML scraping alone — only browser interaction exposed hooks crashes and `buildings.map` bugs.


## Working baseline (do not regress)

- Admin sign-in → dashboard SSR stats

- Create Building / Room / Tenant (profile) / Invoice / Payment with DB verification

- Invoice detail page (after room_id fix) loads

- Tenant home, profile, documents, maintenance submit (DB)

- Auth’d invoice/maintenance mutations reject unauthenticated callers

