# Alfonso Apartment — Phase 2 completion

**Source:** `Alfonso Apartment.xlsx` → tab **Sheet** only.  
**As of:** 2026-08-29  
**Assumption:** Phase 2 features are already built. This file is not a build list. It is how you **finish** Phase 2: test the job, record a video, get client approval.

**Start client review for Phase 2 after Phase 1 is Approved.** You can still use this file now to test and record videos. See [ALFONSO-PHASE-1.md](./ALFONSO-PHASE-1.md).

Sheet Remarks for all Phase 2 rows: **Done** (meaning built). That is not client approval.

---

## Money (from Sheet)

| Line | PHP |
| --- | ---: |
| Phase 1 | 86,053.75 |
| Phase 2 | 115,000.00 |
| Downpayment (previously paid) | 15,039.75 |
| Grand total | 216,093.50 |
| Payments made (2025, including downpayment) | 39,093.50 |
| Balance | 177,000.00 |

Phase 2 item costs on Sheet:

| # | Milestone | Cost |
| ---: | --- | --- |
| P2-1 | Tasks (Pipeline) | 20,000.00 |
| P2-2 | Maintenance | 10,000.00 |
| P2-3 | Users | *(no price)* |
| P2-4 | Utilities (meter readings & cost allocation) | 10,000.00 |
| P2-5 | Invoices | 10,000.00 |
| P2-6 | Late Fees | `-` |
| P2-7 | Lease Designer & Templates | 15,000.00 |
| P2-8 | Settings | 10,000.00 |
| P2-9 | Notifications | 10,000.00 |
| P2-10 | Activity Logs | 10,000.00 |
| P2-11 | Reports Hub | 10,000.00 |
| P2-12 | Financial Dashboard & Analytics | 10,000.00 |
| | **Phase 2 priced total** | **115,000.00** |

Users has no cost. Late Fees is `-`. Confirm with the client that both are included in Phase 2, not extra bill.

---

## What “finished” means for Phase 2

Same cycle as Phase 1.

1. **Confirm the job** — who uses it and what problem it solves.
2. **Test that it works** — use **See** and **Do**. Then tick **Pass**. Also try a bad input, empty list, and refresh.
3. **Test that it makes sense** — could office staff do this without you?
4. **Record a 2–5 min video.**
5. **Send to client** — video + 1–3 yes/no questions.
6. **Mark Approved** only when they confirm. Date + who approved.

### Status

| Status | Meaning |
| --- | --- |
| Built | Code is in the app. Starting point for every Phase 2 row. |
| Testing | You are running the checklist. |
| Ready for review | Checklist passed + video link. Waiting on client. |
| Changes requested | Client tried it and asked for edits. |
| Approved | Client said it meets the Sheet scope. Name + date recorded. |

A feature is complete when it is **Approved**, not when it is Built.

---

## Work order (when you start Phase 2)

Do not go in Sheet number order. Settings and money first; pipeline and analytics last.

| Order | Item | Why this order | Video |
| ---: | --- | --- | --- |
| 1 | P2-8 Settings | GCash / Maya / bank text must be real before tenant pay | **Record** |
| 2 | P2-3 Users | Office can add staff without you | **Record** |
| 3 | P2-5 Invoices | Amount due must exist before late fees | **Record** |
| 4 | P2-6 Late Fees | Needs the client’s grace days and amount | **Record** after they answer |
| 5 | P2-4 Utilities | Matches how they split electric/water | **Record** |
| 6 | P2-2 Maintenance | Tenant + admin loop | **Record** (one clip, both sides) |
| 7 | P2-1 Tasks | Inquiry → occupied unit | **Record** |
| 8 | P2-7 Lease designer | Generate a lease from a template | **Record** |
| 9 | P2-9 Notifications | Reminders only matter after invoices exist | **Record** |
| 10 | P2-10 Activity logs | Quick audit demo | **Record** |
| 11 | P2-11 Reports hub | Overlaps Phase 1 #9; confirm the hub itself | **Record** if Phase 1 video did not cover the hub |
| 12 | P2-12 Financial dashboard | Charts after the numbers are trusted | **Record** |

---

## Phase 2 tracker

Walk the real screens. **See** = what is on the page. **Do** = buttons and forms. Tick **Pass** only after you have looked and clicked.

Sidebar: Tasks, Maintenance, Users, Utilities (Meter Readings, Cost Allocation), Payments → Invoices / Financial Dashboard / Tenant pay details / Reports & Analytics, Documents → Lease Designer / Templates, Leasing → Lease Templates, Settings, Notifications, Activity, Reports.

---

### P2-1. Tasks (Pipeline) — ₱20,000

**Sheet scope:** Kanban boards for Onboarding, Payments, Expenses, Maintenance, plus custom boards. Create, edit, and move cards across stages. Contact, property/unit, screening, documents, payment, and lease on each card. Onboarding: prospect docs, screening, deposit confirmation, generate lease. Assign owners, tags, schedule, call/message. Manage stages, board settings, search/filter, bulk move/delete.

**Business job:** Turn a prospect into a tenant (and track rent / bills / repairs) without a side spreadsheet.

**Who:** Admin.

**Where:** `/admin/tasks`

#### Board

**See**

- Board tabs: **Onboarding**, **Rent Payment** (Sheet said “Payments”), **Building Electricity, Water and Expense** (Sheet said “Expenses”), **Maintenance**, plus any custom boards
- Opportunity count; onboarding may show ₱ total (deposit + advance)
- Kanban columns (stages), e.g. Onboarding: New inquiry → Viewing scheduled → … → Lease signed / Lost
- Card: title, owner, two extra fields, actions Call / Message / Tags / Files / Tasks / Schedule
- List view: Name, Stage, Owner, Field 1, Field 2
- Archived boards strip

**Do**

- Switch boards; drag-reorder boards; **Rename board** / **Archive board**; **New board**
- **Configure stages** (add / rename / reorder / delete / color)
- **Bulk Actions**: select, **Move to stage…**, **Delete**
- Kanban / List; **Add opportunity** (or Add rent payment / Add bill or expense, depending on board)
- Search **Search Opportunities**; **Sort**; **Manage Fields**
- Drag a card to another stage; assign owner
- Open a card — sections by board:
  - Onboarding: **Contact**, **Property**, **Schedule**, **Documents**, **Screening**, **Payment**, **Lease**, **Status**, **Tags**, **Notes**, History
  - Payments: **Rent**, **Tenant**, **Notes**, **Tags**
  - Expenses: **Bill**, **Notes**, **Tags**
  - Maintenance: **Request**, **Tenant**, **Tags**
  - Custom: **Basics**, **Property**, **Due date**, **Tags**, **Notes**
- Call / Message (phone / open card)

**Gaps (do not pretend these work)**

- **Advanced Filters** — stub only (“coming soon”)
- **Import** CSV — stub only
- Landlord-style “filter” on Sheet is search + sort + manage fields, not a full filter builder

**Pass**

- [ ] Open Onboarding, Rent Payment, Expenses, Maintenance boards
- [ ] Create a card with contact + unit (onboarding)
- [ ] Move a card across stages; it stays after refresh
- [ ] Assign an owner; add a tag
- [ ] Onboarding card has Documents, Screening, Payment, Lease sections
- [ ] Create a custom board or add/rename a stage
- [ ] Search finds a card; bulk move or delete works
- [ ] Write the Advanced Filters / Import gap in the client note (do not mark them as delivered)

**Makes sense?** Can staff move one real inquiry from New inquiry to Lease signed without Excel?

**Video:** none — **record:** “How to move a lead from inquiry to occupied unit.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** Create one test onboarding card. Drag it two stages. Refresh.

---

### P2-2. Maintenance — ₱10,000

**Sheet scope:** Tenant submits title, description, category, priority. Tenant sees status and admin notes/schedule. Admin lists, searches, filters by status, priority, category. Admin updates status, priority, assignee, scheduled/completed dates, notes. Stats: open, in progress, completed, urgent/high.

**Business job:** Tenant reports a problem; office tracks it to done.

**Who:** Tenant, admin.

**Where:** `/admin/maintenance` · `/tenant/maintenance` · `/tenant/maintenance/[id]`  
(Tasks board **Maintenance** is extra tracking, not a replacement for this module.)

#### Admin — `/admin/maintenance`

**See**

- Stats: **Total Requests**, **Open**, **In Progress**, **Resolved**
- Rows: ticket #, title, location, status/priority, photos count, assignee or **Unassigned**
- Empty: “No maintenance requests found”

**Do**

- **Open pipeline** → Tasks maintenance board
- Search (ticket, title, tenant, building)
- Filter Status (Open / In Progress / Resolved / Cancelled), Priority (Urgent / High / Medium / Low), Category (Plumbing, Electrical, HVAC, Appliance, Structural, Other)
- Open slider: edit **Status**, **Priority**, **Scheduled Date**, **Completed Date**, **Assigned To**, **Internal notes**; **Discussion**; **Save Changes**

#### Tenant — `/tenant/maintenance`

**See**

- Tabs **All / Open / In progress / Resolved** with counts
- List: ticket #, status, priority, title, category
- Empty: “No tickets yet”

**Do**

- **New ticket**: **Subject**, **Category**, **Priority** (Low / Medium / High), **Details**, **Photos** (Take photo / Upload) → **Submit ticket**
- Search; priority filter
- Open ticket: discussion, **Confirm this was fixed**, **Close ticket…** (closing note + rating)

**Pass**

- [ ] Tenant submits a ticket (subject, category, priority, details)
- [ ] Admin list shows it; stats match open/in progress/resolved
- [ ] Admin can filter by status, priority, category
- [ ] Admin updates status, assignee, scheduled/completed dates, notes; Save; refresh holds
- [ ] Tenant sees the new status and schedule/notes (not only internal notes)
- [ ] Urgent/High requests are visible (priority filter or badge)

**Makes sense?** Submit one as tenant, update as admin, check the tenant sees it.

**Video:** none — **record:** “How a tenant submits maintenance and how admin updates it.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** One real or test ticket end to end.

---

### P2-3. Users — *(no price on Sheet)*

**Sheet scope:** List of admin users with active/inactive. Create admin (name, email, username, password). Edit profile. Reset password. Activate / deactivate.

**Business job:** Office can add or lock staff without the developer.

**Who:** Admin.

**Where:** `/admin/users`

**See**

- Title **Admin Users**
- Stats: **Total Admins**, **Active**, **Inactive**, **Showing**
- Rows: name, Admin or Caretaker badge, Active/Inactive
- Empty: “No admin users found”

**Do**

- **Create Admin** → **Create portal account**: Role **Admin (full access)** or **Caretaker (payments only)**; First/Last name, Email, Username (optional), Password, Confirm → **Create Account**
- Edit: names, email, username, Status Active/Inactive, **Reset password** → **Save Changes**
- Activate / deactivate icons (cannot deactivate yourself)

**Gaps**

- Create offers **Admin** and **Caretaker** only. There is no **Staff** option on this screen. If a staff role exists elsewhere, do not demo it as created here.

**Pass**

- [ ] List shows active vs inactive
- [ ] Create an admin; log in as them
- [ ] Edit profile fields; save; refresh
- [ ] Reset that user’s password; they can log in with the new one
- [ ] Deactivate them; they cannot use admin
- [ ] Confirm with client: Users is included in Phase 2 (no line price)

**Makes sense?** Can the owner add a caretaker without calling you?

**Video:** none — **record:** “How to add an admin and turn an account off.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** Create a test caretaker, log in, deactivate. Do not lock the real owner account.

---

### P2-4. Utilities (meter readings & cost allocation) — ₱10,000

**Sheet scope:** Record meter readings (electricity, water, gas, internet, etc.) by building. View recent readings and stats. Allocation rules: equal, usage, room size, custom, landlord share. Calculate and allocate a bill to rooms/tenants. Generate and review tenant utility bills.

**Business job:** Split one building electric/water bill across rooms the way the office already does on paper.

**Who:** Admin.

**Where:** `/admin/utilities/readings` · `/admin/utilities/cost-allocation`  
(Phase 1 “type pesos per room” is `/admin/bills-expenses/utility-bills`. This item is the **split**.)

#### Meter readings — `/admin/utilities/readings`

**See**

- Stats: **Total Readings**, **Unique Meters**, **This Month**, **Buildings**
- Reading list; empty: “No meter readings”

**Do**

- Search; filter Building; Utility (**Electricity, Water, Gas, Internet, Other**)
- **Add Reading**: Building, Utility Type, Reading Date, Reading Value, Meter Number (optional), Notes

#### Cost allocation — `/admin/utilities/cost-allocation`

**See**

- Tabs: **Overview**, **Allocation Rules**, **Cost Calculator**, **Tenant Bills**
- Overview explains Equal Split / Usage-Based / Room Size / Custom Rules + common-area %
- Empty until a building is selected: “Select a Building”

**Do**

- Pick a building
- Rules: utility types including Electricity, Water, Gas, Internet, Cable TV, Waste Management, Other; methods **Equal Split / Usage-Based / Room Size / Custom Rules**; **Include Common Area Costs**, **Common Area Percentage**
- Calculator: select utility bill, method, common area, **Tenant Bill Due Date**, calculate → **Generate Tenant Bills**
- Tenant Bills: search, type, status, period; mark **sent / paid / overdue**

**Gaps**

- Sheet **landlord share** as its own method is **not** in the UI. Closest is common-area percentage. Write this as a gap or confirm common-area % is enough for the client.

**Pass**

- [ ] Save an electric (or water) reading for Balibago or Villasol
- [ ] Readings list and stats update after refresh
- [ ] Set an allocation rule (equal or usage)
- [ ] Run Cost Calculator; room shares add up to the bill (minus common-area % if used)
- [ ] Generate tenant bills; review the list
- [ ] Landlord share: either client accepts common-area %, or you log a gap

**Makes sense?** Allocate one June Meralco/water total. Totals must match the bill.

**Video:** none — **record:** “How to split a utility bill across rooms.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** One building, one bill, generate tenant shares.

---

### P2-5. Invoices — ₱10,000

**Sheet scope:** Create and manage invoices (draft, sent, paid, overdue, cancelled). Detail with line items, amounts paid/due. Record payment against an invoice. Print invoice. Summary of paid, unpaid, overdue, and total.

**Business job:** Tenant gets a clear amount due; office can mark it paid.

**Who:** Admin (tenant may see related amounts on the portal).

**Where:** `/admin/financial/invoices` · `/admin/financial/invoices/new` · `/admin/financial/invoices/[id]`

#### List — `/admin/financial/invoices`

**See**

- Stats: **Paid Invoices**, **Unpaid Invoices**, **Overdue**, **Total Invoices**
- Empty: “No invoices found” / “Get started by creating a new invoice”

**Do**

- **Create Invoice**
- Search (invoice #, tenant); Status **Draft / Sent / Paid / Overdue / Cancelled**; Tenant filter
- Open a row

#### New — `/admin/financial/invoices/new`

**See / fill**

- Tenant, Room, Due Date, Billing Period Start/End
- Line items: Description, Type (Rent, Utilities, Fees, Deposit, Other), Quantity, Unit Price
- Notes
- (Create form does not pick Draft vs Sent; status is managed after create.)

**Do**

- **Create Invoice**

#### Detail — `/admin/financial/invoices/[id]`

**See**

- Number, tenant, room, dates, period, notes
- Line items table; payment history
- Status; PAID / PARTIAL / Unpaid
- Amount summary: Subtotal, Tax, Discount, Adjustment, Total, Amount Paid, Remaining

**Do**

- **Record Payment** (disabled if fully paid)
- **Print Invoice**
- **View Tenant Profile**
- Optional: agreed deadline, discount amount/reason

**Pass**

- [ ] Create an invoice with at least one line item
- [ ] List stats: paid, unpaid, overdue, total
- [ ] Filter Draft / Sent / Paid / Overdue / Cancelled (status can be reached as implemented)
- [ ] Detail shows line items, paid vs due
- [ ] Record payment against the invoice; remaining is correct after refresh
- [ ] Print Invoice opens a printable page

**Makes sense?** Create one rent invoice for a real unit, record payment, print.

**Video:** none — **record:** “How to create an invoice and mark it paid.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** One invoice for a known tenant. Print it.

---

### P2-6. Late Fees — `-` *(unpriced)*

**Sheet scope:** Configure rules (percentage, flat rate, tiered). Set grace period and apply-after days from due date. Maximum fee caps (building or global). Calculate eligible overdue invoices and review amounts. Apply (creates late-fee invoices) or dry-run first.

**Business job:** Overdue rent grows after the grace period the client chooses.

**Who:** Admin.

**Where:** `/admin/financial/late-fees/settings` · `/admin/financial/late-fees/apply`  
Also Settings → **System** → **Enable late-fee penalties**. Tenant portal balance is Phase 1 #8.

#### Settings — `/admin/financial/late-fees/settings`

**See**

- **Current Settings** list, or “No late fee settings configured yet.”

**Do**

- **Create New Setting**: Name; Fee Type **Percentage / Flat Rate / Tiered**; % or ₱ or tiers (**Add Tier**, min/max days overdue); **Grace Period (days)**; **Apply After (days)**; **Max Fee Amount (₱)**; **Min Invoice Amount (₱)**; **Active**; **Auto-apply**; **Send Notification** → **Create Late Fee Setting**

#### Apply — `/admin/financial/late-fees/apply`

**See**

- How It Works; warning if late fees are disabled in System settings
- Eligible list after calculate

**Do**

- **Calculate Eligible Fees**; **Dry run**; **Apply Late Fees**

**Pass**

- [ ] System setting allows late-fee penalties (or you turn it on with the client)
- [ ] Create a rule: type + grace days + apply-after + cap
- [ ] Calculate eligible overdue invoices; amounts look right
- [ ] Dry run does not create invoices
- [ ] Apply creates the fee; tenant/invoice balance reflects it
- [ ] Confirm with client: Late Fees is included (Sheet price is `-`)
- [ ] Client has answered: how many days, how much

**Makes sense?** Do not Approve until the rule matches how they actually charge late rent.

**Video:** none — **record after** the client gives the rule: “How late fees are calculated and applied.”

**Status:** Built → next: Testing (blocked on client rule)  
**Client approval:**  
**Next action:** Ask grace days and ₱ or %. Dry-run on staging/test invoices first.

---

### P2-7. Lease Designer & Templates — ₱15,000

**Sheet scope:** Visual lease designer (sections, text, tables, signature blocks). Insert merge variables and printable preview. Save lease templates. Document templates by category (lease, invoice, notice, agreement, receipt, report). Generate documents from templates.

**Business job:** Office generates a lease from a template instead of Word from scratch.

**Who:** Admin.

**Where:** `/admin/documents/lease-designer` · `/admin/documents/templates` · `/admin/lease-templates` (and `/new`, `/[id]`, `/[id]/edit`)

There are **two** template systems:

1. **Document / visual** — Lease Designer (the Sheet “designer”)
2. **Commercial package** — Lease Templates under Leasing (term, deposit months, advance, grace, penalty). Needed for assigning rent packages; not the visual PDF.

#### Lease designer — `/admin/documents/lease-designer`

**See**

- Template name and status
- Columns: Clauses | editor | live preview
- Default clauses e.g. The Parties, Term of Rental, Rent, Late Fee, utilities, additional terms, Signatures
- Merge variables e.g. `{{lease.rentAmount}}`, `{{tenant.name}}`, `{{unit.number}}`

**Do**

- Rename; page size **US Letter / A4**; **Use compact template**
- **Save draft**; **Publish…**
- Reorder / delete clauses; search **Search variables**; insert variables
- Edit utility table / choice / free text; watch preview

#### Document templates list — `/admin/documents/templates`

**See**

- Total / Published / Drafts / System templates
- Empty: “No lease templates yet” / “Create one in Lease Designer.”

**Do**

- **Open Lease Designer**; search; Status All / Published / Draft; open a template

#### Package templates — `/admin/lease-templates`

**See**

- Stats: Templates / Units applied / Buildings / Unused

**Do**

- **Create Lease Template**: Template Name, Lease Term, Deposit Period, Advance Period, Grace Period, Penalty Type / Fee → **Confirm and Save**
- Edit / view; search

**Gaps**

- Sheet categories “invoice, notice, agreement, receipt, report” as separate template types may not all exist as named categories. If the designer only produces lease-style documents, write which categories are missing.

**Pass**

- [ ] Open designer; preview updates as you edit
- [ ] Insert a merge variable; preview shows it
- [ ] Save draft; reopen; content is there
- [ ] Publish (or use) a template
- [ ] Generate / download / print a document for one tenant with fields filled
- [ ] Package template (term/deposit/advance) can be created if the office uses it for new tenants

**Makes sense?** Generate one lease for a current tenant. Client reads it.

**Video:** none — **record:** “How to generate a lease from a template.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** Save a draft, preview print, generate for one tenant.

---

### P2-8. Settings — ₱10,000

**Sheet scope:** Notification preferences. Security / profile settings. Tenant payment details (GCash, Maya, bank, instructions for online pay). Accepted payment methods shown to tenants. System status / maintenance-style options.

**Business job:** Office can set pay instructions and prefs without a code change.

**Who:** Admin.

**Where:** `/admin/settings` · `/admin/profile`

#### Settings — `/admin/settings`

**See / Do by tab**

| Tab | See / Do |
| --- | --- |
| **Notifications** | In-app / Email toggles per category (Payments, Invoices, Maintenance, etc.) |
| **Security** | Two-factor toggle; session timeout; **Change Password** |
| **Preferences** | Language, Timezone, Currency, Date Format |
| **Tenant payments** | Payment phone, Account name, Bank name, Bank account number, Instructions shown to tenants, Accepted methods (**GCash**, **Maya**, **Bank transfer**) → **Save payment details** |
| **System** | Enable tenant portal; Enable late-fee penalties; nearby map cache; System Information / Database Status |

#### My Profile — `/admin/profile`

**See / Do**

- Avatar (take/choose photo)
- **Edit Profile**: First/Last Name, Email, Phone, address, Bio → **Save Changes**
- **Change Password**: Current / New / Confirm

**Pass**

- [ ] Save GCash / Maya / bank text and accepted methods
- [ ] Those details appear for the tenant (portal pay / instructions)
- [ ] Notification preferences save
- [ ] Security: password change (and 2FA if you turn it on)
- [ ] Profile save
- [ ] System toggles save (portal / late fees)

**Makes sense?** Client types their real GCash number. Check it on the tenant side.

**Video:** none — **record:** “How to set GCash, Maya, and bank details for tenants.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** Enter real pay details (or test values). Open tenant Pay / Upload receipt and confirm the text.

---

### P2-9. Notifications — ₱10,000

**Sheet scope:** Generate payment reminders from invoice due dates. Process notification queue (send pending). Types: overdue, payment confirmation, invoice, lease expiry.

**Business job:** Tenants get reminded without the office chasing every unit.

**Who:** Admin (tenant receives email and/or in-app).

**Where:** `/admin/notifications` · header **NotificationBell** · Settings → Notifications

#### Email reminders — `/admin/notifications`

**See**

- Copy for types: Payment Reminders, Overdue Notices, Payment Confirmations, Invoice Notifications, Lease Expiry Warnings
- Last result (JSON / status)
- Note about email env (RESEND / EMAIL_FROM) if shown

**Do**

- **Generate Reminders**
- **Process Queue**

#### In-app bell (admin header)

**See**

- Unread badge; panel **Notifications**; empty: “No notifications”

**Do**

- Open inbox; **Mark all read**; click an item

**Pass**

- [ ] Generate Reminders runs without a crash
- [ ] Process Queue sends pending items (or shows a clear “nothing to send” / email-not-configured error)
- [ ] Types listed match Sheet: overdue, payment confirmation, invoice, lease expiry
- [ ] At least one type actually arrives (email **or** in-app) on a test
- [ ] If email is not configured on this environment, write that gap — do not Approve as “sent”

**Makes sense?** Trigger one reminder. Confirm the tenant or admin actually receives it.

**Video:** none — **record:** “How payment reminders are generated and sent.” (only if send works)

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** Generate + process on a test invoice. Check email logs or in-app bell.

---

### P2-10. Activity Logs — ₱10,000

**Sheet scope:** Filterable activity feed (category, action type, date range, search). View actor and field changes / diffs. Audit trail of admin and system actions.

**Business job:** Owner can see who changed what.

**Who:** Admin.

**Where:** `/admin/activity` (`/admin/activity-logs` redirects here)

**See**

- Title **Recent Activity**
- Counts: Total events / This page / Category / Selected
- Rows: actor, category badge, action
- Detail: actor · action · **diffs** (field before/after)
- Empty: “No activity found”

**Do**

- Search **Entity name...**
- Category: All + Payments, Invoices, Maintenance, Leases, Tenants, Buildings & rooms, Expenses, Utilities, Documents, Assets, System
- **Action type** (e.g. `tenant.created`)
- **From** / **To** dates
- Open an event for diffs

**Pass**

- [ ] Edit a tenant (or payment); the log shows the actor
- [ ] Diff shows which field changed
- [ ] Filter by category; list narrows
- [ ] Filter by date range
- [ ] Search finds the entity name

**Makes sense?** Change one field, find that row without scrolling the whole history.

**Video:** none — **record:** “How to find who changed a tenant.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** Edit one tenant field. Filter Tenants. Open the diff.

---

### P2-11. Reports Hub — ₱10,000

**Sheet scope:** Tenant list (name, room, balance, past due). Collected / received amount by period. Deposit totals by period. Vacant rooms/apartments by building. Reports downloadable in Excel/CSV or PDF and printable.

**Business job:** Owner opens one Reports page and gets those four answers.

**Who:** Admin / owner.

**Where:** `/admin/reports`  
(Phase 1 #9 already tests the four reports. Phase 2 pass = they open **from this hub**, not only from memory of URLs.)

**See**

- Title **Reports & Analytics**
- Category summary cards; search / category filter
- Directory includes (among others):
  - **Tenant List Report** → `/admin/reports/tenant-list`
  - **Collected Amount Report** → `/admin/reports/collected-amount`
  - **Deposit Report** → `/admin/reports/deposits`
  - **Vacant Rooms Report** → `/admin/reports/vacant-rooms`
- Extra reports (not required to pass this Sheet line): Unit × Month, Disbursement, Portfolio, Expense, financial P&L, occupancy, analytics, etc.

**Do**

- Open each of the four Sheet reports from the hub
- On each report page: period/building filters; **Export Excel**, **Export PDF**, **Print**

**Pass**

- [ ] Hub loads; four Sheet reports are listed
- [ ] Tenant list: name, room, balance, past due
- [ ] Collected amount by period
- [ ] Deposits by period
- [ ] Vacant rooms by building
- [ ] Excel or PDF and Print on each of those four

**Makes sense?** Same as Phase 1 #9, but start from **Reports** in the sidebar.

**Video:** reuse Phase 1 dashboard/report video if it starts from `/admin/reports`. Otherwise **record:** “How to open reports from the Reports hub.”

**Status:** Built → next: Testing  
**Client approval:**  
**Next action:** From the hub only, export all four.

---

### P2-12. Financial Dashboard & Analytics — ₱10,000

**Sheet scope:** Monthly/yearly revenue, outstanding receivables, occupancy rate. Revenue charts and recent payments timeline. P&L-style (revenue, expenses, net income) by date range. Analytics by building and period (monthly, quarterly, yearly). Charts for occupancy, utilities, building performance, cash flow.

**Business job:** Owner sees revenue, receivables, occupancy, and P&L without Excel.

**Who:** Admin / owner.

**Where:** `/admin/financial/dashboard` · `/admin/financial/reports` · `/admin/analytics` · `/admin/financial/advanced-analytics`

#### Financial dashboard — `/admin/financial/dashboard`

**See**

- **Monthly Revenue**, **Outstanding**, **Occupancy Rate**, **Yearly Revenue**
- Revenue chart; invoice status chart; occupancy; recent payments; upcoming due dates

**Do**

- Period **This month / This year**; **Refresh Data**

#### Financial reports — `/admin/financial/reports`

**See**

- Total Revenue / Expenses / Net Profit / Outstanding
- Revenue by category; expenses by category; monthly trends; outstanding by tenant

**Do**

- Start/End date; Quick Period (This Month / Last Month / This Quarter / This Year / Custom)
- **Generate Report**; **Export Report**

#### Analytics — `/admin/analytics`

**See**

- Tabs **Overview / Financial / Occupancy / Buildings**
- Metrics: Total Revenue, Net Income, Occupancy Rate, Active Tenants, Expenses, Profit Margin, Units, Vacant, Average Rent
- Charts: financial trend, occupancy, cash flow, utility breakdown, building performance

**Do**

- Filter Building, Start/End Date, Period monthly | quarterly | yearly
- **Export** PDF / Excel / CSV

#### Advanced analytics — `/admin/financial/advanced-analytics`

**See / caution**

- Page may show **static demo numbers** (e.g. ROI, portfolio value) that are not live Balibago/Villasol data.
- Do **not** demo those headline figures as real. Prefer `/admin/analytics` and `/admin/financial/dashboard` for the client.

**Pass**

- [ ] Dashboard shows monthly/yearly revenue, outstanding, occupancy
- [ ] Revenue chart and recent payments are visible
- [ ] Date range / period changes the numbers
- [ ] P&L-style: revenue, expenses, net (financial reports or analytics)
- [ ] Analytics by building and monthly / quarterly / yearly
- [ ] Charts: occupancy, utilities, building performance, cash flow (on `/admin/analytics`)
- [ ] Do not present Advanced Analytics demo $ / % as live

**Makes sense?** Compare one month to their Excel collection/expense totals. If they disagree, fix or explain.

**Video:** none — **record:** “How to read revenue, occupancy, and P&L.” Use `/admin/financial/dashboard` + `/admin/analytics` only.

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** This month vs last month on the financial dashboard. Then analytics occupancy + cash flow.

---

## Video scripts

Same as Phase 1: 2–5 minutes. Who it is for → starting screen → normal job slowly → one rule → one mistake → expected result.

| Item | Suggested title |
| --- | --- |
| P2-1 | How to move a lead from inquiry to occupied unit |
| P2-2 | How a tenant submits maintenance and how admin updates it |
| P2-3 | How to add an admin and turn an account off |
| P2-4 | How to split a utility bill across rooms |
| P2-5 | How to create an invoice and mark it paid |
| P2-6 | How late fees are calculated and applied |
| P2-7 | How to generate a lease from a template |
| P2-8 | How to set GCash, Maya, and bank details |
| P2-9 | How payment reminders are generated and sent |
| P2-10 | How to find who changed a tenant |
| P2-11 | How to open reports from the Reports hub |
| P2-12 | How to read revenue, occupancy, and P&L |

No Phase 2 videos are on Sheet yet.

---

## Client update (Phase 2)

```
Alfonso Apartment — Phase 2 update — [date]

Built (already in the app). This note is for your review.

Ready for you:
- [item] — [video]
- Please try: [one sentence job]
- Question: Does this match how you do it today?

Still testing:
- [items]

Needs your decision:
- Users and Late Fees: included in Phase 2 (no extra fee)?
- Late fee rule: days after due date, and ₱ or %?
- Utility split: is common-area % enough, or do you need a landlord-share method?
- Reminders: is email set up, or in-app only for now?

Next: [next Phase 2 items]
```

---

## Gaps to say out loud (do not hide)

| Sheet wording | In the app |
| --- | --- |
| Payments / Expenses board names | **Rent Payment** and **Building Electricity, Water and Expense** |
| Advanced filters + CSV import on Tasks | Stubs only |
| Landlord share allocation | Not a method; common-area % instead |
| Create Staff user | Create is **Admin** or **Caretaker** only |
| Advanced Financial Analytics headline stats | May be demo numbers — do not show the client as live |
| Invoice create Draft vs Sent | Create form does not pick status; manage after create |

---

## This week (only after Phase 1 is in review or approved)

1. P2-8 Settings — save pay details; confirm on tenant portal.
2. P2-3 Users — create test caretaker; deactivate.
3. P2-5 Invoices — create, pay, print.
4. Ask client late-fee rule; then P2-6 dry-run.
5. P2-4 Utilities — one bill split.
6. Record videos for those five. Send the update template.

Do not mark Phase 2 complete on Sheet until **Approved** is filled for P2-1 through P2-12.
