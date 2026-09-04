---
# Job: Put a person in a unit (lease + portal login)

**Replaces:** Excel tenant rows plus a handwritten or Messenger password for the portal.

**Who does this:** Office admin

**When:** Someone is already moving in and needs a lease and a login. For a new inquiry, use **Inquiry → occupied unit** instead.

## Steps
1. Sidebar **Tenants** (`/admin/tenants`). Click **Add Tenant**. (From a vacant unit you can click **Add Tenant** on **Properties**; **Property** and **Room** stay locked.)
2. **Personal Info:** **First Name**, **Last Name**, **Email** (portal login). **Housing:** **Property**, **Room**, **Monthly Rent (₱)**, **Lease Template**. **Lease:** **Lease Start Date**, **Move In Date**.
3. Click **Create Tenant**. Copy **Temporary password** from **Tenant account created** (also emailed). Click **Continue to tenant**. Give them **Email** + that password and `/auth/signin`.

## Also on this page
**Tenants list**
- Header: **Reservations**, **Add Tenant**. Description: **Manage your tenant relationships**.
- Cards: **Total Tenants**, **Active Tenants**, **Pending Tenants**, **Avg. Income**.
- **Search** — **Name, email, phone, or unit...** (name, email, phone, unit/building).
- **Building** — **All Buildings**, each property, **Unassigned**.
- **Status** — **All Status**, **Current tenants**, **Active**, **Pending**, **Former tenants**.
- **Signal** — **All signals**, **Payment confirmation**, **Escalated**, **Overdue**, **Due today**, **Due soon**, **Awaiting payment**, **Partial payment**, **Rent**, **Bills**, **Water**, **Electricity**, **Maintenance**, **New tenant**, **Pending**, **Unsigned lease**, **Unassigned**.
- **Sort** — **Payment urgency**, **Due date**, **Last Name**, **First Name**, **Property**, **Email**, **Status**, **Income**, **Move-in Date** (toggle **Sort ascending** / **Sort descending**).
- **Group** — **By payment** or **By property**.
- Grid / list view. Pagination 40 per page (**Showing {n} of {total} tenants**).
- No bulk actions. No export.
- Legend: **Overdue**, **Due today**, **Due soon**, **Confirmation**; topics **Rent**, **Bills**, **Water**, **Electricity**, **Maintenance**, **Unsigned**.

**Add Tenant form** (modal; `/admin/tenants/new` also exists)
- Sections: **Personal Info**, **Emergency Contact**, **Employment**, **Housing**, **Lease**, **Notes**.
- Extra fields: **Phone**, **Date of Birth**, **Previous Address**; emergency **Contact Name**, **Contact Phone**, **Relationship**; **Employment Status**, **Employer Name**, **Monthly Income (₱)**; **Override monthly rent**; **Lease End Date**; **Notes**.
- Draft restore: **Draft restored** / **Discard draft**. Unsaved: **Unsaved changes**.
- Success: **Shown once** — password is not shown again. **Copy** / **Copied**.

**Tenant profile** (`/admin/tenants/[id]`)
- **Back**, **Reset password** / **Set portal password**, **Preview portal**, **Add note**.
- Tabs: **Profile**, **Lease**, **Financials**, **Documents**.
- Summary: **Current Balance**, **Total Deposits**; **Lease** menu **Edit** / **Renew** / **Terminate**; **Pay** menu **Regular Payment** / **Voluntary Deposit** / **Advance Payment**; profile photo.
- Profile: **Edit Tenant Information**, **Save** / **Cancel**; **Occupants** + **Add Occupant** (jumps to the room — form is on the room, not this tab).
- Lease tab: **Lease History**, **View**, then **Renew**, **Terminate**, **Edit**, **Download**.
- Financials: **Make a Refund**; billing and payment tables. Empty: **No invoices yet.**
- Documents: see **Issue or store a lease document**.
- Edit page: **Save Changes** (`/admin/tenants/[id]/edit`).
- **Reset password**: **Generate a temporary password** or **Set a password from the office**; **Email the new password to {email}**.
- No office **Delete** button for a tenant (history is kept). Former people: **Status: Former tenants**.

## Done when
The tenant profile opens. After refresh they still appear under **Tenants**, the room is occupied, and they can log in with the email.

## Watch out for
**Email is required.** **This email is already in use** means pick another. A room also needs **Lease Template**, **Lease Start Date**, and **Monthly Rent (₱)**. Later: profile **Reset password**.

## Video
[link placeholder]
---
