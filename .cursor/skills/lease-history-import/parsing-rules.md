# Excel parsing rules

Implemented in `scripts/lib/lease-history-parse.mjs`. Change the script, not a one-off rewrite.

## Sheet layout

- Single sheet (name contains `apartment` if several).
- Row 2 = header. Data starts row 5.
- Columns in order: Status, Unit No., Tenant Name, Contact No., Start (move in), Total Amount Deposited, Monthly Rental Fee, Utility Deposit, End (move out).
- Status and Unit No. may be filled on every row of a block, not only the first. Group consecutive rows that parse to the same `Unit N`. Skip padding rows with no start date and no amounts.
- Use `Math.max(actualRowCount, rowCount, lastRow.number)` — `actualRowCount` can stop before Unit 10.

## Row grouping

A block is one unit. Inherit unit number when the cell is blank. A new populated unit number starts a new block.

## Tenant name

1. Blank name → forward-fill the last real name in the block (renewal), unless the contact cell is `New Tenant`.
2. Contact cell literally `New Tenant` → new tenant; do not forward-fill. Phone is null.
3. Placeholder `/^(old tenant|new tenant|former occupant|vacant|n\/?a|none|-)$/i` → not a Person; flag.
4. Sentence (length > ~40, or digits, or connectors `frm` / `up to` / `terminated` / `refund` / `temporary` / `paid` / `contract` / `cash` / `budget` / `only` / `until` / `end of`) → note on the previous real tenant’s stay. Still a lease period with that person’s name.

## Dates

- Real date → ISO `YYYY-MM-DD` (ExcelJS UTC midnight).
- `up to present` or blank end on the **last data row** of a block → active, `end_date = null`.
- Literal `VACANT` in start or end date cell → skip, log `corrupted_vacant_in_date_column`.
- Postgres comparisons: `to_char(start_date, 'YYYY-MM-DD')`. Do not `String(jsDate).slice(0, 10)`.

## Deposits

**Apt 1:** expected = monthly rent × 3 + utility column. If match: deposit = rent×2, advance = rent×1, utility = column. Else flag `deposit_mismatch` and do not guess (e.g. Unit 5 ₱10,600 = rent×2 + utility, no advance).

**Apt 2:** expected = 6000 + 6000 + (utility column or 3000).

## Room / Person resolution

- Room: `buildings.name` + `rooms.room_number` (`UNIT NO. 10` → `Unit 10`). Missing room → abort.
- Person: case-insensitive trimmed full name (`first_name` + `last_name`). Phone digits if present.
- Dummy: `first_name` Tenant and `last_name` equals `Unit N`. Current dummy + resolved Excel name → `rename_dummy` on the **active** assignment (may update `start_date`).
- Historical unnamed row that already exists → `fix_attach_person` (set `tenant_id` + snapshot).
- Natural key: `(room_id, start_date)`.

## Do not occupy

If the sheet lease would be active but `rooms.room_status = vacant`, flag `sheet_active_room_vacant` and skip. Ledger vacant Apt 1 units: 5, 8, 9, 28, 30, Admin.
