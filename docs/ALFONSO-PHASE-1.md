# Alfonso Apartment — Phase 1 completion

**Source:** `Alfonso Apartment.xlsx` → tab **Sheet** only.  
**As of:** 2026-08-29  
**Assumption:** Phase 1 features are already built. This file is not a build list. It is how you **finish** Phase 1: test the job, record a video, get client approval.

Phase 2 tracker: [ALFONSO-PHASE-2.md](./ALFONSO-PHASE-2.md). Do not start Phase 2 client review until Phase 1 rows are **Ready for review** or **Approved**.

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

Phase 1 item costs on Sheet:

| # | Milestone | Cost |
| ---: | --- | ---: |
| 1 | Properties Page | 9,025.00 |
| 2 | Login and Registration | 7,028.75 |
| 3 | Tenants Page | 8,000.00 |
| 4 | Lease Page | 8,000.00 |
| 5 | Documents Page | 8,000.00 |
| 6 | Payments Page | 8,000.00 |
| 7 | Property Listing Website | 8,000.00 |
| 8 | Tenant Portal | 14,000.00 |
| 9 | Dashboard | 8,000.00 |
| 10 | Bills and Expenses Page | 8,000.00 |
| | **Phase 1 total** | **86,053.75** |

Sheet Remarks for all Phase 1 rows: **Done** (meaning built). That is not client approval.

---

## What “finished” means for Phase 1

Every row below must move through this cycle. Do not invent a new process per feature.

1. **Confirm the job** — who uses it and what problem it solves for the apartment.
2. **Test that it works** — use **See** and **Do** on that milestone. Then tick **Pass**. Also try a bad input, empty list, and refresh.
3. **Test that it makes sense** — could office staff do this without you? Does it match how they collect rent and assign units?
4. **Record a 2–5 min video** (or reuse the existing one if it still matches the screens).
5. **Send to client** — video + 1–3 yes/no questions.
6. **Mark Approved** only when they confirm. Date + who approved.

### Status to use (replace Sheet “Done”)

| Status | Meaning |
| --- | --- |
| Built | Code is in the app. Starting point for every Phase 1 row. |
| Testing | You are running the checklist. |
| Ready for review | Checklist passed + video link in this file. Waiting on client. |
| Changes requested | Client tried it and asked for edits. |
| Approved | Client said it meets the Sheet scope. Name + date recorded. |

A feature is complete when it is **Approved**, not when it is Built.

---

## Work order this week

Do not go in Sheet number order. Login first, money and tenant portal next (that is how the business runs), listing site last.

| Order | Item | Why this order | Video today |
| ---: | --- | --- | --- |
| 1 | #2 Login | Nothing else can be demoed | Exists — confirm it still matches |
| 2 | #1 Properties | Units must be right before tenants | Exists — confirm it still matches |
| 3 | #3 Tenants | Occupants + emergency contact in Sheet scope | Exists — confirm occupants/emergency are in the video |
| 4 | #4 Lease | Assigning a person to a unit | Exists — two videos; confirm they match current screens |
| 5 | #6 Payments | How they get paid | **Record new** |
| 6 | #8 Tenant Portal | Largest Phase 1 item; tenant-facing | **Record new** (split into 2 shorts) |
| 7 | #5 Documents | Lease files | **Record new** |
| 8 | #10 Bills and Expenses | Electric/water + misc | **Record new** |
| 9 | #9 Dashboard | Reports + export | **Record new** |
| 10 | #7 Listing website | Public; demo after the office tools work | **Record new** if client will use it |

---

## Phase 1 tracker

Walk the real screens. **See** = what is on the page. **Do** = buttons and forms. Tick **Pass** only after you have looked and clicked.

Sidebar names: Properties, Rooms, Assets, Tenants, Leasing, Documents, Payments, Bills & Expenses, Reports, Dashboard (`/admin`). Login is `/auth/signin` (old `/auth/admin/signin` and `/auth/tenant/signin` redirect here).

---

### 1. Properties Page — ₱9,025

**Sheet scope:** All information related to Properties, Units, Assets.

**Business job:** Office can see and edit Balibago and Villasol buildings, rooms, and assets.

**Who:** Admin.

**Where:** `/admin/properties` · `/admin/rooms` · `/admin/rooms/[id]` · `/admin/buildings/[id]` · `/admin/assets`  
(`/admin/buildings` redirects to Properties.)

#### Properties list — `/admin/properties`

**See**

- Search, Sort (Name A–Z / Z–A, City, Most vacant), Occupancy (All / Has vacant / Fully occupied), count `N Properties`
- Each property card: photo or icon, name, address, room count, tenant count
- Expanded rooms: room number, tenant or “No tenants”, Occupied / Pending / Vacant, area, **View**
- Empty: “No properties found”
- Detail: photo (or “Add property photo”), name, address, Google Maps link, “Show on landing page” switch, room/tenant counts
- Tabs: **Overview** | **Rooms** | **Maintenance**
- Overview: rent collected / vacancy report
- Quick actions: Record Payment, Add note, Add Tenant, Add Room, Maintenance

**Do**

- **Add** a property
- Search / sort / filter; select a property; expand rooms
- Change photo; toggle landing page; inline rename
- Menu: **Edit property**, **Manage rooms**, **Delete property**
- Record payment, add note, add tenant, add room, create maintenance from the rail
- **View** a room (opens room modal / detail)

#### Rooms — `/admin/rooms` and `/admin/rooms/[id]`

**See**

- List: search, sort, building filter, status (All / Vacant / Occupied / Pending)
- Card: `Unit {n} · {building}`, tenant or “Vacant”, area/type, status badge
- Room detail: status, Rent, Type, Area, Floor, amenities
- Tenant block: account no., name, address, mobile, email, emergency contact, start/end/due
- Financials: last payment, unpaid balance, electric/water, deposits, monthly rent
- Notes; tenant assignment manager

**Do**

- **Add** a room; open a room
- **Edit Room**, **Delete**
- Assign / change tenant; take lease photo; open tenant profile

#### Assets — `/admin/assets`

**See**

- Stats: Total Assets, Total Value, Available, Maintenance
- Tabs: **Asset Overview** | **Maintenance Schedule** | **Analytics** | **QR Codes**
- Filters: search (name, brand, serial), building, status, condition
- Asset rows with location, status, condition, value

**Do**

- **Add Asset**, **Export** (CSV)
- Edit / delete / view / history
- Form: name, brand, model, type, building, status, condition, purchase price, current value, rental rate, description

**Pass**

- [ ] Balibago and Villasol appear; rooms show Occupied vs Vacant correctly
- [ ] Add or edit a property; refresh; change is still there
- [ ] Add or edit a room (rent / details); refresh; still there
- [ ] Open a room and see tenant + rent (or Vacant)
- [ ] Add or open an asset and assign/see its building/room
- [ ] Delete is blocked or confirmed; missing required fields show an error

**Makes sense?** Can staff find “Unit 12” from Properties without asking you?

**Video:** https://youtu.be/FMtdtEfb6Qo — rewatch; remake if screens changed.

**Status:** Built → next: Testing  
**Client approval:**  
**Next action:** Walk one property, one room, one asset.

---

### 2. Login and Registration — ₱7,028.75

**Sheet scope:** Login leads to Dashboard or Tenant Portal depending on user type approved by admin.

**Business job:** The right person lands in the right portal.

**Who:** Admin, tenant (staff/caretaker if they have accounts).

**Where:** `/auth/signin` · `/auth/signup` · `/auth/forgot-password`

#### Log in — `/auth/signin`

**See**

- Logo, heading **Log in**
- Fields: **Email or username**, **Password**
- **Remember me**; link **Forgot Password?**
- Footer: “Looking for a place?” → **Register here**
- Error: “Invalid email, username, or password”

**Do**

- **Login** — admin/caretaker → `/admin`; tenant → `/tenant`; staff → `/staff`
- Open forgot password; open register

#### Create account — `/auth/signup`

**See**

- First Name, Last Name, Email, Phone, Username, Password, Confirm Password
- Note that admin must activate the account
- Success: “Your form has been submitted!”

**Do**

- **Sign up** (creates pending tenant); **Back to Login** / **Login here**

#### Forgot password — `/auth/forgot-password`

**See**

- Email field; success or warning after send

**Do**

- **Send reset link**; **Back to Login**

**Pass**

- [ ] Admin login opens `/admin`
- [ ] Tenant login opens `/tenant` (not admin)
- [ ] Tenant cannot open `/admin`
- [ ] Wrong password shows the error
- [ ] Signup submits and does not enter admin
- [ ] Forgot password accepts an email

**Makes sense?** Can the owner and one tenant log in without a new link from you?

**Video:** https://youtu.be/x26uMtg5-M8

**Status:** Built → next: Testing  
**Client approval:**  
**Next action:** Log in as admin and as one tenant.

---

### 3. Tenants Page — ₱8,000

**Sheet scope:** All information related to the Tenants including Occupants and Emergency Contact Person.

**Business job:** Office keeps the tenant, occupants, and emergency contact in one place.

**Who:** Admin.

**Where:** `/admin/tenants` · `/admin/tenants/new` · `/admin/tenants/[id]` · `/admin/tenants/[id]/edit`  
(People directory `/admin/people` is a separate contacts list — not this milestone.)

#### List — `/admin/tenants`

**See**

- Stats: Total Tenants, Active Tenants, Pending Tenants, Avg. Income
- Search (name, email, phone, unit); Building (incl. Unassigned); Status (Current / Active / Pending / Former / Inactive / Terminated); Signal; Sort
- Cards: name, property, email, status, Phone, Rent, Income, Move-in
- Empty: “No tenants found”

**Do**

- **Add Tenant**; **View Details**; **Edit**; search / filter / sort; grid vs list

#### New tenant — `/admin/tenants/new`

**See / fill**

- Personal: First/Last Name, Email, Phone, Date of Birth, Previous Address
- Emergency: Contact Name, Phone, Relationship
- Employment: Status, Employer, Monthly Income
- Housing: Property, Room, Monthly Rent, lease template
- Lease: Start/End, Move In Date
- Notes

**Do**

- Create tenant (optionally already locked to a building/room)

#### Profile — `/admin/tenants/[id]`

**See**

- Summary: photo, status, lease/pay shortcuts
- Tabs: **Profile** | **Lease** | **Financials** | **Documents**
- Profile: tenant information; **Emergency Contact Person**; **Occupants**
- Lease tab: lease history; detail shows Property/Unit, Duration, Rent, Advance, Deposit, template, grace, penalty

**Do**

- **Add Occupant**; edit/remove occupants
- Inline edit profile and emergency contact
- Lease: **View**, **Renew**, **Terminate**, **Edit**, **Download**
- Preview tenant portal; add notes
- Full **Edit** page: tenant info, lease info, upload documents (ID / residency / lease)

**Pass**

- [ ] List shows current tenants for Balibago / Villasol
- [ ] Open a tenant; unit (or none) is visible
- [ ] Occupants can be added and still show after refresh
- [ ] Emergency contact name, phone, relationship save and reopen
- [ ] Add Tenant creates a record; Edit saves
- [ ] Required empty fields are blocked

**Makes sense?** Staff must see occupants and emergency contact, not only the name.

**Video:** https://youtu.be/TqvMvbZwWf4 — confirm occupants + emergency are in the video.

**Status:** Built → next: Testing  
**Client approval:**  
**Next action:** Open one tenant. Check occupants + emergency. Screenshot.

---

### 4. Lease Page — ₱8,000

**Sheet scope:** All information related to leasing.

**Business job:** Office can start, see, and end a lease so occupancy is true.

**Who:** Admin.

**Where:** `/admin/leasing` · `/admin/leasing/[id]` · `/admin/leasing/moveouts/[id]` · tenant Lease tab · `/admin/tenants/[id]/leases/[leaseId]/edit` · `.../renew`

#### List — `/admin/leasing`

**See**

- Stats (All leases): Active, Expiring soon, Draft, Terminated
- Tabs: **All leases** | **Expiration alerts** | **Renewals** | **Move-outs**
- Search “Tenant, unit...”; Status; Building
- Rows: tenant, building · room
- Empty: “No leases found” / no alerts / no renewals / no move-outs

**Do**

- **New tenant**, **New lease**
- **Generate Alerts** (Expiration alerts tab)
- Open a lease

#### Lease detail — `/admin/leasing/[id]`

**See**

- Tenant name, status
- Rent, Deposit, Advance, First due date
- Panels: Lease, Tenant (incl. emergency contact), Payments, Documents, Recent activity

**Do**

- **Edit**, **Download** (if an agreement file exists)
- Open payment rows

#### Move-out — `/admin/leasing/moveouts/[id]`

**See**

- Inspection checklist
- Settlement: actual move-out date, deposit return, deposit deduction, advance return, utility deposit return, deduction reason, inspection notes

**Do**

- **Save inspection**; **Finalize move-out & refund**

#### From the tenant

**Do**

- **Renew** (form + “Successfully renewed!”)
- **Terminate** / move-out
- **Edit** lease terms

**Pass**

- [ ] List shows active leases with tenant + unit
- [ ] Open a lease: rent, dates, deposit/advance visible
- [ ] Occupied room has an active lease; vacant does not
- [ ] New lease / assign occupancy works
- [ ] Renew works on a test/known lease
- [ ] Move-out / terminate is possible without deleting the person; history remains

**Makes sense?** Vacant unit → assign → occupied, without a side spreadsheet?

**Videos:** https://youtu.be/GYHeKOmJclI · https://youtu.be/kM-PyhG5zNM

**Status:** Built → next: Testing  
**Client approval:**  
**Next action:** Open one existing lease. Do not wipe live occupancy.

---

### 5. Documents Page — ₱8,000

**Sheet scope:** All Documents uploaded/created by Tenants and Admin/Landlord.

**Business job:** Lease files and uploads live in the app.

**Who:** Admin, tenant.

**Where:** `/admin/documents` · `/admin/documents/categories` · `/tenant/documents`  
(Lease designer / templates are Phase 2 screens; they are in the sidebar but not this milestone.)

#### Admin — `/admin/documents`

**See**

- Stats: Total documents, Pending signature, Expiring soon, Unlinked
- Filters: search (filename, tenant), Category, Building, Status (Signed / On file / Expiring soon / Needs review)
- List: name, tenant/property, category, status
- Empty: “No documents found”

**Do**

- **Upload document**: files, document name, category, type, property, tenant, expiry; **Take photo**
- **Manage Categories**
- Per row: **View**, **Download**, **Edit**, **Delete**
- Bulk select where the list supports it

#### Tenant — `/tenant/documents`

**See**

- Title Documents; category filter; their files only; info alert
- Empty state when they have none

**Do**

- **View**; **Download** (tenant does not manage the office library)

**Pass**

- [ ] Admin can upload a file tied to a tenant/category
- [ ] File appears in the list after refresh
- [ ] View and Download open the file
- [ ] Tenant sees only their documents
- [ ] Edit name/category; Delete removes it (or confirms)
- [ ] Search/filter finds “Unit 12” / tenant name

**Makes sense?** Can staff find a lease without hunting chat or USB?

**Video:** none — **record:** “How to upload and find a lease document.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** Upload one lease for a known tenant. Check admin + tenant views.

---

### 6. Payments Page — ₱8,000

**Sheet scope:** All information related to Payments, including penalties and online payment option.

**Business job:** Office records how money comes in (GCash / Maya / bank / screenshot). Tenant online pay is item 8.

**Who:** Admin.

**Where:** `/admin/financial/payments` · `/admin/financial/payments/new` · `/admin/financial/payments/[id]`

#### List — `/admin/financial/payments`

**See**

- Stats: Outstanding, Collected, Overdue, Pending verification
- Section **Pending verification (N)**
- Collections list
- Filters: search (tenant, unit, invoice); Due date (Upcoming month, Overdue, This week/month, Next 30, Past, All); Property; Type (Rent / Utilities / Deposit / Penalty / Other); Status (Unpaid / Partially paid / Paid / Overdue); payment period
- Empty: “No payments found”

**Do**

- **Process Payment**
- Open a row; confirm from the pending hub

#### Process payment — `/admin/financial/payments/new`

**See / fill**

- Property, Room, Tenant
- Invoice (if any)
- OR No., OR Date, Mode of Payment, Payment Date, Amount Received, Notes
- Upload proof (**Take photo** or file)
- Checkbox: **Send receipt to tenant via email**

**Do**

- **Confirm Payment** (dialog **Yes, Confirm Payment**); Back / Cancel

#### Payment detail — `/admin/financial/payments/[id]`

**See**

- Amount; tenant · location · invoice · date; status/type badges
- “Awaiting verification” when pending
- Receipt rows; payment date; OR; method; late fee if any; notes; proof image; claim thread

**Do**

- **Confirm payment** or **Reject** (when pending)
- **Download** / **Download proof**
- Back to payments  
  (No edit/delete on this detail screen.)

**Pass**

- [ ] List shows collections and pending verification
- [ ] Process Payment: pick tenant/unit, amount, method, date, optional proof
- [ ] Payment appears on the list after refresh
- [ ] Type includes Penalty (or late fee shows on the detail)
- [ ] Missing tenant or amount is blocked
- [ ] Confirm / reject pending tenant uploads
- [ ] Online pay for tenants is either working on the portal, or you write the gap (“screenshot + office confirm”)

**Makes sense?** Can staff record ₱4,800 Apt 1 rent the way they write it in Excel?

**Video:** none — **record:** “How to record a rent payment.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** Record or open one payment. Confirm after refresh.

---

### 7. Property Listing Website — ₱8,000

**Sheet scope:** Public-facing website where prospects can search for vacant properties.

**Business job:** A prospect can see vacancies and contact the office.

**Who:** Public (admin toggles “Show on landing page” on Properties).

**Where:** `/` (no login)

#### Landing — `/`

**See**

- Nav: **Contact**, **Inquire**
- Hero: “Find your next home…”; field **Email or phone number**; **Inquire**
- Feature cards (Premium Properties, Secure & Reliable, Great Value, Community First)
- **Featured properties** (only properties with landing switch on): cover photo, name, location, available units, starting rent
- Nearby amenities (for featured properties)
- Contact section: **Available units**; form First name, Last name, Email, Phone, Preferred property, Message

**Do**

- Submit hero inquire
- **Submit inquiry** on the contact form
- Jump to Contact / Inquire on the page
- (There is no unit-by-unit search filter; featured list is the public catalog.)

**Pass**

- [ ] Page loads without login
- [ ] Featured properties show available units and starting rent
- [ ] Occupied-only buildings are not advertised as vacant
- [ ] Inquiry submits; office can find it (Tasks / notifications — note where it lands)
- [ ] Admin can turn “Show on landing page” on/off from Properties

**Makes sense?** Ask the client: show this to prospects this month?

**Video:** record after office tools, unless they ask for listing first.

**Status:** Built  
**Client approval:**  
**Next action:** Open `/` logged out. Count vacant vs featured. Ask the client.

---

### 8. Tenant Portal — ₱14,000

**Sheet scope:** payment schedule and history (incl. receipt upload); documents; profile (occupants + emergency); online payment; balance, due date, late fee after N days; printable receipt; reports Excel/PDF/print.

**Business job:** Tenant sees what they owe, pays or uploads proof, opens files.

**Who:** Tenant.

**Where:** `/tenant` · `/tenant/payments` · `/tenant/documents` · `/tenant/profile`  
(`/tenant/reports` redirects to Payments → Statements. **Maintenance** is on the portal nav but is Phase 2 on Sheet.)

#### Nav

Home · Payments (Overview & balance, Pay online, Upload receipt, History, Statements) · Maintenance · Documents · Profile (Personal info, Occupants, Emergency contact, Account & password)

#### Home — `/tenant`

**See**

- “Welcome, {firstName}”
- Next due / past due / outstanding
- Room assignment
- Quick links: Documents, Maintenance, My profile, Statements
- Recent payments; open tickets
- Empty: “No payments yet”, “No open tickets”

**Do**

- **Pay now** / **View payments**; open quick links

#### Payments — `/tenant/payments`

**See**

- Tabs: **Overview & balance** | **Pay online** | **Upload receipt** | **History** | **Statements**
- Overview: Next due, Past due, Deposit held
- History: search; rows with print/upload
- Statements: payment/invoice preview; Excel / PDF / Print

**Do**

- **Pay now**, **Pay this bill**, **Pay ahead**, **Pay partial**
- **Pay online** tab (gateway if enabled)
- **Upload receipt** (file/photo); submit for office review
- **Print** a receipt
- Download Excel or PDF / print statements

#### Documents — `/tenant/documents`

**See / Do:** category filter; **View**; **Download** their files

#### Profile — `/tenant/profile`

**See / Do**

- Personal info — view/edit
- Occupants — add/edit/remove
- Emergency contact — view/edit
- Account & password — change login details

**Pass (every Sheet bullet)**

- [ ] Balance, next due, past due visible on Home or Overview
- [ ] Payment history visible
- [ ] Upload receipt works; office sees it as pending
- [ ] Pay online works **or** gap written
- [ ] Printable receipt works
- [ ] Statements: Excel and/or PDF and print
- [ ] Documents list/open
- [ ] Occupants on profile
- [ ] Emergency contact on profile
- [ ] Late fee after due date shows on balance **or** gap written (rule not set)

**Makes sense?** Sit with a tenant (or the client as tenant). Balance + receipt upload in one minute.

**Videos:** (1) balance + upload receipt (2) documents + profile

**Status:** Built → next: Testing + videos  
**Client approval:**  
**Next action:** Log in as one tenant. Tick every bullet. Write gaps in the client update.

---

### 9. Dashboard — ₱8,000

**Sheet scope:** active tenants, notifications, activity logs; tenant list (name, room, balance, past due); collected by period; deposits by period; vacant rooms; Excel/PDF/print.

**Business job:** Owner sees who is in, who owes, what was collected, what is vacant — and exports it.

**Who:** Admin / owner.

**Where:** `/admin` · `/admin/reports` · `/admin/reports/tenant-list` · `/admin/reports/collected-amount` · `/admin/reports/deposits` · `/admin/reports/vacant-rooms` · `/admin/activity`

#### Dashboard — `/admin`

**See**

- Portfolio: Total collection, Operating expenses, Net income, Occupancy, Late payment rate
- Per property: Occupancy, Collected, Late
- Quick links; Recents (activity feed, filter by category); Stickies
- Link through Recents to full activity

**Do**

- Open alerts / pinned links; pin a link; add a sticky; filter Recents; **View all** activity
- Quick rail (payment / note / maintenance) if shown

#### Reports hub — `/admin/reports`

**See**

- Report directory (search/category): Collected Amount, Deposit, Vacant Rooms, Tenant List, plus others

**Do**

- Open a report (export is on the report page, not the hub)

#### Sheet reports (each has **Export Excel**, **Export PDF**, **Print**)

| Report | URL | You see |
| --- | --- | --- |
| Tenant List | `/admin/reports/tenant-list` | Filters: Tenant Status, Building. Stats: Total Tenants, Total Balance, Total Past Due, Tenants with Balance. Columns: name, room, balance, past due |
| Collected Amount | `/admin/reports/collected-amount` | Period presets + start/end. Total Collected, Total Payments, Average, Growth |
| Deposit Received | `/admin/reports/deposits` | Period + dates. Total Deposits, Refunds, Net Balance, Transactions |
| Vacant Rooms | `/admin/reports/vacant-rooms` | Building filter. Total Vacant, Total Rooms, Vacancy Rate, Est. Lost Rent |

**Pass**

- [ ] Dashboard loads occupancy and collection without an error
- [ ] Recents / `/admin/activity` shows recent actions
- [ ] Tenant list: name, room, balance, past due
- [ ] Collected amount for month / quarter / 6 months / year (or date range)
- [ ] Deposits by period
- [ ] Vacant rooms by building
- [ ] Each of those four: Export Excel, Export PDF, Print

**Makes sense?** Can the owner export vacant rooms and this month’s collections without you?

**Video:** none — **record:** “How to read the dashboard and export a report.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** Export all four reports. Note any missing format.

---

### 10. Bills and Expenses Page — ₱8,000

**Sheet scope:** electric and water per room; misc expenses (Cleaning, Maintenance, Repair, Upgrade, Garbage Collection, etc.); expense reports by period; Excel/PDF/print.

**Business job:** Office enters electric/water per unit and other costs, then sees totals.

**Who:** Admin.

**Where:** `/admin/bills-expenses/utility-bills` · `/admin/bills-expenses/utility-bills/new` · `/admin/financial/expenses` · `/admin/financial/expenses/new` · `/admin/bills-expenses/reports`  
(`/admin/bills-expenses` redirects to utility bills.)

#### Room utility bills — `/admin/bills-expenses/utility-bills`

**See**

- Stats: Total Amount, Pending, Paid, Overdue
- Search; Building; Utility Type (**Electricity** / **Water**); Status (Pending / Paid / Overdue / Disputed); From/To date
- Table of room utility bills
- Empty: “No room utility bills found”

**Do**

- **Add Bill**
- Row: **Mark as Paid**, **Delete**; open detail

#### Add bill — `/admin/bills-expenses/utility-bills/new`

**See / fill**

- Scope, Building, Unit/Room
- Utility Type: **Electric** / **Water**
- Allocation method, unit group / floor, provider, account number
- Billing period start/end, due date, amount, meter readings, usage unit, status, notes

**Do**

- Create the bill

#### Expenses — `/admin/financial/expenses`

**See**

- Stats: Total Amount, This Month, Top Category, Average
- Search; Category (Cleaning, Maintenance, Repair, Upgrade, Garbage collection, Food allowance, Fuel / diesel, Staff salary, Refund, Cash allowance, Other); Building; Vendor; dates
- Empty: “No expenses found”

**Do**

- **Record Expense**; **View** a row
- New/edit: Amount, Category, Description, Expense Date, Building, Unit/Room, Vendor, Notes; delete from detail if offered

#### Expense reports — `/admin/bills-expenses/reports`

**See**

- Report type: **Summary by category** / **Detail list**
- Period: This month … This year (covers month / quarter / 6 months / annual)
- Building; empty “No report yet”

**Do**

- **Generate**; then **Print**, Export PDF, Export Excel

**Pass**

- [ ] Add an electric bill for a room; it shows on the list
- [ ] Add a water bill for a room; it shows on the list
- [ ] Mark as Paid; refresh; status holds
- [ ] Record a misc expense (e.g. Cleaning or Garbage collection)
- [ ] Generate summary and detail reports for a period
- [ ] Print / PDF / Excel from the bills-expenses report

**Makes sense?** Can they enter last month’s electric the way they already track it?

**Video:** none — **record:** “How to enter electric, water, and an expense.”

**Status:** Built → next: Testing + video  
**Client approval:**  
**Next action:** Enter one electric, one water, one expense. Generate the report.

---

## Video scripts (use for every new recording)

Keep each video 2–5 minutes.

1. Who this is for and what problem it solves (10 seconds).
2. Starting screen (show the URL or sidebar name).
3. Normal job, slowly, with a real building name (Balibago / Villasol) and a real unit if safe.
4. One rule (“Wait for the office to confirm a receipt before the balance changes”).
5. One mistake (missing tenant, empty required field).
6. End on the expected result.

**Already on Sheet (rewatch, replace only if outdated):**

| Item | Link |
| --- | --- |
| 1 Properties | https://youtu.be/FMtdtEfb6Qo |
| 2 Login | https://youtu.be/x26uMtg5-M8 |
| 3 Tenants | https://youtu.be/TqvMvbZwWf4 |
| 4 Lease | https://youtu.be/GYHeKOmJclI |
| 4 Lease | https://youtu.be/kM-PyhG5zNM |

**Still to record for Phase 1:** items 5, 6, 7, 8 (two clips), 9, 10.

---

## Client update (send when a batch is Ready for review)

```
Alfonso Apartment — Phase 1 update — [date]

Built (already in the app). This note is for your review.

Ready for you:
- [item name] — [video link]
- Please try: [one sentence job]
- Question: Does this match how you do it today?

Still testing:
- [items]

Needs your decision:
- Online payment: keep receipt upload, or add PayMongo?
- Listing website: show to prospects now?
- Late fee: how many days after due date, and how much?

Next: [next Phase 1 items]
Phase 2: after Phase 1 is approved.
```

---

## Phase 2

Phase 2 is also built on Sheet (**₱115,000**). Use **[ALFONSO-PHASE-2.md](./ALFONSO-PHASE-2.md)** for See / Do / Pass, videos, and approval.

Do not send Phase 2 to the client until Phase 1 is Ready for review or Approved.

---

## This week — concrete list

1. Rewatch videos 1–4. If a screen does not match, note it; do not block on a remake unless the flow is wrong.
2. Test #2 Login and #1 Properties. Tick the checklists above.
3. Test #3 Tenants including occupants + emergency contact.
4. Test #4 Lease: open one existing lease; do not wipe live occupancy.
5. Test #6 Payments + record “How to record a rent payment.”
6. Test #8 Tenant Portal bullet by bullet + record the two short videos.
7. Send the client the template with those links and three questions (receipt vs PayMongo, listing live?, late fee rule).
8. Only then: documents, bills, dashboard, listing.

Do not mark Phase 1 complete on Sheet until **Approved** is filled for items 1–10.
