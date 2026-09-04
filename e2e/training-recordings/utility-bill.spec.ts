import {
  clickNamed,
  expect,
  loginAsAdmin,
  maybeClickFilters,
  pause,
  plusDaysIso,
  saveJobVideo,
  selectFirstRealOption,
  test,
  todayIso,
} from './helpers';

test('utility-bill training recording', async ({ page }, testInfo) => {
  test.setTimeout(10 * 60 * 1000);

  try {
    // --- Login: office admin ---
    await loginAsAdmin(page);

    await page.goto('/admin/bills-expenses/utility-bills');
    await pause(page, 600);
    await page.getByRole('link', { name: 'Add Bill' }).click();
    await pause(page, 600);

    // --- Watch out for: Amount must be greater than 0 ---
    await page.locator('#scope').selectOption({ label: 'Building-wide (common area)' });
    await pause(page);
    await selectFirstRealOption(page.locator('#buildingId'), {
      prefer: /BALIBAGO|Balibago/i,
    });
    await pause(page);
    await page.getByRole('button', { name: 'Utility' }).click();
    await pause(page);
    await page.locator('#utilityType').selectOption({ label: 'Electric' });
    await pause(page);
    await page.locator('#allocationMethod').selectOption('SHARED_MANUAL');
    await pause(page);
    const equalSplit = page.getByRole('checkbox', { name: /Equal-split across units/i });
    await expect(equalSplit).toBeVisible();
    if (!(await equalSplit.isChecked())) {
      await equalSplit.check();
    }
    await pause(page);

    await page.getByRole('button', { name: 'Period' }).click();
    await pause(page);
    await page.locator('#billingPeriodStart').fill(todayIso());
    await page.locator('#billingPeriodEnd').fill(plusDaysIso(15));
    await page.locator('#dueDate').fill(plusDaysIso(20));
    await pause(page);

    await page.getByRole('button', { name: 'Amount' }).click();
    await pause(page);
    await page.locator('#amount').fill('0');
    await clickNamed(page, 'Create Bill');
    await expect(page.getByText('Amount must be greater than 0')).toBeVisible();
    await pause(page);

    // --- Main flow: building-wide equal-split ---
    await page.getByRole('button', { name: 'Amount' }).click();
    await pause(page);
    await page.locator('#amount').fill('4800');
    await clickNamed(page, 'Create Bill');
    await expect(page.getByText(/Utility bill created successfully|Bill created|created successfully/i).first()).toBeVisible({
      timeout: 20_000,
    }).catch(() => undefined);
    await pause(page, 600);

    // --- Done when: list after refresh ---
    await page.goto('/admin/bills-expenses/utility-bills');
    await page.reload();
    await pause(page, 600);
    await expect(page.getByRole('heading', { name: 'Room Utility Bills', exact: true })).toBeVisible();

    // --- Also on this page: search / filters / pagination ---
    await page.getByLabel('Search utility bills').fill('Balibago');
    await pause(page, 600);
    await page.getByLabel('Search utility bills').fill('');
    await pause(page);

    await maybeClickFilters(page);
    await expect(page.locator('#building')).toBeVisible();
    await selectFirstRealOption(page.locator('#building'), {
      prefer: /BALIBAGO|Balibago/i,
    });
    await pause(page);
    await page.locator('#building').selectOption({ label: 'All Buildings' });
    await pause(page);
    await page.locator('#utilityType').selectOption({ label: 'Electricity' });
    await pause(page);
    await page.locator('#utilityType').selectOption({ label: 'All Types' });
    await pause(page);
    await page.locator('#status').selectOption({ label: 'Pending' });
    await pause(page);
    await page.locator('#status').selectOption({ label: 'All Status' });
    await pause(page);

    const next = page.getByRole('button', { name: 'Next' });
    if (await next.isEnabled().catch(() => false)) {
      await next.click();
      await pause(page);
      await page.getByRole('button', { name: 'Previous' }).click();
      await pause(page);
    }

    // Doc: No sort. No bulk. No export or print.

    // --- Also on this page: Mark as Paid (confirm) ---
    const markPaid = page.locator('button[title="Mark as Paid"]').first();
    if (await markPaid.isVisible().catch(() => false)) {
      await markPaid.hover();
      await pause(page, 800);
    }

    // --- Also on this page: bill detail (read-only) ---
    if (!/\/utility-bills\/[^/]+/.test(page.url())) {
      await page
        .locator('a[href*="/admin/bills-expenses/utility-bills/"]:not([href*="/new"])')
        .first()
        .click();
      await pause(page, 600);
    }
    await expect(page.getByText(/Overview|Bill details/i).first()).toBeVisible();
    await page.getByRole('link', { name: 'Back to utility bills' }).click();
    await pause(page);

    // --- Also on this page: Scope specific unit does not split ---
    await page.getByRole('link', { name: 'Add Bill' }).click();
    await pause(page);
    await page.locator('#scope').selectOption({ label: 'Specific unit / room' });
    await pause(page);
    await expect(page.locator('#roomId')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await pause(page);
  } finally {
    await saveJobVideo(page, testInfo, 'utility-bill');
  }
});
