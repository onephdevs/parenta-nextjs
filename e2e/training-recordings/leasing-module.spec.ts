import {
  clickIfVisible,
  clickNamed,
  dismissDialog,
  expect,
  fillLabeled,
  gotoSettled,
  labeled,
  loginAsAdmin,
  openNav,
  pause,
  plusDaysIso,
  runRecording,
  seedThrowawayOccupiedTenant,
  seedUnassignedRecordingTenant,
  selectFirstRealOption,
  stamp,
  test,
  todayIso,
} from './helpers';

test.describe('Leasing module recordings', () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  test('start-lease training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'start-lease', async () => {
      await loginAsAdmin(page);
      const person = {
        firstName: 'Carlo',
        lastName: `Lease${stamp()}`,
        email: `carlo.lease.${stamp()}@parenta.test`,
      };
      await seedUnassignedRecordingTenant(page, person);
      await openNav(page, 'Leasing');
      await clickNamed(page, /New lease/i);
      await pause(page, 800);
      const tenant = labeled(page, 'Tenant').first();
      await selectFirstRealOption(tenant, { prefer: new RegExp(person.lastName, 'i') });
      await pause(page);
      await selectFirstRealOption(labeled(page, 'Property').first(), {
        prefer: /BALIBAGO|VILLASOL|Recording/i,
      });
      await pause(page, 800);
      await selectFirstRealOption(labeled(page, 'Room').first(), { skip: /Select|No vacant/i });
      await selectFirstRealOption(page.getByLabel(/Lease template/i).first());
      const start = page.getByLabel(/Start date/i).first();
      if (await start.isVisible().catch(() => false)) {
        await start.fill(todayIso());
      }
      const rent = page.getByLabel(/Monthly rent/i).first();
      if (await rent.isVisible().catch(() => false)) {
        const value = await rent.inputValue();
        if (!value || value === '0') await rent.fill('4800');
      }
      await clickNamed(page, /Create lease/i);
      await pause(page, 1400);
    });
  });

  test('lease-templates training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'lease-templates', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Leasing', 'Lease Templates');
      await clickNamed(page, /Create Lease Template/i);
      await fillLabeled(page, 'Template Name', `Recording template ${stamp()}`);
      const term = page.getByLabel(/Lease Term/i).first();
      if (await term.isVisible().catch(() => false)) {
        await selectFirstRealOption(term, { prefer: /12 Months|No Fixed/i });
      }
      await clickIfVisible(page.getByRole('button', { name: /Confirm and Save/i }));
      await pause(page, 1200);
      const search = page.getByPlaceholder(/Template name/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('Recording');
        await pause(page, 800);
      }
    });
  });

  test('design-lease training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'design-lease', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Documents', 'Lease Designer');
      await gotoSettled(page, '/admin/documents/lease-designer');
      await expect(page.getByText(/Clauses|Printable preview/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await pause(page, 1000);
      await page.getByTitle(/Page size|US Letter|A4/i).first().hover().catch(() => undefined);
      await page.getByRole('combobox').first().hover().catch(() => undefined);
      await pause(page, 700);
      await page.getByRole('button', { name: /Use compact template/i }).hover().catch(() => undefined);
      await page.getByText(/Use compact template/i).first().hover().catch(() => undefined);
      await pause(page, 900);
      await clickIfVisible(page.getByRole('button', { name: /Add clause/i }));
      await pause(page, 1000);
      await clickIfVisible(page.getByRole('button', { name: /Text clause|Checkbox options|Utility allocation/i }));
      await pause(page, 900);
      await page.getByText(/Printable preview/i).first().hover();
      await pause(page, 800);
      await page.getByRole('button', { name: /Save draft/i }).hover();
      await pause(page, 800);
      await page.getByRole('button', { name: /Publish/i }).hover();
      await pause(page, 900);
      await page.getByTitle(/Export PDF/i).hover().catch(() => undefined);
      await clickIfVisible(page.getByRole('button', { name: /Export PDF|Print/i }));
      await pause(page, 1000);
      await gotoSettled(page, '/admin/documents/templates');
      const search = page.getByPlaceholder(/Template name/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('Room');
        await pause(page, 900);
        await search.fill('');
      }
      await clickIfVisible(page.getByRole('button', { name: /Published|Draft|All Status/i }));
      await pause(page, 800);
      await clickIfVisible(page.getByRole('link', { name: /Open Lease Designer/i }));
      await clickIfVisible(page.getByRole('button', { name: /Open Lease Designer/i }));
      await pause(page, 1000);
    });
  });

  test('give-notice training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'give-notice', async () => {
      await loginAsAdmin(page);
      const person = {
        firstName: 'Nina',
        lastName: `Notice${stamp()}`,
        email: `nina.notice.${stamp()}@parenta.test`,
      };
      const seeded = await seedThrowawayOccupiedTenant(page, person);
      await gotoSettled(page, `/admin/tenants/${seeded.tenantId}`);
      await clickIfVisible(page.getByRole('button', { name: /^Terminate$/i }));
      if (!(await page.getByLabel(/Planned move-out date/i).first().isVisible().catch(() => false))) {
        await openNav(page, 'Leasing');
        const search = page.getByPlaceholder(/Tenant, unit/i);
        if (await search.isVisible().catch(() => false)) {
          await search.fill(person.lastName);
          await pause(page, 900);
        }
        await clickIfVisible(page.getByText(new RegExp(person.lastName, 'i')).first());
        await pause(page, 800);
        await clickIfVisible(page.getByRole('button', { name: /^Terminate$/i }));
      }
      const moveOut = page.getByLabel(/Planned move-out date/i).first();
      if (await moveOut.isVisible().catch(() => false)) {
        await moveOut.fill(plusDaysIso(30));
        const reason = page.getByLabel(/Reason/i).first();
        if (await reason.isVisible().catch(() => false)) {
          await reason.fill('Training walkthrough — throwaway occupant');
        }
        await page.getByRole('button', { name: /^Terminate$/i }).last().click();
        await pause(page, 1200);
      }
    });
  });

  test('renew-lease training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'renew-lease', async () => {
      await loginAsAdmin(page);
      const person = {
        firstName: 'Rina',
        lastName: `Renew${stamp()}`,
        email: `rina.renew.${stamp()}@parenta.test`,
      };
      const seeded = await seedThrowawayOccupiedTenant(page, person);
      await gotoSettled(page, '/admin/leasing');
      await page.getByRole('button', { name: 'Renewals' }).click();
      await pause(page, 1200);
      await expect(page.getByText(/Renewals|No renewals|Submitted renewal/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await gotoSettled(page, `/admin/tenants/${seeded.tenantId}`);
      await expect(page.getByRole('tab', { name: 'Lease' })).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: /^Lease$/i }).first().click();
      await pause(page, 800);
      await clickIfVisible(page.getByRole('menuitem', { name: /^Renew$/i }));
      if (!(await page.getByRole('heading', { name: /Renew Lease/i }).first().isVisible().catch(() => false))) {
        await clickIfVisible(page.getByRole('tab', { name: 'Lease' }));
        await pause(page, 800);
        await clickIfVisible(page.getByRole('button', { name: /^View$/i }));
        await pause(page, 1000);
        await clickIfVisible(page.getByRole('link', { name: /^Renew$/i }));
      }
      await expect(page.getByText(/Renew Lease|Renewing lease|Lease Information/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await pause(page, 1000);
      await page.getByText(/Retain previous lease details|Carry over deposit|Waive advance/i).first().hover().catch(
        () => undefined,
      );
      await pause(page, 800);
      await page.getByLabel(/Lease Template/i).first().hover().catch(() => undefined);
      await pause(page, 700);
      await page.getByLabel(/Rent Amount/i).first().hover().catch(() => undefined);
      await pause(page, 700);
      await page.getByLabel(/Start Date/i).first().hover().catch(() => undefined);
      await pause(page, 800);
      await page.getByText(/Financial Summary|Deposit Amount|Initial Cashout/i).first().hover().catch(
        () => undefined,
      );
      await pause(page, 800);
      await page.getByRole('button', { name: /Renew lease/i }).hover();
      await pause(page, 1000);
      await clickIfVisible(page.getByRole('button', { name: /^Cancel$/i }));
      await pause(page, 1000);
    });
  });

  test('leasing-alerts training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'leasing-alerts', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/leasing');
      await page.getByRole('button', { name: 'Expiration alerts' }).click();
      await pause(page, 1000);
      await clickNamed(page, /Generate Alerts/i);
      await pause(page, 2000);
      await page.getByText(/Expiration alerts|days left|Alert/i).first().hover().catch(() => undefined);
      await pause(page, 900);
      await page.getByRole('button', { name: 'Renewals' }).click();
      await pause(page, 1200);
      await page.getByRole('button', { name: 'Move-outs' }).click();
      await pause(page, 1000);
      await page.getByRole('button', { name: 'All leases' }).click();
      await pause(page, 1000);
      await page.getByText('Expiring soon', { exact: true }).first().hover().catch(() => undefined);
      await pause(page, 700);
      const status = page.getByLabel(/^Status$/i).first();
      if (await status.isVisible().catch(() => false)) {
        await status.selectOption({ label: /Expiring soon/i }).catch(() => undefined);
        await pause(page, 1000);
      }
      const search = page.getByPlaceholder(/Tenant, unit/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('Balibago');
        await pause(page, 900);
        await search.fill('');
      }
    });
  });
});
