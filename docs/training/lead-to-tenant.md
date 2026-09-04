---
# Job: Inquiry → occupied unit (leasing pipeline)

**Replaces:** Facebook / walk-in notes, then a later Excel move-in when they actually take the room.

**Who does this:** Office admin

**When:** Someone asks about a vacant unit and you need to track them through viewing, payment, and lease. If they are already moving in today, use **Add Tenant** instead.

## Steps
1. Sidebar **Tasks** (`/admin/tasks`, board **Onboarding**). Click **Add opportunity**.
2. **Contact:** **First name**, **Last name**, **Email**, **Phone**. **Property:** **Building**, **Room**, **Monthly rent (₱)**. Save with **Create opportunity**. Drag or **Move to stage…** through **New inquiry** → **Viewing scheduled** → **Viewing done** → **Documents** → **Background check** → **Awaiting signature**.
3. Open the card → **Payment**: check **Payment received**. **Lease:** **Lease Start Date** and **Lease Template**, then **Generate lease**. The card moves to **Lease signed**.

## Also on this page
**Board chrome**
- Boards: **Onboarding** (this job), plus **Payments** and **Building expenses** (and maintenance follow-up). Switch boards at the top.
- **Search Opportunities**. **Sort** (cycles updated / title / amount / due). **Kanban view** / **List view**.
- **Advanced Filters:** **Stage**, **Assignee** (**Anyone** / **Unassigned**), **Building**, **Tag**, **Amount min** / **Amount max**, **Due from** / **Due to**. **Clear filters**.
- **Import** — dialog **Import CSV · {board}**. Columns: title, first_name, last_name, email, phone, amount, notes, tags, due_at, source, stage. Max 200 rows. **Load sample row**.
- **Bulk Actions:** **Select all**, **Move to stage…**, **Delete ({n})** (confirm cannot be undone).
- **Configure stages**, **New board**, overflow **Sync pipelines**, **Manage Fields**.
- Archive board: **Archive board?** (can **Unarchive** later).
- No pagination. No export or print.
- Suggested tags: **Hot lead**, **Docs complete**, **Awaiting ID**, **Awaiting income proof**, **BG pending**, **Lease out**, **Budget concern**, **Referral**, **Call back**, **Viewing scheduled**.

**Add opportunity form**
- Sections: **Contact**, **Property**, **Schedule**, **Documents**, **Screening**, **Payment**, **Lease**, **Status**, **Tags**, **Notes** (**History** when editing).
- **Which unit are you interested in?** can stay **Not sure yet / general inquiry**.
- **Schedule:** **Source**, **Viewing date & time**, **Viewing status** (**Not set**, **Scheduled**, **Completed**, **No-show**, **Rescheduled**, **Cancelled**). Saving a viewing date moves the card to **Viewing scheduled**.
- **Screening:** **ID verification / screening**.
- **Payment:** **Total Amount Paid**, **Deposit Amount**, **Payment Type**, **Payment Date**, **Payment Method**, **GCash / bank reference**, **Payment receipt / transfer proof**, **Payment received**.
- **Lease:** **Lease End Date**, **Move In Date**, **Pipeline lease status**. Lock copy: **Mark Payment received first to unlock Generate lease.**
- Edit: **Save changes**, **Delete**. **Lost remarks** if moving to **Lost**.
- Success: **Lease generated — tenant & lease created**. New contacts get an emailed temporary password.

**Other Tasks boards (not this job)**
- Payments: **Add rent payment** / **Create rent follow-up**. Stages include **Upcoming**, **Due**, **Paid**.
- Expenses: **Add bill or expense**.
- Maintenance follow-up: **Create maintenance follow-up**.

## Done when
After refresh, the person is on **Tenants**, the room is occupied, and the card is in **Lease signed**.

## Watch out for
**Generate lease** stays off until **Building**, **Room**, and **Payment received** are set. **Email is required to generate a lease.** Do this on **Onboarding**, not the Payments board.

## Video
[link placeholder]
---
