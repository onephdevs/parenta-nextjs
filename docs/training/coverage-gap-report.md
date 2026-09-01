# Training coverage vs the whole app

**Date:** 1 Sep 2026 (product gaps re-verified 2 Sep 2026)  
**Source:** `src/app/**/page.tsx`, `AdminSidebar.tsx`, `AdminLayoutClient.tsx`, `TenantPortalShell.tsx`, `staff/page.tsx`, and the page components those routes render.  
**Existing job docs (core 8):** add-unit, add-tenant, collect-rent, utility-bill, issue-lease, lead-to-tenant, move-out, tenant-portal.

**Jobs written from this report (1 Sep 2026, evening):** create-invoice, tenant-pay-details, confirm-receipt, record-expense, check-collections, close-month, work-repair, add-office-login, add-occupant. **caretaker.md** is withdrawn — caretaker is not a separate office role. Still no job for: dashboard, other reports, analytics, export, late fees, gateways, meter readings, cost allocation, assets, lease designer, documents library, reservations, bulk/history import, staff portal, settings (except pay details).

**Not counted as modules** (verified redirects only): `/admin/people` → Tenants; `/admin/community` → Tenants; `/admin/buildings` → Properties; `/admin/activity-logs` → Activity; `/admin/bills-expenses` → Utility Bills; `/tenant/reports` → Payments → Statements.

---

## Product gaps closed (2 Sep 2026)

These were incomplete **in the app**, not just missing a training job. Re-checked against code after the build.

| Was (1 Sep report) | Now | Where |
| --- | --- | --- |
| Payments: PUT/DELETE API, **no refund/void office buttons** | **Refund** keeps the row as `refunded` and restores invoice balances. A later pay is a **new payment id**. **Void** deletes the row. | Payment detail `/admin/financial/payments/[id]` → `PaymentRefundVoidActions` |
| Tenant **Pay now** with empty pay details | Blocked until **Payment phone number** is saved. Admin banner on Payments + Settings. | `PaymentForm.tsx`; Payments list; Settings → Tenant pay details |
| Utility **Mark as Paid** / **Delete** | Already wired; Mark as Paid now has a confirm dialog on the list. | `/admin/bills-expenses/utility-bills` |
| **Terminate** undefined vs vacate | Option C: end contract on paper, **do not vacate**. Required **planned move-out date** (`planned_move_out_date`) for later notice vs actual-leave analytics. Occupied + notice = UI status **Notice given**. Vacate remains **End Assignment** or **Finalize move-out**. | Lease detail Terminate; tenant Terminate link `?action=terminate` |
| **Start move-out** missing | Button + modal on Leasing → Move-outs, lease list, and lease detail. Reuses an open worksheet; does not vacate by itself. | `StartMoveOutModal` |
| Tasks CSV import / Advanced Filters **coming soon** | Import modal + filters (stage, assignee, building, tag, amount, due dates) work. | `/admin/tasks` |
| Caretaker = limited admin shell; Dashboard kicked caretakers out | **No separate caretaker role.** Existing caretaker users converted to `admin`. Users create is admin-only. Sidebar is full admin nav. JWT leftover `caretaker` is treated as admin. | Users, `AdminSidebar`, `auth.ts` |
| Reservations URL-only | Sidebar **Tenants → Reservations** and Tenants page **Reservations** button. | `/admin/tenants/reservations` |

**Still training-doc gaps only** (screens work; no job walks them): dashboard, most reports, analytics, export, late fees, gateways, meter readings, cost allocation, assets, lease designer, documents library, reservations workflow, bulk/history import, staff portal, settings besides pay details.

---

## Covered

These screens are what the eight jobs actually walk someone through. Confidence is how completely the job matches the screen, not whether the screen exists.

| Module | Which job doc covers it | Confidence |
| --- | --- | --- |
| Properties (`/admin/properties`) — Add / Edit property, Add Room, Edit Room, Deposits & advance | add-unit.md | High |
| Tenants list + Add Tenant (`/admin/tenants`, `/admin/tenants/new`) | add-tenant.md | High |
| Tenant profile — Documents tab (`/admin/tenants/[id]?tab=documents`) — Generate lease / Upload / Sign as landlord | issue-lease.md | High |
| Payments — Process Payment (`/admin/financial/payments`, `/admin/financial/payments/new`) | collect-rent.md | High |
| Room Utility Bills — Add Bill, building-wide equal-split (`/admin/bills-expenses/utility-bills`) | utility-bill.md | High |
| Tasks — Onboarding board (`/admin/tasks`, `?board=onboarding`) — Add opportunity → Generate lease | lead-to-tenant.md | High |
| Room / lease **End Assignment** (`/admin/rooms/[id]`, `/admin/leasing/[id]`) | move-out.md | High |
| Tenant portal Home, Payments (overview / pay / upload / history), Documents, Maintenance (`/tenant`, `/auth/signin`, first-visit setup) | tenant-portal.md | High |
| Lease Templates picker on Add Tenant / opportunity (`/admin/lease-templates` as the list behind that dropdown) | add-tenant.md / lead-to-tenant.md | Medium |
| Leasing → Move-outs tab + inspection worksheet (`/admin/leasing` tab Move-outs, `/admin/leasing/moveouts/[id]`) | move-out.md | Medium |
| Unit groups field on Add Bill (`/admin/bills-expenses/unit-groups`) | utility-bill.md | Low |

---

## Gaps — no job doc covers this

| Module | What it does (one line, from the actual code) | Who would use it | Suggested new job name |
| --- | --- | --- | --- |
| Dashboard (`/admin`) | Admin home: needs-attention cards, portfolio ledger, stickies, recents, pin links, and a right-rail for Add tenant / payment / room / maintenance / note | Office admin | Open the office home and clear the day’s work |
| Financial Dashboard (`/admin/financial/dashboard`) | Charts and KPIs: revenue, occupancy, upcoming dues | Owner / office admin | Read this month’s money at a glance |
| Reports hub (`/admin/reports`) | Catalog of financial, property, tenant, asset, utility, and analytics reports | Owner / office admin | Pull a collections or occupancy report |
| Unit × Month Collections (`/admin/reports/unit-month`) | Spreadsheet desk: paid / partial / unpaid per unit and month | Owner / office admin | Check who paid this month (unit × month) |
| Collected Amount Report (`/admin/reports/collected-amount`) | Received amount by month, quarter, six months, year | Owner | See how much cash came in |
| Disbursement / Cash-flow (`/admin/reports/disbursement`) | Total Collection − Expenses = Cash Allowance + Deposit cash + Cheques | Owner | Close the month (disbursement / grand total) |
| Portfolio Rollup (`/admin/reports/portfolio`) | Occupancy, collections, vacancy, owner-absorbed utilities by unit → property → portfolio | Owner | See Balibago vs Villasol in one rollup |
| Deposit Received Report (`/admin/reports/deposits`) | Deposit received totals by period | Owner / office admin | Report deposits on hand |
| Expense Report (`/admin/reports/expenses`) | Expense list and totals by month / quarter / six months / year | Owner | Report spending for the period |
| Vacant Rooms Report (`/admin/reports/vacant-rooms`) | List of vacant rooms | Office admin | Print vacant units |
| Tenant List Report (`/admin/reports/tenant-list`) | Tenants with balances and past-due status | Office admin | Print tenant balances |
| Reports & Analytics (`/admin/financial/reports`) | Period revenue, expenses, rent roll, profit & loss | Owner | Run P&L / rent roll |
| Bills & Expenses → Reports (`/admin/bills-expenses/reports`) | Utility + expense spend by period, with Excel / PDF / print | Owner / office admin | Export this month’s bills and expenses |
| Analytics (`/admin/analytics`) | Occupancy, buildings, payments charts (also linked as Occupancy Report / Building Performance / Payment Patterns) | Owner | Read occupancy and payment trends |
| Advanced Financial Analytics (`/admin/financial/advanced-analytics`) | Portfolio benchmarks and cash-flow deep dive | Owner | Compare properties (advanced analytics) |
| Advanced Export (`/admin/export`) | Custom CSV / Excel / PDF / JSON exports (Settings System also links here) | Owner / office admin | Export a spreadsheet for the accountant |
| Expenses (`/admin/financial/expenses`) | Log, edit, delete property costs (staff salary, repairs, etc.) | Office admin / owner | Record a building expense |
| Invoices — Create Invoice (`/admin/financial/invoices`, `/admin/financial/invoices/new`) | Create a bill a tenant still owes (rent/deposit/utilities) | Office admin | Issue this month’s rent invoices |
| Late fees (`/admin/financial/late-fees/settings`, `/admin/financial/late-fees/apply`) | Set penalty rules; calculate and apply charges on overdue rent | Owner / office admin | Turn on and apply late fees |
| Payment Gateway Configuration (`/admin/financial/payment-gateways`) | Configure online payment gateways (page shows Test Mode) | Admin | Set up online pay (gateways) |
| Tenant pay details (`/admin/settings?tab=payments`) | Phone, account name, bank, and methods tenants see on Pay online | Office admin | Put the GCash / bank number on Pay online |
| Settings — Notifications / Security / Preferences / System (`/admin/settings`) | Reminder prefs, 2FA toggle, language/timezone/currency, enable tenant portal, enable late fees, nearby-map cache, export | Admin | Set office preferences and turn portal on |
| Email Reminders (`/admin/notifications`) | Generate payment reminders and process the email queue | Admin | Send payment reminder emails |
| Users (`/admin/users`) | Create office admin, edit, reset password, deactivate | Admin | Add an office login |
| Activity (`/admin/activity`) | Filterable audit feed of who changed what | Admin | Look up who changed a record |
| Admin Profile (`/admin/profile`) | Edit admin name/photo and change password | Admin | Change my office password |
| Assets (`/admin/assets`) | Add assets, list/filter, QR Codes tab | Office | Log furniture and appliances in a unit |
| Public asset track (`/track/asset/[id]`) | Scan QR to view an asset; `?scan=true` writes a scan note | Anyone with the QR | Scan an asset QR on site |
| Meter Readings (`/admin/utilities/readings`) | Record electric/water meter readings per building | Office | Enter this month’s meter readings |
| Cost Allocation (`/admin/utilities/cost-allocation`) | Allocation rules, cost calculator, generate tenant utility bills | Office admin | Split a metered bill by readings |
| Utilities Management (`/utilities`) | Older utilities dashboard (bills, consumption, providers) linked from Reports, not the sidebar | Office admin | (Same family as meter/cost allocation — confirm if still used) |
| Maintenance Requests (`/admin/maintenance`) | Office queue: open tickets, change status, notes, thread | Office | Work a repair ticket |
| Tasks — Payments board (`/admin/tasks?board=payments`) | Kanban for payment claims / follow-up (Pending verification column exists in pipeline) | Office admin | Chase unpaid / unverified payments on Tasks |
| Tasks — Expenses board (`/admin/tasks?board=expenses`) | Kanban for bill/expense follow-up | Office admin | Track unpaid vendor / utility bills on Tasks |
| Tasks — Maintenance board (`/admin/tasks?board=maintenance`) | Kanban linked to maintenance requests | Office | Track repairs on Tasks |
| Leasing — Alerts tab (`/admin/leasing`) | Generate and list lease alerts | Office admin | Warn me which leases expire soon |
| Leasing — Renewals tab (`/admin/leasing`) | List leases nearing end | Office admin | See who is up for renewal |
| Renew lease (`/admin/tenants/[id]/leases/[leaseId]/renew`) | Form to renew an existing assignment | Office admin | Renew a tenant’s lease |
| New lease modal (`/admin/leasing` → New lease) | Create a lease from the leasing list (separate from Add Tenant) | Office admin | Start a lease from Leasing |
| Lease Designer (`/admin/documents/lease-designer`) | Edit 1-page room rental agreement, print / PDF / Word | Admin | Design the lease PDF the office generates |
| Documents library (`/admin/documents`) | All-property document list, upload, filters, unlinked/expired | Office admin | File a contract or ID in Documents (not on the tenant tab) |
| Document Categories (`/admin/documents/categories`) | CRUD for document category tags | Admin | Set up document categories |
| Documents → Templates (`/admin/documents/templates`) | List of lease designer templates (Open Lease Designer) | Admin | (Fold into Design the lease PDF) |
| Occupants — admin (`Tenant profile → Profile → Add Occupant`) | Extra people on the room besides the primary tenant | Office admin | Add a roommate / occupant |
| Occupants — tenant (`/tenant/profile?section=occupants`) | Tenant adds/edits occupants | Tenant | (Could extend tenant-portal.md) |
| Tenant notes (`TenantNotesAction` on tenant profile) | Notes on a tenant | Office admin | Leave a note on a tenant |
| Reservations (`/admin/tenants/reservations`) | Hold a vacant room, convert to assignment, cancel/refund deposit | Office admin | Hold a unit (reservation) |
| Bulk operations (`/admin/bulk-operations`) | Generate invoices for all active tenants; CSV import payments; bulk tenant status | Admin | Generate all rent invoices for the month |
| Historical data migration (`/admin/tools/history-import`) | CSV import of payments, expenses, tenants+assignments, meter readings | Admin | Import old Excel history |
| Staff Portal (`/staff`) | Staff home linking to Maintenance, Rooms, Activity | Staff | Sign in as staff and work the repair queue |
| Marketing landing (`/`) | Public portfolio / “what’s nearby” site | Public / owner | Update the public website listings |
| Nearby places (Edit property + Settings → System) | Save OSM places on a property for the landing page | Admin | Update “what’s nearby” on the website |
| Auth — forgot / reset password (`/auth/forgot-password`, `/auth/reset-password`) | Request and set a new password | Any user | Reset a forgotten password |
| Auth — signup (`/auth/signup`) | Self-registration form | Public | (Confirm if office still wants this documented) |
| Notification bell (header) | In-app notification list; gear links to Settings → Notifications | Admin / tenant | (Could fold into reminder / settings jobs) |
| Global search (header Search) | Search properties, tenants, rooms, assets, invoices, documents, leases, payments, expenses | Office | Find a tenant or unit from the search box |
| Financial hub (`/admin/financial`) | Index of payments, invoices, expenses, late fees, dashboards, gateways — not in the sidebar | Admin | (Hub only — jobs should point at the child screens) |

Jobs already written for some of the rows above (create-invoice, tenant-pay-details, record-expense, check-collections, close-month, work-repair, add-office-login, add-occupant) — keep those rows until the job is walked against the screen and confidence is scored in **Covered**.

---

## Partially covered

| Module | What the job covers | What the same module also does (not in any job) |
| --- | --- | --- |
| Payments (`/admin/financial/payments`) | collect-rent.md: Process Payment; **Refund** / **Void** on the receipt. confirm-receipt.md: Pending verification | Payment claim thread; download receipt. |
| Tenant portal Payments | tenant-portal.md: Overview, Pay now, Upload receipt, History | **Statements** (`?tab=statements`, badge “PDF / Excel”). **Pay now** is blocked until Settings → Tenant pay details has a phone (product closed; tenant-pay-details.md covers setup). |
| Tenant portal Profile | tenant-portal.md: first-visit **Set up your account** | Ongoing Profile: Personal info, Occupants, Emergency contact, Account & password. |
| Utility Bills | utility-bill.md: building-wide equal-split Create Bill | **Scope: Specific unit / room** (job only warns it does not split); **Mark as Paid** (confirm) and **Delete** on the list; bill detail page; Unit groups CRUD screen (job only mentions the dropdown). |
| Properties / rooms | add-unit.md: Add/Edit building and room, deposits | **Bulk add rooms** in Add Room modal; building **photos**; **Nearby places**; room **Add Occupant**; dashboard rail **Add Room**. |
| Tenants | add-tenant.md: create + temp password | **Edit tenant**; profile tabs **Profile / Lease / Financials**; **Preview tenant portal**; **Reset password** (generate + email, or set from office); Status: Current / Active / Pending / **Former tenants**; **Terminate** = notice on paper (planned move-out date), not vacate. |
| Tasks | lead-to-tenant.md: Onboarding; optional **Import** / **Advanced Filters** | Payments / Expenses / Maintenance boards. |
| Leasing | move-out.md: **Start move-out**, **End Assignment**, **Finalize** | Tabs **Leases / Alerts / Renewals**; **New lease**; **Generate Alerts**; **Notice given** filter/stat; **Terminate** (notice, not vacate). |
| Documents vs issue-lease | issue-lease.md: tenant Documents tab only | Sidebar **Documents** is a separate library (upload, categories, unlinked/expired). **Lease Designer** / **Templates** are how the generated PDF is designed — not in issue-lease.md. |
| Maintenance | tenant-portal.md: tenant **New ticket**. work-repair.md: office queue | Dashboard rail can also create a request. No **New ticket** on `/admin/maintenance`. |
| Lease templates | add-tenant / lead-to-tenant: pick a template | Creating/editing package templates at `/admin/lease-templates` and designing the PDF at Lease Designer are undocumented. |
| Move-out | move-out.md: Start move-out (worksheet only) + End Assignment / Finalize | **Terminate** is a different job (notice on paper). Person status after vacate is **inactive** (legacy `terminated` rows still count as Former tenants). |

---

## Silent functionality

No sidebar item (or only reachable from another page / header / typed URL). Easy for a client to never find.

| Entry | How you actually get there | Notes |
| --- | --- | --- |
| Reservations | Sidebar **Tenants → Reservations**; Tenants page header button. | Product closed 2 Sep. Still no job doc. Create Reservation, convert to assignment, cancel, refund deposit. |
| Bulk operations | URL `/admin/bulk-operations`. Linked from History import. Notifications from bulk APIs. | Generate invoices for all active tenants; CSV payment import; bulk tenant status (`active` / `inactive` / `terminated`). |
| Historical data migration | `/admin/tools/history-import`. Linked from Bulk operations. | Not in sidebar. |
| Late fees | Financial hub `/admin/financial` cards, not sidebar. Apply is a sibling of Settings. | System setting **Enable late-fee penalties** is off by default. |
| Payment gateways | Financial hub only | Not under Payments children. |
| Financial hub | Type `/admin/financial` or “Back to Financial” from gateways/analytics | Sidebar goes to Payments, not this hub. |
| Rooms master-detail | `/admin/rooms`. Staff Portal, Reports “Room Status”, some in-app links. | Duplicate of Properties room work, not in admin sidebar. |
| Document categories | Button on Documents page | No sidebar child. |
| Email Reminders | Dashboard `NotificationsWidget` “view all” → `/admin/notifications` | Header bell goes to Settings → Notifications, not this page. |
| Advanced Export | Reports hub “Data Export”; Settings System **Export data** | Not in sidebar. |
| Analytics | Reports hub only | Not in sidebar. |
| `/utilities` | Reports → Utility Bills Summary | Different from sidebar Utilities → Meter Readings / Cost Allocation. |
| Asset QR public page | `/track/asset/[id]` from QR / Assets QR tab | Outside admin layout. |
| Staff Portal | `/staff` (auth `/auth/staff/signin` redirects into the same sign-in) | Not linked from admin sidebar. |
| Global search | Header Search icon (desktop) | No training mention. |
| Dashboard action rail | Right-side icons on `/admin` only | Shortcuts: payment, add tenant, add room, maintenance, note. |
| Bulk Add Room | Add Room modal **entryMode** bulk | add-unit.md only describes a single room. |
| Lease renew | Tenant Lease tab → renew URL | Not in sidebar. |
| Occupants (admin) | Tenant Profile tab, not its own nav item | Easy to miss. |
| Preview tenant portal | Button on tenant profile | Office preview of tenant-portal.md. |
| Confirm / Reject payment | Payments **Pending verification** → payment detail | collect-rent.md never mentions this path (tenant upload vs office Process Payment). Covered by confirm-receipt.md. |
| Nearby places OSM refresh | Edit property + Settings → System | Landing page feature. |
| Enable tenant portal | Settings → System checkbox | If off, tenant-portal.md cannot be done. |
| Signup | `/auth/signup` | Public; office may not want it in client training. |

---

## Role note (verified 2 Sep 2026)

**Caretaker is not a separate office role.** Create portal account always writes `admin`. Existing `caretaker` rows were migrated to `admin`. A leftover JWT with `role=caretaker` is normalized to admin on each request (full sidebar, dashboard, reports). **Staff** remains a separate `/staff` page and is not an office-admin login.

Do not train “what a caretaker cannot see.” Use **Add an office login** for any office person.

---

## Suggested next jobs (for review only — not written)

Highest value for office day-to-day that the eight jobs miss (several of these already have job files from 1 Sep):

1. Issue this month’s rent invoices (and/or bulk generate) — job: create-invoice.md
2. Confirm a tenant’s uploaded GCash receipt (Pending verification) — job: confirm-receipt.md
3. Put the GCash / bank number on Pay online — job: tenant-pay-details.md
4. Record a building expense — job: record-expense.md
5. Close the month (disbursement / unit × month) — jobs: check-collections.md, close-month.md
6. Work a repair ticket (office Maintenance) — job: work-repair.md
7. Add an office login — job: add-office-login.md
8. ~~What a caretaker can do~~ — **closed:** same as admin
9. Hold a unit (reservations) — nav is no longer silent; still no job
10. Design the lease PDF — only if the office will change templates

Do not generate those files until you pick which of the remaining gaps are in-scope for Alfonso office training.
