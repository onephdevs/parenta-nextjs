---
# Job: Add or update a building and rooms

**Replaces:** Excel / notebook lists of units, monthly rates, and deposit rules for Balibago and Villasol.

**Who does this:** Office admin

**When:** A new building or room is added, or rent / deposit amounts change.

## Steps
1. Sidebar **Properties** (`/admin/properties`). Click **Add**. **Basic info:** **Building name**, **Building type** (**Residential**, **Commercial**, **Mixed Use**). **Location:** **Region**, **City** (required). **Deposits & advance:** **Deposit type**, **Months of rent** (or **Deposit amount** / **Deposit percentage**), **Minimum deposit floor**, **Advance type**, **Utility deposit amount**. Click **Create building**.
2. With the building selected, click **Add Room**. **Room number**, **Room type**, **Monthly rate (₱)**. Click **Create room**.
3. To change a building: **Edit property** → **Update building**. To change a room: open the room → **Edit Room** → **Monthly Rent (₱)** / **Deposit (₱)** → **Save Changes**.

## Also on this page
- **Search** (left list) — placeholder **Search**; finds properties by name. Aria: **Search properties**.
- **Sort** — **Name A–Z**, **Name Z–A**, **City A–Z**, **Most vacant**.
- **Filter** — **Occupancy**: **All properties**, **Has vacant rooms**, **Fully occupied**.
- No pagination on the property list. No bulk edit/delete. No export or print.
- **Add** — opens Add building (not a separate page).
- Building card: **Rooms** / **Tenants** counts; expand rooms (**Expand rooms** / **Collapse rooms**).
- Detail empty state: **Select a property**.
- Right rail (**Property actions**): **Record Payment**, **Add note**, **Add Tenant**, **Add Room**, **Maintenance**.
- Tabs: **Overview**, **Rooms**, **Maintenance**.
- Photo: **Change photo** or **Add property photo**.
- **Open on Google Maps** — if a pin is saved.
- **Show on landing page** — featured properties and What’s nearby. Blocked when all landing slots are used.
- Menu: **Edit property**, **Manage rooms**, **Delete property**.
- Overview **Collection of Rent**: **Show by** month; **Rent Outstanding**, **Rent Collected**, **Total Rent**, **Processing**; **Total units**, **Occupied**, **Vacant**, **Unassigned**; table **Vacant units — days vacant & estimated lost rent**.
- **Notes** on the property.
- Rooms tab: search **Room, tenant, type...**; **Status** **All Status** / **Occupied** / **Vacant** / **Unassigned**; buttons **Record Payment**, **Add Room**; columns **Unit**, **Status**, **Date**, **Rent**; pagination 20 per page.
- Maintenance tab: search **Ticket, title, tenant, unit...**; Status and Priority (**Urgent**, **High**, **Medium**, **Low**); **View all**, **Add Request**.
- Add building sections also: **Nearby places** (**Get latest from OpenStreetMap**, **Save nearby places**, **Add** per category, **Remove**); **Details** (**Description**, **Year built**, **Total floors**, **Amenities**); **Photos** (blocked until name + region + city — **Enable photo upload**; **Take property photo**; gallery **Primary** / **Delete**).
- **Delete property** / **Delete Building**: confirm **Delete Building?** — type **DELETE**; removes rooms, assignments, images, history. Cannot be undone.
- **Add Room** bulk: **Single** / **List** / **Range**; submit **Create room** or **Create {n} rooms** (max 100). Same type and rate apply to the batch.
- **Edit Room** sections: **Basic Info** (includes **Unit purpose**: **Residential (rent)**, **Store / commercial (rent)**, **Admin / owner (utilities only, no rent)**), **Details**, **Pricing**, **Deposit** (**Require deposit for reservation**), **Description**, **Amenities**. Nav **Delete Room**.
- Room detail (`/admin/rooms/[id]`): **Edit Room**, **Delete**, **Tenant assignment**, **Add Occupant**, **End Assignment**, **Assign Tenant**, **Add Tenant**, **Make Payment**, **View profile**, **Payment Reminder**, photos (**View photos** / **Add room photo**), **Tenancy History**. Not in the sidebar — open a unit from Properties.
- Rooms master list `/admin/rooms` is not in the sidebar (Reports → **Room Status Report**). Search, **Add**, sort, building filter, status filter. No export/print/pagination/bulk there.
- `/admin/buildings` redirects here.

## Done when
The building is in the Properties list after refresh. The room shows the rate you entered. Deposit rules appear under **Deposits & advance**.

## Watch out for
**Create building** needs **Building name**, **Region**, and **City**. Photo upload stays blocked until those are saved.

## Video
[link placeholder]
---
