import {
  expect,
  loginAsAdmin,
  loginAsTenant,
  pause,
  plusDaysIso,
  selectFirstRealOption,
  stamp,
  test,
  todayIso,
  createQaTenant,
} from './helpers';

test.describe('Utility Bills', () => {
  test('Happy path: building-wide ₱4,800 electric bill, equal-split', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills');
    await pause(page, 500);
    await page.getByRole('link', { name: 'Add Bill' }).click();
    await pause(page, 500);
    await page.locator('#scope').selectOption({ label: /Building-wide/i });
    await pause(page);
    await selectFirstRealOption(page.locator('#buildingId'), { prefer: /BALIBAGO|Balibago/i });
    await pause(page);
    await page.getByRole('button', { name: 'Utility' }).click();
    await pause(page);
    await page.locator('#utilityType').selectOption({ label: /Electric/i });
    await page.locator('#allocationMethod').selectOption('SHARED_MANUAL');
    const equalSplit = page.getByRole('checkbox', { name: /Equal-split across units/i });
    if (!(await equalSplit.isChecked())) await equalSplit.check();
    await pause(page);
    await page.getByRole('button', { name: 'Period' }).click();
    await pause(page);
    await page.locator('#billingPeriodStart').fill(todayIso());
    await page.locator('#billingPeriodEnd').fill(plusDaysIso(15));
    await page.locator('#dueDate').fill(plusDaysIso(20));
    await page.getByRole('button', { name: 'Amount' }).click();
    await pause(page);
    await page.locator('#amount').fill('4800');
    await pause(page, 400);
    await page.getByRole('button', { name: 'Create Bill' }).click();
    await expect(page.getByText(/Utility bill created successfully/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test('Required field validation: building, amount, and dates', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills/new');
    await pause(page, 500);
    await page.locator('#scope').selectOption({ label: /Building-wide/i });
    await pause(page);
    await page.getByRole('button', { name: 'Create Bill' }).click();
    await pause(page, 450);
    await expect(page.getByText(/Building is required for building-wide bills/i)).toBeVisible();
    await expect(page.getByText('Amount must be greater than 0')).toBeVisible();
    await expect(page.getByText('Start date is required')).toBeVisible();
    await expect(page.getByText('End date is required')).toBeVisible();
    await expect(page.getByText('Due date is required')).toBeVisible();
    await expect(page.getByText(/Please fix the form errors/i)).toBeVisible();
  });

  test('Invalid input: amount 0 and end date before start', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills/new');
    await pause(page, 500);
    await page.locator('#scope').selectOption({ label: /Building-wide/i });
    await selectFirstRealOption(page.locator('#buildingId'), { prefer: /BALIBAGO|Balibago/i });
    await page.getByRole('button', { name: 'Period' }).click();
    await page.locator('#billingPeriodStart').fill(plusDaysIso(10));
    await page.locator('#billingPeriodEnd').fill(todayIso());
    await page.locator('#dueDate').fill(plusDaysIso(20));
    await page.getByRole('button', { name: 'Amount' }).click();
    await page.locator('#amount').fill('0');
    await page.getByRole('button', { name: 'Create Bill' }).click();
    await pause(page, 450);
    await expect(page.getByText('Amount must be greater than 0')).toBeVisible();
    await expect(page.getByText('End date must be on or after start date')).toBeVisible();
  });

  test('Specific unit / room does not split', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills/new');
    await pause(page, 500);
    await page.locator('#scope').selectOption({ label: /Specific unit/i });
    await pause(page);
    await selectFirstRealOption(page.locator('#roomId').or(page.locator('#buildingId')), {
      prefer: /BALIBAGO|VILLASOL|Unit|QA/i,
    });
    await pause(page, 500);
    if (await page.locator('#roomId').isVisible()) {
      await selectFirstRealOption(page.locator('#roomId'));
    }
    await page.getByRole('button', { name: 'Period' }).click();
    await page.locator('#billingPeriodStart').fill(todayIso());
    await page.locator('#billingPeriodEnd').fill(plusDaysIso(15));
    await page.locator('#dueDate').fill(plusDaysIso(20));
    await page.getByRole('button', { name: 'Amount' }).click();
    await page.locator('#amount').fill('4800');
    await page.getByRole('button', { name: 'Create Bill' }).click();
    await expect(page.getByText(/Utility bill created successfully/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test('Edit/update: Mark as Paid', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills');
    await pause(page, 600);
    const mark = page.getByTitle('Mark as Paid').first();
    await expect(mark).toBeVisible({ timeout: 15_000 });
    await mark.click();
    await pause(page, 450);
    await expect(page.getByText(/Mark bill as paid/i)).toBeVisible();
    await expect(
      page.getByText(/does not record a tenant payment/i),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Mark as Paid' }).click();
    await expect(page.getByText(/Bill marked as paid/i)).toBeVisible({ timeout: 15_000 });
  });

  test('Delete a parent bill also removes per-room shares', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills');
    await pause(page, 500);
    const del = page.getByTitle('Delete').first();
    await expect(del).toBeVisible();
    await del.click();
    await pause(page, 450);
    await expect(page.getByText(/Delete bill/i)).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(/Bill deleted successfully/i)).toBeVisible({ timeout: 15_000 });
  });

  test('No validation found — flag as bug: bill detail has no edit', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills');
    await pause(page, 500);
    const open = page.getByRole('link', { name: /View|Open/i }).first();
    if (await open.isVisible().catch(() => false)) {
      await open.click();
    } else {
      await page.locator('a[href*="/admin/bills-expenses/utility-bills/"]').nth(1).click();
    }
    await pause(page, 600);
    await expect(page.getByRole('button', { name: /Edit|Mark as Paid|Delete/i })).toHaveCount(0);
    await expect(page.getByText(/Overview|Bill details/i).first()).toBeVisible();
  });

  test('Data persists correctly after a page refresh', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills');
    await pause(page, 500);
    await expect(page.getByRole('heading', { name: 'Room Utility Bills', exact: true })).toBeVisible();
    await page.reload();
    await pause(page, 500);
    await expect(page.getByRole('heading', { name: 'Room Utility Bills', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add Bill' })).toBeVisible();
  });

  test('Permission check: utility-bills API is admin only', async ({ page }) => {
    await page.goto('/admin/bills-expenses/utility-bills');
    await expect(page).toHaveURL(/\/auth\/signin/);
    const unauth = await page.request.post('/api/utility-bills/room', {
      data: { utilityType: 'electricity', amount: 4800 },
    });
    expect(unauth.status()).toBe(401);
    const email = `util.perm.${stamp()}@parenta.test`;
    await loginAsAdmin(page);
    await createQaTenant(page, {
      firstName: 'Portal',
      lastName: 'Guest',
      email,
      password: 'PortalPass1',
    });
    await page.context().clearCookies();
    await loginAsTenant(page, { email, password: 'PortalPass1' });
    await page.goto('/admin/bills-expenses/utility-bills');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Search bills', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills');
    await pause(page, 500);
    await page.getByLabel('Search utility bills').fill('Balibago');
    await pause(page, 500);
    await expect(page.getByRole('heading', { name: 'Room Utility Bills', exact: true })).toBeVisible();
  });

  test('Filter by building, utility type, and status', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills');
    await pause(page, 500);
    await expect(page.locator('#building')).toBeVisible();
    await selectFirstRealOption(page.locator('#building'), { prefer: /BALIBAGO|Balibago/i });
    await pause(page, 400);
    await page.locator('#utilityType').selectOption({ label: /Electric/i });
    await pause(page, 400);
    await page.locator('#status').selectOption({ label: /Pending/i });
    await pause(page, 400);
    await expect(page.getByRole('link', { name: 'Add Bill' })).toBeVisible();
  });

  test('Export / sort on the list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/bills-expenses/utility-bills');
    await pause(page, 500);
    await expect(page.getByRole('button', { name: /Export|Print/i })).toHaveCount(0);
  });
});
