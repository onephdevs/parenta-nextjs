---
# Job: Move-out (unit becomes vacant, history retained)

**Replaces:** Crossing the name off Excel and leaving the unit “empty” in the notebook, while keeping past occupancy.

**Who does this:** Office admin

**When:** The tenant’s last day; the room must be free for the next occupant. To end the contract on paper without emptying the room, use **Give notice (terminate on paper)** instead.

## Steps
1. Optional inspection worksheet: **Leasing** → **Move-outs** → **Start move-out** (also on the lease detail). Pick **Occupied lease** and **Planned move-out date**. This does **not** empty the room.
2. To vacate: **Properties** → open the occupied room (`/admin/rooms/[id]`), or **Leasing** → open the lease. Under **Tenant assignment** / **Current Tenant**, click **End Assignment**.
3. In **End Tenant Assignment**, set **End Date**, optional **Notes**, then **End Assignment**. If a worksheet is open: **Move-outs** → fill **Actual move-out date** and refund fields → **Finalize move-out & refund**.

## Also on this page
**Leasing** (`/admin/leasing`)
- Title: **Tenant room assignments, renewals, and move-outs**.
- Tabs: **All leases**, **Expiration alerts**, **Renewals**, **Move-outs**.
- Header: **New tenant**, **New lease**; on Move-outs: **Start move-out**; on Alerts: **Generate Alerts**.
- Leases search: **Tenant, unit...** **Status:** **All Status**, **Active**, **Expiring soon**, **Notice given**, **Draft**, **Terminated**. **Building:** **All Buildings**. Pagination on leases. No sort / bulk / export / print.
- Summaries: **Active**, **Expiring soon**, **Notice given** (**ended on paper, still occupying**), **Draft**, **Terminated**.
- Move-outs empty: **Start a move-out to open the inspection worksheet. The unit stays occupied until you finalize.**

**Start move-out**
- **Creates the inspection worksheet. The room stays occupied until you finalize move-out.**
- Reuses an open worksheet if one already exists.

**Inspection** (`/admin/leasing/moveouts/[id]`)
- **Held funds:** **Security deposit**, **Advance**, **Utility deposit**, **Total held**.
- Checklist: **Item**, **Finding** (**Pending**, **Pass**, **Fail / deduct**, **N/A**), **Deduction (₱)**, **Notes**. **Use checklist totals in refund fields**. **Save inspection**.
- Fields: **Inspection notes**, **Actual move-out date**, **Deposit return**, **Deposit deduction**, **Advance return**, **Utility deposit return**, **Deduction reason**.

**Room — End Assignment** (`Tenant assignment`)
- Occupied: **Add Occupant**, **End Assignment**. Vacant: **Assign Tenant**.
- **Tenancy History** (kept after move-out). Badges **Current**, **Renewed**, **Terminated**.
- Assign Tenant fields: **Select Tenant**, **Start Date**, **Monthly Rate (₱)**, **Lease Template**, deposits, **Notes**.

**Lease detail**
- **Start move-out**, **Terminate**. No **End Assignment** on this screen — vacate from the room or Finalize.

**After vacate**
- Person stays in history; Tenants **Status: Former tenants** (inactive). They are not deleted.

## Done when
After refresh the room is vacant and the person still appears in tenant / lease history. Toast: **Tenant unassigned successfully!** (End Assignment) or **Move-out finalized**.

## Watch out for
**End Date** is required. **Terminate** only ends the contract on paper (**Notice given**). The unit stays occupied until **End Assignment** or **Finalize**. **Start move-out** alone does not vacate.

## Video
[link placeholder]
---
