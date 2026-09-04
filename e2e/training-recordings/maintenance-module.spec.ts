import {
  clickIfVisible,
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

test.describe('Maintenance module recordings', () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  test('work-repair training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'work-repair', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Maintenance');
      await expect(page.getByText(/Maintenance|Ticket|Open/i).first()).toBeVisible({
        timeout: 20_000,
      });
      const search = page.getByPlaceholder(/Ticket, title, tenant, building/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('leak');
        await pause(page, 900);
        await search.fill('');
        await pause(page, 600);
      }
      await waitForAppIdle(page);
      await page.getByRole('row').nth(1).hover().catch(() => undefined);
      await pause(page, 900);
      const status = page.getByLabel(/^Status$/i).first();
      if (await status.isVisible().catch(() => false)) {
        await status.hover();
        await pause(page, 700);
      }
      const priority = page.getByLabel(/^Priority$/i).first();
      if (await priority.isVisible().catch(() => false)) {
        await selectIfVisible(priority, { prefer: /Medium/i });
      }
      await page.getByRole('button', { name: /Save Changes/i }).hover().catch(() => undefined);
      await pause(page, 900);
      await clickIfVisible(page.getByRole('link', { name: /Open pipeline/i }));
      await pause(page, 1000);
    });
  });

  test('staff-portal training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'staff-portal', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/staff');
      await expect(page.getByText(/Staff Portal|Operations/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await pause(page, 1000);
      for (const title of [/Maintenance Queue/i, /Rooms/i, /Activity Logs/i]) {
        const card = page.getByRole('link', { name: title }).first();
        if (await card.isVisible().catch(() => false)) {
          await card.hover();
          await pause(page, 700);
        }
      }
      await page.getByRole('link', { name: /Maintenance Queue/i }).first().click();
      await pause(page, 1400);
      await waitForAppIdle(page);
      await expect(page.getByText(/Maintenance|Ticket|Open/i).first()).toBeVisible({
        timeout: 20_000,
      });
      const search = page.getByPlaceholder(/Ticket, title, tenant, building/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('leak');
        await pause(page, 900);
        await search.fill('');
      }
      await page.getByRole('row').nth(1).hover().catch(() => undefined);
      await pause(page, 900);
      await gotoSettled(page, '/staff');
      await page.getByRole('link', { name: /Rooms/i }).first().click();
      await pause(page, 1400);
      await gotoSettled(page, '/staff');
      await page.getByRole('link', { name: /Activity Logs/i }).first().click();
      await pause(page, 1400);
    });
  });
});
