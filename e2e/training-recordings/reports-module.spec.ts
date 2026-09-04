import {
  clickByName,
  clickIfVisible,
  clickNamed,
  expect,
  gotoSettled,
  loginAsAdmin,
  openNav,
  pause,
  runRecording,
  selectIfVisible,
  test,
  waitForAppIdle,
} from './helpers';

test.describe('Reports module recordings', () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  test('open-dashboard training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'open-dashboard', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin');
      await expect(page.getByText(/Quick link|Needs attention|Recents|Portfolio|Good /i).first()).toBeVisible({
        timeout: 20_000,
      });
      await pause(page, 1000);
      for (const label of ['Record Payment', 'Add note', 'Add Tenant', 'Add Room', 'Maintenance']) {
        const rail = page.getByRole('button', { name: label }).first();
        if (await rail.isVisible().catch(() => false)) {
          await rail.hover();
          await pause(page, 600);
        }
      }
      await clickIfVisible(page.getByRole('button', { name: /Record Payment/i }));
      await pause(page, 1000);
      await clickIfVisible(page.getByRole('button', { name: /Cancel|Close/i }));
      await pause(page, 700);
      await page.getByText(/Needs attention|Portfolio ledger|Recents|Your stickies/i).first().hover().catch(
        () => undefined,
      );
      await pause(page, 800);
      await clickIfVisible(page.getByRole('button', { name: /Manage widgets/i }));
      await pause(page, 1000);
      await page.getByText(/Quick links|Portfolio ledger|Recents|Your stickies/i).first().hover().catch(
        () => undefined,
      );
      await pause(page, 800);
      await clickIfVisible(page.getByRole('button', { name: /Close|Done|Cancel/i }));
      await pause(page, 800);
      await clickIfVisible(page.getByRole('button', { name: /Add Tenant/i }));
      await pause(page, 900);
      await clickIfVisible(page.getByRole('button', { name: /Cancel|Close/i }));
      await pause(page, 800);
    });
  });

  test('check-collections training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'check-collections', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Reports');
      await waitForAppIdle(page);
      await clickIfVisible(page.getByRole('link', { name: /Unit × Month Collections|Unit x Month/i }));
      if (!page.url().includes('unit-month')) {
        await gotoSettled(page, '/admin/reports/unit-month');
      }
      await clickNamed(page, /Generate matrix/i);
      await pause(page, 1800);
      await page.getByText(/Paid|Unpaid|Partial|Vacant/i).first().hover().catch(() => undefined);
      await pause(page, 1000);
    });
  });

  test('close-month training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'close-month', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/reports/disbursement');
      await expect(page.getByText(/Disbursement|Cash-flow|Date range/i).first()).toBeVisible({
        timeout: 20_000,
      });
      const from = page.getByLabel(/^From$/i).first();
      const to = page.getByLabel(/^To$/i).first();
      if (await from.isVisible().catch(() => false)) {
        await from.hover();
        await pause(page, 600);
      }
      if (await to.isVisible().catch(() => false)) {
        await to.hover();
        await pause(page, 600);
      }
      await page.getByLabel(/Property/i).first().hover().catch(() => undefined);
      await pause(page, 800);
      await clickNamed(page, /^Generate$/i);
      await pause(page, 2000);
      await page.getByText(/Total Collection|Cash Allowance|Grand total|Expenses/i).first().hover().catch(
        () => undefined,
      );
      await pause(page, 1000);
      await page.getByRole('button', { name: /^Print$/i }).hover().catch(() => undefined);
      await pause(page, 900);
      await page.getByRole('button', { name: /Lock period/i }).hover().catch(() => undefined);
      await pause(page, 1100);
      await clickIfVisible(page.getByRole('link', { name: /All reports/i }));
      await pause(page, 900);
    });
  });

  test('pull-report training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'pull-report', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/reports');
      const search = page.getByPlaceholder(/Report name/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('Occupancy');
        await pause(page, 1000);
        await search.fill('');
        await pause(page, 700);
      }
      await clickByName(page, /Financial Reports|Property Reports|Tenant Reports/i);
      await pause(page, 800);
      await clickIfVisible(page.getByRole('link', { name: /Collected Amount Report/i }));
      await pause(page, 1200);
      await clickIfVisible(page.getByRole('button', { name: /Generate/i }));
      await pause(page, 1400);
      await page.getByRole('button', { name: /Print|Export Excel|Export PDF/i }).first().hover().catch(
        () => undefined,
      );
      await pause(page, 900);
      await gotoSettled(page, '/admin/reports');
      await clickIfVisible(page.getByRole('link', { name: /Vacant Rooms Report/i }));
      await pause(page, 1400);
      await gotoSettled(page, '/admin/reports');
      await clickIfVisible(page.getByRole('link', { name: /Portfolio Rollup/i }));
      await pause(page, 1400);
    });
  });

  test('financial-dashboard training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'financial-dashboard', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Payments', 'Financial Dashboard');
      await gotoSettled(page, '/admin/financial/dashboard');
      await expect(page.getByText(/Monthly Revenue|Occupancy Rate|Financial Dashboard/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await pause(page, 1200);
      for (const label of ['Monthly Revenue', 'Occupancy Rate', 'Yearly Revenue', 'Upcoming Due Dates']) {
        await page.getByText(label, { exact: false }).first().hover().catch(() => undefined);
        await pause(page, 700);
      }
      await page.getByText(/Monthly Revenue Trend|Occupancy Overview/i).first().hover().catch(() => undefined);
      await pause(page, 1000);
      await gotoSettled(page, '/admin/financial');
      await pause(page, 1000);
      await clickIfVisible(page.getByRole('link', { name: /Invoices|Payments/i }));
      await pause(page, 1000);
    });
  });

  test('export-data training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'export-data', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/export');
      await expect(page.getByText(/Export|CSV|Excel/i).first()).toBeVisible({ timeout: 20_000 });
      await clickIfVisible(page.getByRole('button', { name: /CSV|Excel|Export/i }));
      await pause(page, 1400);
    });
  });
});
