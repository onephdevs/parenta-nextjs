import type { Page } from '@playwright/test';
import {
  clickNamed,
  expect,
  loginAsAdmin,
  maybeClickFilters,
  pause,
  saveJobVideo,
  selectFirstRealOption,
  test,
  todayIso,
} from './helpers';

async function openPicker(page: Page) {
  await page.goto('/admin/financial/payments/new');
  await pause(page, 600);
  await expect(page.getByRole('heading', { name: 'Process Payment' })).toBeVisible();
  await selectFirstRealOption(page.locator('#property-pick'), {
    prefer: /BALIBAGO|Balibago|VILLASOL|Villasol/i,
  });
  await pause(page, 600);
  const tenantPick = page.locator('#tenant-pick');
  await expect(tenantPick).toBeEnabled({ timeout: 20_000 });
  await expect
    .poll(
      async () =>
        tenantPick.locator('option').evaluateAll((options) =>
          options.filter((option) => Boolean((option as HTMLOptionElement).value)).length,
        ),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);
  return tenantPick;
}

async function continueToInvoices(page: Page) {
  await clickNamed(page, 'Continue');
  await expect(page.getByText('Loading payment details…')).toBeHidden({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: '1. Select invoice to pay' })).toBeVisible({
    timeout: 20_000,
  });
}

test('collect-rent training recording', async ({ page }, testInfo) => {
  test.setTimeout(10 * 60 * 1000);

  try {
    // --- Login: office admin ---
    await loginAsAdmin(page);

    // --- Main flow: Payments → Process Payment ---
    await page.goto('/admin/financial/payments');
    await pause(page, 600);
    await page.getByRole('link', { name: 'Process Payment' }).click();
    await pause(page, 600);

    await selectFirstRealOption(page.locator('#property-pick'), {
      prefer: /BALIBAGO|Balibago|VILLASOL|Villasol/i,
    });
    await pause(page, 600);

    const tenantPick = page.locator('#tenant-pick');
    await expect(tenantPick).toBeEnabled({ timeout: 20_000 });
    await expect
      .poll(
        async () =>
          tenantPick.locator('option').evaluateAll((options) =>
            options.filter((option) => Boolean((option as HTMLOptionElement).value)).length,
          ),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(0);

    await selectFirstRealOption(tenantPick, { prefer: /Maria Reyes|Reyes/i });
    const tenantValues = await tenantPick.locator('option').evaluateAll((options) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          text: (option.textContent || '').trim(),
        }))
        .filter((row) => row.value),
    );
    const preferred = tenantValues.filter((row) => /Maria Reyes|Reyes/i.test(row.text));
    const rest = tenantValues.filter((row) => !/Maria Reyes|Reyes/i.test(row.text));
    const ordered = [...preferred, ...rest];

    let hasInvoice = false;
    for (const tenant of ordered.slice(0, 8)) {
      const onPicker = await page.locator('#tenant-pick').isVisible().catch(() => false);
      if (!onPicker) {
        await openPicker(page);
      }
      await page.locator('#tenant-pick').selectOption(tenant.value);
      await pause(page, 400);
      await continueToInvoices(page);

      const invoiceRadio = page.locator('input[name="invoice"]');
      const empty = page.getByText('No unpaid invoices for this tenant.');
      if (await invoiceRadio.first().isVisible().catch(() => false)) {
        hasInvoice = true;
        break;
      }
      if (await empty.isVisible().catch(() => false)) {
        await pause(page, 500);
        await openPicker(page);
        continue;
      }
      break;
    }

    if (!hasInvoice) {
      // --- Watch out for: nothing to apply the payment to yet ---
      await page.goto('/admin/financial/invoices/new');
      await pause(page);
      await selectFirstRealOption(page.locator('#tenantId'), {
        prefer: /Maria Reyes|Reyes/i,
      });
      await pause(page, 800);
      await selectFirstRealOption(page.locator('#roomId'));
      await pause(page);
      await page.getByRole('button', { name: 'Dates' }).click();
      await pause(page);
      await page.locator('#dueDate').fill(todayIso());
      await pause(page);
      await page.getByRole('button', { name: 'Items' }).click();
      await pause(page);
      await page.locator('#item-description-0').fill('August rent — Balibago');
      await page.locator('#item-unitPrice-0').fill('4800');
      await pause(page);
      await clickNamed(page, 'Create Invoice');
      await expect(page.getByText(/Invoice created successfully/i)).toBeVisible({
        timeout: 20_000,
      });
      await pause(page, 800);

      const picker = await openPicker(page);
      await selectFirstRealOption(picker, { prefer: /Maria Reyes|Reyes/i });
      await pause(page);
      await continueToInvoices(page);
    }

    // --- Watch out for: Confirm Payment stays off until invoice + amount > 0 ---
    const invoiceRadio = page.locator('input[name="invoice"]').first();
    await expect(invoiceRadio).toBeVisible({ timeout: 20_000 });
    await invoiceRadio.check();
    await pause(page);

    const confirm = page.getByRole('button', { name: 'Confirm Payment' });
    const amountField = page.locator('#amount');
    await expect(amountField).toBeVisible();
    const dueAmount = await amountField.inputValue();

    await amountField.fill('0');
    await pause(page);
    await expect(confirm).toBeDisabled();
    await pause(page);

    await page.locator('#pay-method').selectOption({ label: 'GCash' });
    await pause(page);
    await page.locator('#pay-date').fill(todayIso());
    await pause(page);

    const amountToPay = dueAmount && Number(dueAmount) > 0 ? dueAmount : '4800';
    await amountField.fill(amountToPay);
    await pause(page);
    await expect(confirm).toBeEnabled();

    await page.locator('#notes').fill('GCash collection for August rent');
    await pause(page);

    await confirm.click();
    await pause(page);
    await page.getByRole('button', { name: 'Yes, Confirm Payment' }).click();
    await expect(page.getByText(/Successfully recorded/i)).toBeVisible({
      timeout: 20_000,
    });
    await pause(page, 600);

    // --- Done when: payment receipt, then list after refresh ---
    await expect(page).toHaveURL(/\/admin\/financial\/payments/);
    if (!/\/payments\/[a-z0-9-]+/i.test(page.url())) {
      await page.goto('/admin/financial/payments');
      await pause(page);
      await expect(page.getByLabel('Search payments')).toBeVisible();
      await maybeClickFilters(page);
      await expect(page.locator('#payments-status')).toBeVisible();
      await page.locator('#payments-due-date').selectOption({ label: 'All due dates' });
      await pause(page);
      await page.locator('#payments-status').selectOption({ label: 'Paid' });
      await pause(page, 600);
      const receiptLink = page.locator('a[href*="/admin/financial/payments/"]:not([href*="/new"])');
      if (await receiptLink.first().isVisible().catch(() => false)) {
        await receiptLink.first().click();
      } else {
        await page.getByRole('link', { name: /Paid Rent|Partially paid/i }).first().click();
      }
      await pause(page, 800);
    }
    await expect(page.getByText(/Receipt details|Amount paid|Fully paid|Payment/i).first()).toBeVisible({
      timeout: 15_000,
    }).catch(() => undefined);
    await page.reload();
    await pause(page, 600);
    await expect(page.getByText(/Receipt details|Amount paid|Fully paid|Payment/i).first()).toBeVisible({
      timeout: 15_000,
    }).catch(() => undefined);

    // --- Also on this page: payment receipt Refund / Void (open + cancel) ---
    const refund = page.getByRole('button', { name: 'Refund' });
    if (await refund.isVisible().catch(() => false)) {
      await refund.click();
      await pause(page);
      await expect(page.getByText('Refund this payment?')).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
      await pause(page);
    }
    const voidBtn = page.getByRole('button', { name: 'Void' });
    if (await voidBtn.isVisible().catch(() => false)) {
      await voidBtn.click();
      await pause(page);
      await expect(page.getByText('Void this payment?')).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
      await pause(page);
    }

    await page.goto('/admin/financial/payments');
    await pause(page);
    await expect(page.getByLabel('Search payments')).toBeVisible();
    await maybeClickFilters(page);
    await expect(page.locator('#payments-status')).toBeVisible();
    await page.locator('#payments-due-date').selectOption({ label: 'All due dates' });
    await pause(page);
    await page.locator('#payments-status').selectOption({ label: 'Paid' });
    await pause(page, 600);
    await expect(page.getByRole('link', { name: /Paid Rent|Partially paid/i }).first()).toBeVisible();

    // --- Also on this page: search and filters ---
    await page.getByLabel('Search payments').fill('4800');
    await pause(page, 600);
    await page.getByLabel('Search payments').fill('');
    await pause(page);

    await page.locator('#payments-due-date').selectOption({ label: 'This month' });
    await pause(page);
    await page.locator('#payments-due-date').selectOption({ label: 'All due dates' });
    await pause(page);
    await page.locator('#payments-type').selectOption({ label: 'Rent' });
    await pause(page);
    await page.locator('#payments-type').selectOption({ label: 'All types' });
    await pause(page);
    await page.locator('#payments-status').selectOption({ label: 'All statuses' });
    await pause(page);

    const next = page.getByRole('button', { name: 'Next' });
    if (await next.isEnabled().catch(() => false)) {
      await next.click();
      await pause(page);
      await page.getByRole('button', { name: 'Previous' }).click();
      await pause(page);
    }

    // Doc: No column sort. No bulk actions. No export.

    const pending = page.getByText('Pending verification');
    if (await pending.isVisible().catch(() => false)) {
      await pending.scrollIntoViewIfNeeded();
      await pause(page);
    }
  } finally {
    await saveJobVideo(page, testInfo, 'collect-rent');
  }
});
