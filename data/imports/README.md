# Apartment lease-history import

Parses the messy Start & End Date Excel draft into `tenants` (Person) and `tenant_room_assignments` (Lease). Dry-run is the default; nothing is written until `--commit`.

## Apartment 1 (Balibago)

Place the workbook at:

`data/imports/apartment1-balibago-lease-history.xlsx`

Header row is row 2; data starts at row 5.

```bash
# Dry-run (default) — print the report, write JSON beside the xlsx
node scripts/import-apartment-lease-history.mjs
# or
npm run import:apartment-lease-history

# After reviewing the report
node scripts/import-apartment-lease-history.mjs --commit
```

## Apartment 2 later

Same parser; swap the deposit template (₱6,000 + ₱6,000 + ₱3,000) and the file:

```bash
node scripts/import-apartment-lease-history.mjs --apartment=2 --file=data/imports/apartment2-villasol-lease-history.xlsx
```

Flagged anomalies (placeholders, deposit mismatches, Unit 9/10 duplicate identity, corrupted `VACANT` date cells) are listed in the dry-run and skipped on `--commit`.
