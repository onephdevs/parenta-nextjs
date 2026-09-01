# Alfonso Apartment — feature scope criteria

**Source:** Excel tab **Sheet**.  
**Use:** Tick these to decide what each existing feature includes, what it does not include, and when it passes.  
**Rule:** If it is not on this list, it is out of scope unless the client pays a change request (₱700/hour after two revisions, per Sheet).

Phase 1 is the current focus. Phase 2 is already built; its criteria are here so you do not mix it into Phase 1 review.

---

## How to use a row

For every feature, three lists:

| List | Meaning |
| --- | --- |
| **In scope** | Must work. This is what Sheet paid for. |
| **Out of scope** | Do not treat as missing. Do not demo as promised. New work = change request. |
| **Pass** | You can send it to the client when every pass line is true. |

Also apply the **universal criteria** below to every feature.

---

## Universal criteria (every feature)

**In scope**

- The user named in the feature can open the screen and finish the job without the developer.
- Create / read / update (and delete where the screen has Delete) actually save.
- Required fields are validated. Errors are visible.
- After refresh, saved data is still correct.
- Empty list / first-time state is usable (not a blank crash).
- Admin cannot be used by a tenant; tenant cannot use admin screens.
- Labels match the business: building, unit/room, tenant, rent, deposit, advance, electric, water.

**Out of scope (unless that feature’s Sheet bullets say otherwise)**

- Mobile native apps, SMS, Facebook, chatbots.
- PayMongo / card gateway (client decision; not a Sheet line item).
- New reports, new boards, new roles, or redesigns.
- Importing the whole historical Excel ledger automatically.
- Pixel-perfect copy of their Google Sheet layout.
- Staff training beyond a 2–5 minute video per job.

**Pass**

- [ ] Happy path works.
- [ ] One invalid/missing input is blocked.
- [ ] Data survives refresh.
- [ ] Correct role can do it; wrong role cannot.
- [ ] A new staff member can find the screen from the sidebar name.

---

## Phase 1

### 1. Properties Page — ₱9,025

**In scope**

- Buildings (properties): list, view, add, edit.
- Units/rooms under a building: list, view, add, edit (rate and unit details).
- Occupied vs vacant is visible from the unit.
- Assets: list, view, add, edit, assign to a room where the screen supports it.

**Out of scope**

- Public listing of vacancies (that is #7).
- Meter readings and splitting bills (Phase 2 Utilities).
- Pipeline / inquiries (Phase 2 Tasks).

**Pass**

- [ ] Open APARTMENT-1 BALIBAGO and APRTMENT-2 VILLASOL; rooms match what the office knows.
- [ ] Edit one unit; refresh; change is still there.
- [ ] Open assets; one asset is tied to a room (or you can assign it).

---

### 2. Login and Registration — ₱7,028.75

**In scope**

- Admin sign-in → admin dashboard.
- Tenant sign-in → tenant portal.
- User type is approved by admin (unapproved / wrong role does not enter the other portal).
- Registration / account creation as implemented for the roles you already have.

**Out of scope**

- Google / Facebook / OTP login.
- Tenant self-signup without office approval (unless you already shipped that and the client uses it).
- Staff role as a separate paid product (Users is Phase 2; no price on Sheet).

**Pass**

- [ ] Admin lands on `/admin`.
- [ ] Tenant lands on `/tenant`.
- [ ] Wrong password shows an error.
- [ ] Tenant cannot open `/admin`.

---

### 3. Tenants Page — ₱8,000

**In scope**

- Tenant list, view, add, edit.
- Occupants on the tenant.
- Emergency contact person (name, phone, relationship).
- Link between tenant and unit (assignment shown on the tenant).

**Out of scope**

- Full lease generate/designer (Phase 2 Lease Designer).
- Pipeline screening of prospects (Phase 2 Tasks).
- People directory extras that are not tenant / occupant / emergency contact.

**Pass**

- [ ] Open a tenant; occupants are visible or can be added.
- [ ] Emergency contact saves and reopens.
- [ ] Tenant shows which unit they occupy (or vacant / none).

---

### 4. Lease Page — ₱8,000

**In scope**

- Lease record: tenant + room + dates + rent (and deposit if the form has it).
- See active leases.
- Start a lease (assign occupancy).
- End / move-out so the room becomes vacant and history remains.

**Out of scope**

- Visual lease PDF designer and merge templates (Phase 2).
- Full onboarding kanban (Phase 2 Tasks).
- Automatic contract e-signature (DocuSign, etc.).

**Pass**

- [ ] Open an existing lease; tenant, unit, dates, rent are correct.
- [ ] Occupied room has an active lease; vacant room does not.
- [ ] Move-out / end lease is possible without deleting the person.

---

### 5. Documents Page — ₱8,000

**In scope**

- Admin/landlord can upload and open documents.
- Tenant can upload/create (as allowed) and open their documents.
- Documents can be found again (list, tenant, or category).

**Out of scope**

- Building the lease layout / templates (Phase 2).
- Google Drive / Dropbox sync.
- Unlimited file types/sizes beyond what the uploader already allows.

**Pass**

- [ ] Admin uploads a file and can open it after refresh.
- [ ] Tenant sees only their files.
- [ ] File is findable from the tenant or documents list.

---

### 6. Payments Page — ₱8,000

**In scope**

- Record a payment: tenant/unit, amount, method, date.
- Payment list and payment on the tenant.
- Penalties (record or show; automatic rules are Phase 2 Late Fees).
- Online payment *option* as it exists today (instructions + receipt upload counts; a card gateway does not have to be live).

**Out of scope**

- PayMongo / automatic bank posting (client decision, extra).
- Invoice generate/send workflow (Phase 2 Invoices).
- Auto late-fee invoices (Phase 2 Late Fees).
- Matching the Jun 16–Jul 15 Excel ledger line-by-line as a built-in importer.

**Pass**

- [ ] Record a rent payment; it appears on the list and the tenant after refresh.
- [ ] Missing tenant or invalid amount is blocked.
- [ ] Method can be GCash / Maya / bank / similar (whatever the form offers).
- [ ] Online option: either pay link works, or receipt upload + office confirm is the documented option.

---

### 7. Property Listing Website — ₱8,000

**In scope**

- Public page (no login) showing vacant / available properties.
- Prospect can search or browse vacancies.
- Prospect can reach the office (form or contact).

**Out of scope**

- Paid ads, SEO retainers, Facebook Marketplace posting.
- Booking calendar / online reservation with payment.
- Turning every occupied unit into a public listing.

**Pass**

- [ ] `/` loads logged out.
- [ ] Vacant units (or portfolio) are visible; occupied is not sold as vacant.
- [ ] Inquiry or contact reaches the office (or you can show where it lands).

---

### 8. Tenant Portal — ₱14,000

**In scope (every Sheet bullet)**

- Payment schedule and history.
- Upload receipt.
- Documents.
- Profile including occupants and emergency contact.
- Online payment option (same rule as #6: live pay or receipt path).
- Balance and due date.
- Automatic late fee on balance after N days from due date (or the setting exists and N is configurable).
- Printable receipt of the tenant’s payment.
- Reports downloadable Excel or PDF and printable.

**Out of scope**

- Tenant can edit rent, delete invoices, or see other tenants.
- PayMongo unless the client chooses it.
- Maintenance submit (Phase 2 Maintenance) — it may exist in the app; do not fail Phase 1 #8 if you are only scoring Sheet #8, but do not hide it from the client if you demo the portal.

**Pass**

- [ ] Tenant sees schedule/history.
- [ ] Tenant can upload a receipt.
- [ ] Tenant can open documents.
- [ ] Profile: occupants + emergency contact.
- [ ] Balance + due date shown.
- [ ] Late fee after N days: works or N is settable; if not, it is a gap to report, not silent skip.
- [ ] Print a receipt.
- [ ] Export or print a report (Excel and/or PDF).

---

### 9. Dashboard — ₱8,000

**In scope**

- List of active tenants.
- Notifications (as implemented on the dashboard).
- Activity logs reachable from this area (Phase 2 also has a dedicated Activity Logs item — seeing the log from dashboard/nav is enough for Phase 1).
- Report: tenant name, room #, balance, past due.
- Report: collected/received amount by month, quarter, six months, annual.
- Report: total deposit received by month, six months, annual.
- Report: vacant rooms/apartments.
- Those reports: Excel or PDF download and printable.

**Out of scope**

- Full P&L, cash-flow charts, building analytics (Phase 2 Financial Dashboard).
- Disbursement / “Ima cash” / hardware cheque waterfall unless you treat it as extra.
- Real-time SMS notifications.

**Pass**

- [ ] Dashboard loads without a fatal error.
- [ ] Active tenants are listed or summarized.
- [ ] Tenant-list report has name, room, balance, past due.
- [ ] Collected-amount report can be limited to a period (month / quarter / 6 months / year).
- [ ] Deposit report by period.
- [ ] Vacant-rooms report.
- [ ] At least Excel or PDF (or print) works for those reports.

---

### 10. Bills and Expenses Page — ₱8,000

**In scope**

- Electric bill per room/apartment.
- Water bill per room/apartment.
- Misc expense data entry: cleaning, maintenance, repair, upgrade, garbage collection, etc.
- Expense reports: detail + summary by month, quarterly, six months, annual.
- Those reports: Excel or PDF and printable.

**Out of scope**

- Meter reading capture and split formulas (Phase 2 Utilities) — entering the peso amount per room is enough for Phase 1.
- Auto-download from Meralco / Maynilad.
- Payroll as a full HR module (salary as a misc expense line is enough if they enter it).

**Pass**

- [ ] Save electric for a room.
- [ ] Save water for a room.
- [ ] Save one misc expense with a category.
- [ ] Open a period report; totals are visible.
- [ ] Export or print that report.

---

## Phase 2 (built; review after Phase 1)

### P2-1. Tasks (Pipeline) — ₱20,000

**In scope**

- Kanban boards: Onboarding, Payments, Expenses, Maintenance, plus custom boards.
- Create, edit, move cards across stages.
- Card fields: contact, property/unit, screening, documents, payment, lease.
- Onboarding flow: prospect docs, screening, deposit confirmation, generate lease.
- Assign owners, tags, schedule, call/message actions.
- Manage stages, board settings, search/filter, bulk move/delete.

**Out of scope**

- Telephony provider, auto-dialer, WhatsApp Business API.
- Replacing the whole Payments / Expenses / Maintenance modules (boards track work; they do not have to be the only place money is recorded).

**Pass**

- [ ] Move a card across stages; it stays after refresh.
- [ ] Create a card with contact + unit.
- [ ] Search/filter works.
- [ ] Custom board or stage can be managed.

---

### P2-2. Maintenance — ₱10,000

**In scope**

- Tenant submits: title, description, category, priority.
- Tenant sees status and admin notes/schedule.
- Admin: list, search, filter by status, priority, category.
- Admin updates: status, priority, assignee, scheduled/completed dates, notes.
- Stats: open, in progress, completed, urgent/high.

**Out of scope**

- Contractor marketplace, inventory auto-deduct, photo AI.
- SLA clocks / penalties unless already built.

**Pass**

- [ ] Tenant submits a request.
- [ ] Admin updates it; tenant sees the new status.
- [ ] Filters and stats match the list.

---

### P2-3. Users — (no price on Sheet)

**In scope**

- List admin users with active/inactive.
- Create admin: name, email, username, password.
- Edit admin profile.
- Reset password.
- Activate / deactivate.

**Out of scope**

- Fine-grained permissions per screen (unless already built).
- SSO.

**Pass**

- [ ] Create an admin, log in as them, deactivate them, they cannot log in.

---

### P2-4. Utilities (meter readings & cost allocation) — ₱10,000

**In scope**

- Record meter readings (electricity, water, gas, internet, etc.) by building.
- View recent readings and stats.
- Allocation rules: equal, usage, room size, custom, landlord share.
- Calculate and allocate a bill to rooms/tenants.
- Generate and review tenant utility charges.

**Out of scope**

- Smart-meter hardware.
- Phase 1 “type the peso amount per room” is not a substitute for this item — this item is the split.

**Pass**

- [ ] Save readings for a building.
- [ ] Run one allocation; room shares add up to the bill (minus landlord share if used).
- [ ] Review the tenant charges.

---

### P2-5. Invoices — ₱10,000

**In scope**

- Create and manage invoices: draft, sent, paid, overdue, cancelled.
- Detail: line items, amounts paid/due.
- Record payment against an invoice.
- Print invoice.
- Summary: paid, unpaid, overdue, total.

**Out of scope**

- BIR-accredited invoicing / official receipts as a legal e-invoice.
- Auto-email every invoice unless Notifications (P2-9) is also accepted.

**Pass**

- [ ] Create an invoice with line items.
- [ ] Mark/record payment; paid vs due is correct.
- [ ] Print.
- [ ] Summary counts match the list.

---

### P2-6. Late Fees — unpriced on Sheet (`-`)

**In scope**

- Configure rules: percentage, flat, tiered.
- Grace period and apply-after days from due date.
- Maximum fee caps (building or global).
- Calculate eligible overdue invoices and review amounts.
- Apply (creates late-fee invoices) or dry-run.

**Out of scope**

- Lawyer demand letters.
- Interest compounding beyond the configured rule.

**Pass**

- [ ] Set grace days + a rule.
- [ ] Dry-run shows eligible invoices.
- [ ] Apply creates the fee; tenant balance reflects it (with #8).

---

### P2-7. Lease Designer & Templates — ₱15,000

**In scope**

- Visual designer: sections, text, tables, signature blocks.
- Merge variables and printable preview.
- Save lease templates.
- Document templates by category: lease, invoice, notice, agreement, receipt, report.
- Generate documents from templates.

**Out of scope**

- Lawyer-certified contract.
- Multi-language legal localization unless already in the designer.

**Pass**

- [ ] Open designer; preview prints.
- [ ] Save a template.
- [ ] Generate a document for one tenant with merge fields filled.

---

### P2-8. Settings — ₱10,000

**In scope**

- Notification preferences.
- Security / profile settings.
- Tenant payment details (GCash, Maya, bank, instructions).
- Accepted payment methods shown to tenants.
- System status / maintenance-style options.

**Out of scope**

- Hosting, DNS, and Vercel billing.
- Changing database or adding environments.

**Pass**

- [ ] Save GCash/Maya/bank text; tenant can see it.
- [ ] Profile/security settings save.
- [ ] Notification preference save (or clearly disabled).

---

### P2-9. Notifications — ₱10,000

**In scope**

- Payment reminders from invoice due dates.
- Process notification queue (send pending).
- Types: overdue, payment confirmation, invoice, lease expiry.

**Out of scope**

- SMS / Viber blast unless already wired.
- Marketing newsletters.

**Pass**

- [ ] A due reminder can be generated.
- [ ] Queue can send pending items.
- [ ] At least one type actually arrives (email or in-app).

---

### P2-10. Activity Logs — ₱10,000

**In scope**

- Filterable feed: category, action type, date range, search.
- Actor and field changes / diffs.
- Audit trail of admin and system actions.

**Out of scope**

- Immutable legal archive / SIEM export.

**Pass**

- [ ] Edit a tenant; the log shows who changed which field.
- [ ] Filters narrow the feed.

---

### P2-11. Reports Hub — ₱10,000

**In scope**

- Tenant list (name, room, balance, past due).
- Collected / received amount by period.
- Deposit totals by period.
- Vacant rooms by building.
- Download Excel/CSV or PDF and printable.

**Out of scope**

- Custom report builder, scheduled email of every report.

**Note:** Overlaps Phase 1 #9. For Phase 2 pass, the hub as a dedicated reports area must meet the bullets (not only widgets on the home dashboard).

**Pass**

- [ ] Each of the four reports opens from the reports hub.
- [ ] Period can be chosen.
- [ ] Download or print works.

---

### P2-12. Financial Dashboard & Analytics — ₱10,000

**In scope**

- Monthly/yearly revenue, outstanding receivables, occupancy rate.
- Revenue charts and recent payments timeline.
- P&L-style: revenue, expenses, net income by date range.
- Analytics by building and period (monthly, quarterly, yearly).
- Charts: occupancy, utilities, building performance, cash flow.

**Out of scope**

- Audited financial statements, BIR books.

**Pass**

- [ ] Dashboard shows revenue, receivables, occupancy.
- [ ] Date range changes the numbers.
- [ ] P&L and at least occupancy + one money chart render.

---

## In the app but not a Sheet line item

Do not fail Phase 1 because these exist. Do not promise them as paid Sheet items unless you add a change order.

| Screen | Treat as |
| --- | --- |
| People (`/admin/people`) | Extra / support for tenants |
| Unit groups | Extra under bills |
| Payment gateways / PayMongo | Client decision |
| Community | Extra |
| Bulk operations | Extra |
| History import tool | Extra |
| Disbursement / unit-month / portfolio ledger reports | Extra vs Sheet #9 / P2-11 |
| Notifications page (if beyond P2-9) | Confirm against P2-9 bullets only |
| Tenant maintenance | Score under P2-2, not Phase 1 #8 |

---

## Client decisions that bound scope (ask once)

These are not extra features. They decide whether a **pass** line is “works” or “documented gap.”

1. **Online payment:** receipt upload + office confirm, or PayMongo.
2. **Listing website:** show to prospects now, or office-only for now.
3. **Late fee:** number of days after due date, and % or peso amount.
4. **Users / Late Fees price:** Sheet has Users with no cost and Late Fees as `-`. Confirm they are included in Phase 2 or billed separately.

Until the client answers 1–3, you may **pass** the feature with the gap written in the update. You may not call it Approved.
