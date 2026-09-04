# QA test plan — Tenants

**Routes:** `/admin/tenants`, `/admin/tenants/new`, `/admin/tenants/[id]`  
**Source:** `TenantForm.tsx`, `EditTenantForm.tsx`, `TenantsList.tsx`, `POST /api/tenants`, `PUT/DELETE /api/tenants/[id]`, `GET /api/tenants/check-email`  
**Training job:** [add-tenant.md](../training/add-tenant.md)

| # | Scenario | Steps | Expected result | Priority |
| --- | --- | --- | --- | --- |
| 1 | Happy path: create a tenant with portal email | **Tenants** → **Add Tenant**. First **Rosa**, last **Cruz**, email `rosa.cruz.{stamp}@parenta.test`, phone `09171234800`. **Create Tenant**. | Dialog **Tenant account created** with a temporary password. **Continue to tenant** opens the profile. Person is on the list after refresh. | Critical |
| 2 | Required field validation: first name, last name, and email | Open **Add Tenant**. Submit empty. Fill first+last only → **Create Tenant**. | Form is `noValidate`. Errors: **First name is required**, **Last name is required**, **Email is required**. API: **First name and last name are required**; portal login also needs email or username. | Critical |
| 3 | Invalid input: email format and negative monthly rent | Enter email `not-an-email`. With a room selected, set **Monthly Rent (₱)** to `-1`. | **Email is invalid**. **Monthly rent cannot be negative**. | Important |
| 4 | Duplicate email is rejected | Add Tenant with **Email** `admin@parenta.com` (office login) → **Create Tenant**. | **This email is already in use. Choose a different email to continue.** API duplicate: **409 Email already exists**. | Critical |
| 5 | Edit/update an existing tenant | Open the QA tenant → **Edit Tenant Information** or `/edit`. Change last name to `Cruz-Reyes` → **Save** / **Save Changes**. | Profile shows **Rosa Cruz-Reyes** after save. | Important |
| 6 | Delete/deactivate: no office Delete button; occupancy history is protected | On the tenant profile and list, look for **Delete**. Then `DELETE /api/tenants/{id}` for a person with an assignment. | **No Delete control in the UI** (history is kept). API without `?mode=deactivate` returns **409** `Cannot delete person with occupancy history` / `HISTORY_PROTECTED`. `?mode=deactivate` sets `tenant_status=inactive` and keeps assignment rows. | Critical |
| 7 | Room assignment requires lease template, start date, and rent | Add Tenant, pick Property + Room, leave template and start date empty, rent `0` → **Create Tenant**. | **Monthly rent is required when assigning a room**. **Select a lease template**. **Lease start date is required when assigning a room**. | Critical |
| 8 | Data persists correctly after a page refresh | Create Rosa Cruz, reload `/admin/tenants`, search her email. | She still appears. Profile still has the same email. | Critical |
| 9 | Permission check: tenant cannot open the Tenants admin list | Unauthenticated GET `/admin/tenants`. Tenant session GET `/admin/tenants`. | Both redirect to `/auth/signin`. Caretaker is not a distinct office role. | Critical |
| 10 | Search tenants by name, email, or unit | `#tenant-search` placeholder **Name, email, phone, or unit...**. Search `Rosa Cruz` / the unique email, then a nonsense string. | Match shows the card. Nonsense yields an empty list (or no matching cards). | Important |
| 11 | Filter tenants by building | **Building** (`#tenant-property`) → a Balibago/Villasol property, then **Unassigned**. | Assigned people hide when Unassigned is selected; unassigned QA tenant (no room) appears under Unassigned. | Important |
| 12 | Filter tenants by status | **Status** (`#tenant-status`) → **Current tenants**, **Former tenants**. | Current occupancy vs former (inactive) list changes. | Important |
| 13 | Sort tenants | **Sort** (`#tenant-sort`) → **Last Name**, toggle direction if shown. | Select value is **Last Name**; list remains populated. | Nice-to-check |
| 14 | Export on Tenants | Look for export/print/bulk on the list. | **No bulk actions. No export** (training). | Nice-to-check |
