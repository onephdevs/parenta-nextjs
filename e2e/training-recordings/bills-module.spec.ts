import {
  clickByName,
  clickIfVisible,
  clickNamed,
  expect,
  fillLabeled,
  gotoSettled,
  labeled,
  loginAsAdmin,
  openNav,
  pause,
  runRecording,
  selectIfVisible,
  stamp,
  test,
  todayIso,
} from './helpers';

test.describe('Bills & utilities module recordings', () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  test('record-expense training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'record-expense', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Bills & Expenses', 'Expenses');
      await clickNamed(page, /Record Expense/i);
      await pause(page, 800);
      await fillLabeled(page, 'Amount', '350');
      await selectIfVisible(labeled(page, 'Category').first(), {
        prefer: /Cleaning|Maintenance|Fuel|Other/i,
      });
      const desc = page.getByLabel(/Description/i).first();
      if (await desc.isVisible().catch(() => false)) {
        await desc.fill(`Recording walkthrough ${stamp()}`);
      }
      const date = page.getByLabel(/Expense Date/i).first();
      if (await date.isVisible().catch(() => false)) {
        await date.fill(todayIso());
      }
      await selectIfVisible(page.getByLabel(/^Building/i).first(), {
        prefer: /BALIBAGO|VILLASOL|Recording/i,
      });
      await clickNamed(page, /Record Expense/i);
      await pause(page, 1400);
    });
  });

  test('bills-expenses-reports training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'bills-expenses-reports', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/bills-expenses/reports');
      await expect(page.getByText(/Expense & utility bill reporting|Report type/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await selectIfVisible(page.getByLabel(/Report type/i).first(), { prefer: /Detail list/i });
      await pause(page, 700);
      await selectIfVisible(page.getByLabel(/Report type/i).first(), { prefer: /Summary by category/i });
      await selectIfVisible(page.getByLabel(/^Period/i).first(), { prefer: /This month/i });
      await selectIfVisible(page.getByLabel(/^Building/i).first(), {
        prefer: /BALIBAGO|VILLASOL|All buildings/i,
      });
      await clickNamed(page, /^Generate$/i);
      await pause(page, 1800);
      await page.getByRole('button', { name: /^Print$/i }).hover().catch(() => undefined);
      await pause(page, 700);
      await page.getByRole('button', { name: /^PDF$/i }).hover().catch(() => undefined);
      await pause(page, 700);
      await page.getByRole('button', { name: /Excel/i }).hover().catch(() => undefined);
      await pause(page, 1000);
    });
  });

  test('enter-meter-readings training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'enter-meter-readings', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/utilities/readings');
      await expect(page.getByText(/Meter|Reading|Total Readings/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await pause(page, 900);
      for (const card of ['Total Readings', 'Unique Meters', 'This Month', 'Buildings']) {
        await page.getByText(card, { exact: true }).first().hover().catch(() => undefined);
        await pause(page, 400);
      }
      const search = page.getByPlaceholder(/Building, meter, utility/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('Balibago');
        await pause(page, 800);
        await search.fill('');
      }
      await clickIfVisible(page.getByRole('button', { name: /Add (Meter )?Reading/i }));
      await pause(page, 1000);
      await expect(page.getByText(/Add Meter Reading/i).first()).toBeVisible({ timeout: 10_000 });
      await selectIfVisible(page.locator('#meter-building'), {
        prefer: /BALIBAGO|VILLASOL|Recording/i,
      });
      await selectIfVisible(page.locator('#meter-utility-type'), {
        prefer: /Electricity|Water/i,
      });
      const date = page.getByLabel(/Reading Date/i).first();
      if (await date.isVisible().catch(() => false)) {
        await date.fill(todayIso());
      }
      const value = page.getByLabel(/Reading Value/i).first();
      if (await value.isVisible().catch(() => false)) {
        await value.fill('1200');
      }
      const meter = page.getByLabel(/Meter Number/i).first();
      if (await meter.isVisible().catch(() => false)) {
        await meter.fill(`REC-${stamp()}`);
      }
      const notes = page.getByLabel(/Notes/i).first();
      if (await notes.isVisible().catch(() => false)) {
        await notes.fill('Training walkthrough reading');
      }
      await clickIfVisible(page.getByRole('button', { name: /Save Reading/i }));
      await pause(page, 1600);
    });
  });

  test('split-metered-bill training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'split-metered-bill', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Utilities', 'Cost Allocation');
      const search = page.getByPlaceholder(/Building name or address/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('Balibago');
        await pause(page, 900);
      }
      await clickIfVisible(page.getByText(/BALIBAGO|APARTMENT-1/i).first());
      await pause(page, 900);
      await clickByName(page, /Allocation Rules/i);
      await pause(page, 800);
      await clickByName(page, /Cost Calculator/i);
      await pause(page, 800);
      await page.getByRole('button', { name: /Calculate Allocation/i }).hover().catch(() => undefined);
      await pause(page, 900);
      await clickByName(page, /Tenant Bills/i);
      await pause(page, 900);
    });
  });
});
