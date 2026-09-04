import {
  clickIfVisible,
  clickByName,
  clickNamed,
  expect,
  fillLabeled,
  gotoSettled,
  loginAsAdmin,
  openNav,
  pause,
  runRecording,
  stamp,
  test,
} from './helpers';

test.describe('Office setup module recordings', () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  test('office-settings training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'office-settings', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/settings');
      for (const tab of ['Notifications', 'Security', 'Preferences', 'Tenant payments', 'System']) {
        await clickByName(page, tab);
      }
      await page.getByText(/Enable tenant portal/i).first().hover().catch(() => undefined);
      await pause(page, 700);
      await page.getByText(/Enable late-fee penalties/i).first().hover().catch(() => undefined);
      await pause(page, 900);
      await page.getByRole('button', { name: /Save Settings/i }).hover().catch(() => undefined);
      await pause(page, 900);
    });
  });

  test('add-office-login training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'add-office-login', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Users');
      await clickNamed(page, /Create Admin/i);
      const tag = stamp();
      await fillLabeled(page, 'First name', 'Office');
      await fillLabeled(page, 'Last name', `Train${tag}`);
      await fillLabeled(page, 'Email', `office.train.${tag}@parenta.test`);
      await page.locator('#create-password').fill('Training123!');
      await pause(page, 400);
      await page.locator('#create-confirm-password').fill('Training123!');
      await pause(page, 600);
      await clickNamed(page, /Create Account/i);
      await pause(page, 1400);
    });
  });

  test('change-office-password training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'change-office-password', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/profile');
      await expect(page.getByText(/Admin Profile|Change Password/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await page.getByLabel(/Current password|Current Password/i).first().hover().catch(() => undefined);
      await pause(page, 800);
      await page.getByRole('button', { name: /Change Password/i }).hover();
      await pause(page, 1000);
    });
  });

  test('look-up-activity training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'look-up-activity', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Activity');
      const search = page.getByPlaceholder(/Entity name/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('tenant');
        await pause(page, 1000);
      }
      await clickIfVisible(page.getByRole('button', { name: /Details/i }));
      await pause(page, 900);
      await clickIfVisible(page.getByRole('button', { name: /Next/i }));
      await pause(page, 800);
    });
  });

  test('import-history training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'import-history', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/tools/history-import');
      await expect(page.getByText(/Historical|Import|CSV|Preview/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await page.getByLabel(/Data type/i).first().hover().catch(() => undefined);
      await pause(page, 800);
      await page.getByRole('button', { name: /Preview \(dry-run\)|Preview/i }).hover().catch(
        () => undefined,
      );
      await pause(page, 900);
      await page.getByRole('button', { name: /Commit import/i }).hover().catch(() => undefined);
      await pause(page, 1000);
    });
  });
});
