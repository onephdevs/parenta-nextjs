---
# Job: Start a lease from Leasing

**Replaces:** Writing a new occupancy line in Excel for someone who is already in Tenants but not in a room.

**Who does this:** Office admin

**When:** The person already exists without a current room, and a vacant unit is ready. New people: use **Add Tenant** or **New tenant** instead.

## Steps
1. Sidebar **Leasing** (`/admin/leasing`). Click **New lease**.
2. Fill **Tenant**, **Property**, **Room**, **Lease template**, **Start date**, **Monthly rent (₱)**. **End date** fills from the template (or stays open-ended).
3. Click **Create lease**.

## Also on this page
- Dialog: **Assign an existing tenant to a vacant room. Use New tenant if they are not in the system yet.**
- **Cancel**. **Lease Template Summary** after you pick a template.
- Tenant list is only people **without a current room**. Empty: **No unassigned tenants.**
- Rooms: vacant only. **No vacant rooms** if the property is full.
- **New tenant** on the same page runs Add Tenant.
- Tabs **All leases**, **Expiration alerts**, **Renewals**, **Move-outs** — see those jobs.
- Search **Tenant, unit...**; **Status**; **Building**. Pagination on leases. No bulk/export/print.
- Lease detail: **Start move-out**, **Terminate**.

## Done when
Toast **Lease created** (or the API success message). You land on the lease detail. After refresh the room is occupied.

## Watch out for
**Select a lease template.** Only unassigned tenants appear — if they already occupy a unit, **End Assignment** first or use **Add Tenant** for a new person. This does not email a temporary password.

## Video
[link placeholder]
---
