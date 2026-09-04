# Training walkthrough recordings

Playwright scripts that walk each office job from [`docs/training/`](../../docs/training/) and save one continuous **.webm** per job. Knowledge base modules reuse these files from `public/knowledge-base/videos/`.

## Prerequisites

1. App running (this repo’s `npm run dev` uses **port 3030**; the task default is 3000):

   ```bash
   npm run dev
   ```

2. Credentials in **`.env.test`** at the repo root (gitignored). Copy from below:

   ```env
   PLAYWRIGHT_BASE_URL=http://localhost:3030
   E2E_ADMIN_EMAIL=admin@parenta.com
   E2E_ADMIN_PASSWORD=admin123
   E2E_TENANT_EMAIL=tenant@parenta.com
   E2E_TENANT_PASSWORD=tenant123
   ```

   If `.env.test` is missing, the specs fall back to the seed logins above. Point `PLAYWRIGHT_BASE_URL` at whatever port the app is actually using.

3. Install the test runner and Chromium (once):

   ```bash
   npm install -D @playwright/test
   npx playwright install chromium
   ```

## Mouse pointer

The orange pointer is injected into the page. Every click, hover, checkbox, and `<select>` **moves the pointer to the control, waits ~700ms**, then fires the action — so the cursor is on the target before the UI changes. Videos are long on purpose.

## Run all jobs (one worker)

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3030 npx playwright test e2e/training-recordings --project=chromium
```

One module:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3030 npx playwright test e2e/training-recordings/properties-module.spec.ts --project=chromium
```

Workers are set to **1** so recordings do not overlap on the same database.

## Where the videos land

| Output | Path |
| --- | --- |
| One file per job | `recordings/[job-name].webm` |
| Knowledge base copies | `public/knowledge-base/videos/[job-name].webm` |
| Playwright raw artifacts | `recordings/playwright-raw/` |

Each spec records a **1920×1080** webm. Comments in the older specs (`// --- Main flow: … ---`, `// --- Also on this page: … ---`) mark clip points for shorter client videos.

## Jobs by module

| Spec | Jobs |
| --- | --- |
| `add-unit.spec.ts` | add-unit |
| `properties-module.spec.ts` | hold-unit, log-assets, unit-groups |
| `add-tenant.spec.ts` | add-tenant |
| `tenants-module.spec.ts` | add-occupant, tenant-pay-details |
| `tenant-portal.spec.ts` | tenant-portal |
| `lead-to-tenant.spec.ts` | lead-to-tenant |
| `issue-lease.spec.ts` | issue-lease |
| `move-out.spec.ts` | move-out |
| `leasing-module.spec.ts` | start-lease, lease-templates, design-lease, give-notice, renew-lease, leasing-alerts |
| `collect-rent.spec.ts` | collect-rent |
| `payments-module.spec.ts` | create-invoice, confirm-receipt, chase-payments, generate-all-invoices, send-reminders, late-fees, payment-gateways |
| `utility-bill.spec.ts` | utility-bill |
| `bills-module.spec.ts` | record-expense, bills-expenses-reports, enter-meter-readings, split-metered-bill |
| `documents-module.spec.ts` | file-documents, document-categories |
| `reports-module.spec.ts` | open-dashboard, check-collections, close-month, pull-report, financial-dashboard, export-data |
| `maintenance-module.spec.ts` | work-repair, staff-portal |
| `office-module.spec.ts` | office-settings, add-office-login, change-office-password, look-up-activity, import-history |

Throwaway occupants are used for move-out, give-notice, add-occupant, and start-lease so real Balibago/Villasol units are not vacated. `add-unit` deletes only **Recording Annex Balibago**. Bulk invoice generate, late-fee apply, password change, and history **Commit import** are shown, not submitted.

## Notes

- Selectors are role + accessible name (no `data-testid` in the app).
- These are walkthroughs, not a strict CI suite: a missing vacant room or unpaid invoice can fail a step. Seeded Apt 1 / Apt 2 data makes the money and occupancy steps more reliable.
