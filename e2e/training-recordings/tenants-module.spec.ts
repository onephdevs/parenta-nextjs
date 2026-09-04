import {
  clickByName,
  clickIfVisible,
  clickNamed,
  expect,
  fillLabeled,
  labeled,
  loginAsAdmin,
  openNav,
  pause,
  runRecording,
  seedThrowawayOccupiedTenant,
  selectFirstRealOption,
  stamp,
  test,
  todayIso,
} from './helpers';

test.describe('Tenants module recordings', () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  test('add-occupant training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'add-occupant', async () => {
      await loginAsAdmin(page);
      const person = {
        firstName: 'Rico',
        lastName: `Occupant${stamp()}`,
        email: `rico.occupant.${stamp()}@parenta.test`,
      };
      const seeded = await seedThrowawayOccupiedTenant(page, person);
      await openNav(page, 'Tenants');
      const search = page.getByPlaceholder(/Name, email, phone, or unit/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill(person.lastName);
        await pause(page, 1000);
      }
      await clickIfVisible(page.getByText(new RegExp(person.lastName, 'i')).first());
      await pause(page, 900);
      await clickByName(page, /Profile/i);
      await clickIfVisible(page.getByRole('button', { name: /Add Occupant/i }));
      await pause(page, 900);
      if (!(await page.getByLabel(/First Name/i).first().isVisible().catch(() => false))) {
        await page.goto(`/admin/rooms/${seeded.roomId}`).catch(() => undefined);
        await pause(page, 900);
        await clickIfVisible(page.getByRole('button', { name: /Add Occupant/i }));
      }
      await fillLabeled(page, 'First Name', 'Ana');
      await fillLabeled(page, 'Last Name', `Roommate${stamp()}`);
      const moveIn = page.getByLabel(/Move-in Date/i).first();
      if (await moveIn.isVisible().catch(() => false)) {
        await moveIn.fill(todayIso());
      }
      const relationship = page.getByLabel(/Relationship/i).first();
      if (await relationship.isVisible().catch(() => false)) {
        await selectFirstRealOption(relationship, { prefer: /Spouse|Relative|Friend/i }).catch(
          () => undefined,
        );
      }
      await page.getByRole('dialog').getByRole('button', { name: /^Add Occupant$/i }).click();
      await pause(page, 1200);
      await expect(page.getByText(/Occupant added successfully/i).first()).toBeVisible({
        timeout: 15_000,
      }).catch(() => undefined);
    });
  });

  test('tenant-pay-details training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'tenant-pay-details', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Payments', 'Tenant pay details');
      await page.goto('/admin/settings?tab=payments');
      await pause(page, 900);
      const phone = page.getByLabel(/Payment phone number/i).first();
      await phone.waitFor({ state: 'visible', timeout: 20_000 });
      await phone.hover();
      await pause(page, 800);
      const current = await phone.inputValue().catch(() => '');
      if (!current) {
        await phone.fill('09171234567');
        const account = page.getByLabel(/Account name/i).first();
        if (await account.isVisible().catch(() => false)) {
          await account.fill('Alfonso Properties');
        }
        await clickIfVisible(page.getByRole('checkbox', { name: /GCash/i }));
        await clickIfVisible(page.getByRole('button', { name: /Save payment details/i }));
        await pause(page, 1200);
      } else {
        await page.getByLabel(/Account name/i).first().hover().catch(() => undefined);
        await page.getByRole('button', { name: /Save payment details/i }).hover();
        await pause(page, 1000);
      }
    });
  });
});
