---
# Job: Split a utility bill across rooms

**Replaces:** Calculator + Excel split of one Meralco or water bill across occupied rooms (vacant share absorbed by the owner).

**Who does this:** Office admin

**When:** A building-wide electric or water bill arrives. For meter-by-meter splits, see **Split a metered bill by readings**.

## Steps
1. Sidebar **Bills & Expenses** → **Utility Bills** (`/admin/bills-expenses/utility-bills`). Click **Add Bill**.
2. **Location:** **Scope** = **Building-wide (common area)**, choose **Building**. **Utility:** **Utility Type** (**Electric** or **Water**), **Allocation method** = **Shared — manual split**. Check **Equal-split across units (creates a per-room share; vacant rooms are owner-absorbed)**. Optional: **Unit group (preferred)** or **Floor filter**. **Period:** **Billing Period Start**, **Billing Period End**, **Due Date**. **Amount:** enter **Amount**.
3. Click **Create Bill**.

## Also on this page
**Room Utility Bills list**
- Cards: **Total Amount**, **Pending**, **Paid**, **Overdue**.
- **Search** — **Room, building, provider...**
- Filters: **Building** (**All Buildings**); **Utility Type** (**All Types**, **Electricity**, **Water**); **Status** (**All Status**, **Pending**, **Paid**, **Overdue**, **Disputed**); **From Date**, **To Date**.
- Pagination 20 per page. No sort. No bulk. No export or print.
- Row icons: **Mark as Paid** (confirm: **Mark bill as paid?** — **This marks the utility bill paid. It does not record a tenant payment.**), **Delete** (confirm: **Delete bill?**).
- Empty: **Get started by adding a new bill**.

**Add Bill form** (also `/admin/bills-expenses/utility-bills/new`)
- Sections: **Location**, **Utility**, **Period**, **Amount**, **Status**, **Notes**.
- **Scope: Specific unit / room** — pick **Unit / Room**; that path does **not** split.
- Other **Allocation method**: **Submetered (per-unit meter)**, **Not applicable (own account)**.
- **Unit group (preferred)** — **None — use floor / all units**. Create groups under **Bills & Expenses → Unit groups**.
- **Floor filter (optional)** — **All floors** or a floor (e.g. Balibago 3rd-floor shared water).
- **Provider / vendor**, **Account Number**, meter **Previous meter reading** / **Current meter reading**, **Usage unit**.
- **Bill Status**: **Pending**, **Paid**, **Overdue**.

**Bill detail** (`/admin/bills-expenses/utility-bills/[id]`)
- Read-only: **Overview**, **Bill details**, **Location**, **Usage**, **Notes**, **Record**. **Back to utility bills**, **Open bill**. No edit / mark paid / delete on this page.

**Related (not this job)**
- **Unit groups** — named room sets for equal-split.
- **Meter Readings** and **Cost Allocation** under sidebar **Utilities**.
- Bills & Expenses → **Reports** — spend by period with Excel / PDF / print.

## Done when
The bill appears on **Room Utility Bills**. After refresh, each included room has its share; vacant rooms are owner-absorbed.

## Watch out for
**Amount must be greater than 0.** Building-wide bills need **Building**. **Specific unit / room** does not split. Dates: start, end, and due are required; end must be on or after start.

## Video
[link placeholder]
---
