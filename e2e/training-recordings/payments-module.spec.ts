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
  selectIfVisible,
  stamp,
  test,
  waitForAppIdle,
} from './helpers';

test.describe('Payments module recordings', () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  test('create-invoice training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'create-invoice', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Payments', 'Invoices');
      await waitForAppIdle(page);
      await clickNamed(page, /Create Invoice/i);
      await pause(page, 800);
      await selectIfVisible(labeled(page, 'Tenant').first(), {
        prefer: /Maria|Reyes|BALIBAGO|Villasol/i,
      });
      await pause(page, 800);
      await selectIfVisible(labeled(page, 'Room').first());
      const due = page.getByLabel(/Due Date/i).first();
      if (await due.isVisible().catch(() => false)) {
        await due.fill(plusDaysIso(7));
      }
      const desc = page.getByLabel(/^Description/i).first();
      if (await desc.isVisible().catch(() => false)) {
        await desc.fill('Monthly rent');
      }
      const type = page.getByLabel(/^Type/i).first();
      if (await type.isVisible().catch(() => false)) {
        await selectIfVisible(type, { prefer: /^Rent$/i });
      }
      const price = page.getByLabel(/Unit Price/i).first();
      if (await price.isVisible().catch(() => false)) {
        await price.fill('4800');
      }
      await clickNamed(page, /Create Invoice/i);
      await pause(page, 1400);
    });
  });

  test('confirm-receipt training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'confirm-receipt', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Payments');
      await expect(page.getByText(/Pending verification|Process Payment|Collections/i).first()).toBeVisible({
        timeout: 20_000,
      });
      const pending = page.getByText(/Pending verification/i).first();
      await pending.hover();
      await pause(page, 800);
      await clickIfVisible(page.getByRole('button', { name: /Pending/i }));
      await clickIfVisible(page.getByText(/^Pending$/i).first());
      await pause(page, 900);
      await page.getByRole('button', { name: /Confirm payment/i }).first().hover().catch(() => undefined);
      await pause(page, 1000);
    });
  });

  test('chase-payments training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'chase-payments', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/tasks?board=payments');
      await waitForAppIdle(page);
      await pause(page, 1200);
      await clickIfVisible(page.getByRole('button', { name: /Add rent payment/i }));
      await pause(page, 1000);
      if (await page.getByLabel(/First name/i).first().isVisible().catch(() => false)) {
        await fillLabeled(page, 'First name', 'Chase');
        await fillLabeled(page, 'Last name', `Followup${stamp()}`);
        const building = page.locator('#opp-pay-building');
        if (await building.isVisible().catch(() => false)) {
          await building.hover();
          await pause(page, 800);
          const optionCount = await building.locator('option[value]:not([value=""])').count();
          if (optionCount > 0) {
            await selectIfVisible(building, { prefer: /BALIBAGO|VILLASOL|Recording/i });
            await selectIfVisible(page.locator('#opp-pay-room'));
          }
        }
        const due = page.getByLabel(/Rent due/i).first();
        if (await due.isVisible().catch(() => false)) {
          await due.fill(plusDaysIso(3));
        }
        const amount = page.getByLabel(/Amount/i).first();
        if (await amount.isVisible().catch(() => false)) {
          await amount.fill('4800');
        }
        await clickIfVisible(page.getByRole('button', { name: /Create rent follow-up/i }));
        await pause(page, 1600);
      }
      for (const col of ['Upcoming', 'Due', 'Reminder sent', 'Overdue', 'Paid']) {
        await page.getByText(col, { exact: true }).first().hover().catch(() => undefined);
        await pause(page, 500);
      }
      await page.getByRole('button', { name: /Advanced Filters/i }).hover().catch(() => undefined);
      await pause(page, 800);
      await page.getByRole('button', { name: /Sync pipelines/i }).hover().catch(() => undefined);
      await pause(page, 1000);
      await page.getByRole('button', { name: /Import|Bulk Actions|Configure stages/i }).first().hover().catch(
        () => undefined,
      );
      await pause(page, 900);
    });
  });

  test('generate-all-invoices training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'generate-all-invoices', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/bulk-operations');
      await clickByName(page, /Generate Invoices/i);
      await clickIfVisible(page.getByRole('button', { name: /Generate Invoices/i }));
      await pause(page, 800);
      await page.getByLabel(/Target Month/i).first().hover().catch(() => undefined);
      await page.getByRole('button', { name: /Generate Invoices for All Tenants/i }).hover();
      await pause(page, 1200);
      await clickByName(page, /Import Payments/i);
      await pause(page, 800);
      await clickByName(page, /Update Tenants/i);
      await pause(page, 800);
    });
  });

  test('send-reminders training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'send-reminders', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/notifications');
      await expect(page.getByText(/Generate Payment Reminders|Generate Reminders/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await pause(page, 1000);
      await page.getByText(/How Notifications Work/i).first().hover();
      await pause(page, 1200);
      await clickIfVisible(page.getByRole('button', { name: /Generate Reminders/i }));
      await pause(page, 2200);
      await page.getByText(/Process Notification Queue/i).first().hover();
      await pause(page, 800);
      await page.getByRole('button', { name: /Process Queue/i }).hover();
      await pause(page, 1400);
      await gotoSettled(page, '/admin/settings');
      await clickByName(page, /Notifications/i);
      await pause(page, 1000);
      await page.getByText(/In-app|Email/i).first().hover().catch(() => undefined);
      await pause(page, 900);
    });
  });

  test('late-fees training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'late-fees', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/settings');
      await clickByName(page, /System/i);
      await page.getByText(/Enable late-fee penalties/i).first().hover().catch(() => undefined);
      await pause(page, 900);
      await gotoSettled(page, '/admin/financial/late-fees/settings');
      await pause(page, 900);
      await gotoSettled(page, '/admin/financial/late-fees/apply');
      await page.getByRole('button', { name: /Calculate Eligible Fees|Dry run/i }).first().hover().catch(
        () => undefined,
      );
      await pause(page, 1000);
    });
  });

  test('payment-gateways training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'payment-gateways', async () => {
      await loginAsAdmin(page);
      await gotoSettled(page, '/admin/financial/payment-gateways');
      await expect(page.getByText(/Payment Gateway|Test Mode/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await page.getByText(/Test Mode/i).first().hover();
      await pause(page, 900);
      await page.getByRole('button', { name: /Save Configuration/i }).hover().catch(() => undefined);
      await pause(page, 1000);
    });
  });
});
