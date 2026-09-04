# QA test suite — Alfonso / Parenta

Written proof that each of the eight core modules works: a test matrix (what we expected) plus a Playwright run (what actually happened), with **video on every test including passes**.

## Prerequisites

1. App running. This repo’s `npm run dev` uses **port 3030**; Playwright defaults to **3000**. Set the URL to match:

   ```env
   PLAYWRIGHT_BASE_URL=http://localhost:3030
   E2E_ADMIN_EMAIL=admin@parenta.com
   E2E_ADMIN_PASSWORD=admin123
   ```

   Put those in `.env.test` at the repo root (gitignored). If that file is missing, the specs fall back to `admin@parenta.com` / `admin123`.

2. Chromium once: `npx playwright install chromium`

3. Settings → **Enable tenant portal** must be on for Tenant Portal tests.

Throwaway QA records (names like `QA Annex Angeles …`, emails `*.parenta.test`) are created during the run. Specs do **not** vacate real Balibago / Villasol occupants.

## How to run the full suite

```bash
npx playwright test e2e/qa/
```

Same thing via npm: `npm run test:qa`

Workers are **1** so tests do not collide on the same database. Each action has **slowMo: 300** plus 400–500ms pauses so the videos are watchable as proof, not a blur.

## HTML report (pass/fail + video)

After the run:

```bash
npx playwright show-report
```

The report is written to `playwright-report/index.html`.

Playwright’s HTML reporter lists every `test()` with pass/fail. Open a row to play the **video for that test** (attached because `video: 'on'` — passing tests keep their recording, not only failures).

A second copy of each video is saved for handing to the client:

| Module | Plan | Spec | Videos |
| --- | --- | --- | --- |
| Properties / Rooms | [properties-rooms-test-plan.md](./properties-rooms-test-plan.md) | `e2e/qa/properties-rooms.spec.ts` | `recordings/qa/properties-rooms/` |
| Tenants | [tenants-test-plan.md](./tenants-test-plan.md) | `e2e/qa/tenants.spec.ts` | `recordings/qa/tenants/` |
| Payments | [payments-test-plan.md](./payments-test-plan.md) | `e2e/qa/payments.spec.ts` | `recordings/qa/payments/` |
| Utility Bills | [utility-bills-test-plan.md](./utility-bills-test-plan.md) | `e2e/qa/utility-bills.spec.ts` | `recordings/qa/utility-bills/` |
| Leases / Documents | [leases-documents-test-plan.md](./leases-documents-test-plan.md) | `e2e/qa/leases-documents.spec.ts` | `recordings/qa/leases-documents/` |
| Leasing Pipeline | [leasing-pipeline-test-plan.md](./leasing-pipeline-test-plan.md) | `e2e/qa/leasing-pipeline.spec.ts` | `recordings/qa/leasing-pipeline/` |
| Move-out | [move-out-test-plan.md](./move-out-test-plan.md) | `e2e/qa/move-out.spec.ts` | `recordings/qa/move-out/` |
| Tenant Portal | [tenant-portal-test-plan.md](./tenant-portal-test-plan.md) | `e2e/qa/tenant-portal.spec.ts` | `recordings/qa/tenant-portal/` |

Raw Playwright artifacts (including the videos the HTML report links) stay in `recordings/playwright-raw/`.

`test.describe()` is one module. Each `test('…')` title matches the **Scenario** column in that module’s plan 1:1.

## Re-run one module after a bugfix

```bash
npx playwright test e2e/qa/payments.spec.ts
```

Other modules:

```bash
npx playwright test e2e/qa/properties-rooms.spec.ts
npx playwright test e2e/qa/tenants.spec.ts
npx playwright test e2e/qa/utility-bills.spec.ts
npx playwright test e2e/qa/leases-documents.spec.ts
npx playwright test e2e/qa/leasing-pipeline.spec.ts
npx playwright test e2e/qa/move-out.spec.ts
npx playwright test e2e/qa/tenant-portal.spec.ts
```

One scenario (title must match the plan row exactly):

```bash
npx playwright test e2e/qa/payments.spec.ts -g "Invalid input: amount must be greater than 0"
```

## Gaps documented on purpose

Where the code has **no validation** (or is looser than the office would expect), the plan still has a row marked **No validation found — flag as bug**. The matching test **passes** on today’s permissive behavior and comments that it is unexpected. Examples:

- Duplicate building names are allowed
- `POST /api/rooms` accepts a negative monthly rate (the Add Room form does not)
- A second payment on the same invoice is allowed (excess becomes credit)
- Pipeline **Create opportunity** does not require name or email
- Single-room duplicate number returns 500 instead of the bulk API’s 409

When those are fixed, update the plan’s **Expected result** and flip the assertion.

Caretaker is **not** a separate office role (JWT leftover is treated as admin). Permission tests cover unauthenticated + tenant → `/auth/signin`.
