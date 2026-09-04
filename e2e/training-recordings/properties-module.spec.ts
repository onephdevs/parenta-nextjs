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
  plusDaysIso,
  runRecording,
  selectFirstRealOption,
  stamp,
  test,
  todayIso,
  waitForAppIdle,
} from './helpers';

test.describe('Properties module recordings', () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  test('hold-unit training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'hold-unit', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Tenants', 'Inquiries');
      await waitForAppIdle(page);
      await pause(page, 800);
      const search = page.getByPlaceholder(/Ticket, name, email, property/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('Inquiry');
        await pause(page, 900);
        await search.fill('');
      }
      await clickIfVisible(page.getByRole('button', { name: /^Filters$/i }));
      await pause(page, 400);
      await clickIfVisible(page.getByRole('button', { name: /Add opportunity/i }));
      await pause(page, 1000);
      await clickIfVisible(page.getByRole('button', { name: /Cancel/i }));
      await hoverIfCards(page);
    });
  });

  test('log-assets training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'log-assets', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Assets');
      await waitForAppIdle(page);
      await clickNamed(page, /Add Asset/i);
      await pause(page, 800);
      const name = `Recording Chair ${stamp()}`;
      await fillLabeled(page, 'Asset Name', name);
      const type = labeled(page, 'Asset Type').first();
      if (await type.isVisible().catch(() => false)) {
        await selectFirstRealOption(type, { prefer: /Furniture|Appliance|Chair/i });
      }
      const brand = page.getByLabel(/^Brand/i).first();
      if (await brand.isVisible().catch(() => false)) {
        await brand.fill('Recording');
      }
      await clickIfVisible(page.getByRole('button', { name: /Save Asset/i }));
      await pause(page, 1200);
      await clickByName(page, /QR Codes/i);
      await pause(page);
      await clickByName(page, /Asset Overview/i);
      const search = page.getByPlaceholder(/Name, brand, serial/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill(name);
        await pause(page, 900);
      }
    });
  });

  test('unit-groups training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'unit-groups', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/bills-expenses/unit-groups');
      await expect(page.getByText(/Utility unit groups|New group|Active groups/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await pause(page, 1000);
      await page.getByText('New group', { exact: true }).first().hover();
      await pause(page, 700);
      const building = labeled(page, 'Building').first();
      await selectFirstRealOption(building, { prefer: /BALIBAGO|VILLASOL|Recording/i });
      await pause(page, 900);
      const name = labeled(page, 'Name').first();
      await name.fill(`Recording 3rd floor water ${stamp()}`);
      await pause(page, 600);
      const utility = page.getByLabel(/Utility type/i).first();
      await selectFirstRealOption(utility, { prefer: /Water/i });
      await pause(page, 700);
      const desc = page.getByLabel(/Description/i).first();
      if (await desc.isVisible().catch(() => false)) {
        await desc.fill('Training walkthrough — throwaway group');
      }
      await clickIfVisible(page.getByRole('button', { name: /Add floor/i }));
      await pause(page, 700);
      const member = page.getByRole('checkbox').first();
      if (await member.isVisible().catch(() => false)) {
        await member.check();
        await pause(page, 700);
      }
      await clickNamed(page, /Create group/i);
      await pause(page, 1600);
      await page.getByText(/Active groups/i).first().hover();
      await pause(page, 800);
      await page.getByRole('button', { name: /Edit group/i }).first().hover().catch(() => undefined);
      await pause(page, 700);
      await page.getByRole('button', { name: /Deactivate/i }).first().hover().catch(() => undefined);
      await pause(page, 1000);
    });
  });
});

async function hoverIfCards(page: import('@playwright/test').Page) {
  for (const label of ['Total tickets', 'New inquiry', 'In progress', 'Lease signed']) {
    const card = page.getByText(label, { exact: true }).first();
    if (await card.isVisible().catch(() => false)) {
      await card.hover();
    }
  }
  const ticket = page.getByText(/^#INQ-/).first();
  if (await ticket.isVisible().catch(() => false)) {
    await ticket.hover();
  }
}
