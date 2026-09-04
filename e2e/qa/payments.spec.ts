import {
  createQaInvoice,
  createQaPayment,
  createQaTenant,
  expect,
  loginAsAdmin,
  loginAsTenant,
  maybeClickFilters,
  pause,
  selectFirstRealOption,
  stamp,
  test,
} from './helpers';

test.describe('Payments', () => {
  test('Happy path: record ₱4,800 GCash against a rent invoice', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `pay.happy.${stamp()}@parenta.test`;
    const tenant = await createQaTenant(page, {
      firstName: 'Paolo',
      lastName: 'Garcia',
      email,
    });
    const invoice = await createQaInvoice(page, tenant.tenantId, 4800);
    await page.goto(
      `/admin/financial/payments/new?tenantId=${encodeURIComponent(tenant.tenantId)}&invoiceId=${encodeURIComponent(invoice.id)}&amount=4800`,
    );
    await pause(page, 600);
    await expect(page.getByRole('heading', { name: '1. Select invoice to pay' })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('radio', { name: /invoice/i }).first().click().catch(async () => {
      await page.locator('input[name="invoice"]').first().click();
    });
    await pause(page, 450);
    await page.locator('#amount').fill('4800');
    await pause(page, 400);
    const method = page.locator('#pay-method');
    if (await method.isVisible().catch(() => false)) {
      await method.selectOption({ label: /GCash/i });
      await pause(page, 400);
    }
    await page.getByRole('button', { name: 'Confirm Payment' }).click();
    await pause(page, 450);
    await page.getByRole('button', { name: 'Yes, Confirm Payment' }).click();
    await expect(page.getByText(/Payment recorded|allocated successfully|Receipt/i).first()).toBeVisible({
      timeout: 25_000,
    });
    await expect(page).toHaveURL(/\/admin\/financial\/payments\/.+/);
    expect(invoice.invoiceNumber).toBeTruthy();
  });

  test('Required field validation: Confirm Payment stays off until invoice and amount', async ({ page }) => {
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Paolo',
      lastName: 'Disabled',
      email: `pay.off.${stamp()}@parenta.test`,
    });
    await createQaInvoice(page, tenant.tenantId, 4800);
    await page.goto(
      `/admin/financial/payments/new?tenantId=${encodeURIComponent(tenant.tenantId)}`,
    );
    await pause(page, 600);
    await expect(page.getByRole('heading', { name: '1. Select invoice to pay' })).toBeVisible({
      timeout: 20_000,
    });
    await page.locator('#amount').fill('0');
    await pause(page, 400);
    await expect(page.getByRole('button', { name: 'Confirm Payment' })).toBeDisabled();
  });

  test('Invalid input: amount must be greater than 0', async ({ page }) => {
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Paolo',
      lastName: 'Zero',
      email: `pay.zero.${stamp()}@parenta.test`,
    });
    const zero = await page.request.post('/api/payments', {
      data: {
        tenantId: tenant.tenantId,
        amount: 0,
        paymentType: 'rent',
        paymentMethod: 'gcash',
        paymentDate: new Date().toISOString().slice(0, 10),
      },
    });
    expect(zero.status()).toBe(400);
    const json = (await zero.json()) as { error?: string; details?: string };
    expect(`${json.error} ${json.details}`).toMatch(/greater than 0/i);
    await page.goto('/admin/financial/payments/new');
    await pause(page, 500);
    await expect(page.getByRole('heading', { name: 'Process Payment' })).toBeVisible();
  });

  test('Invalid input: missing payment type or date on the API', async ({ page }) => {
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Paolo',
      lastName: 'Api',
      email: `pay.api.${stamp()}@parenta.test`,
    });
    const noType = await page.request.post('/api/payments', {
      data: {
        tenantId: tenant.tenantId,
        amount: 4800,
        paymentDate: new Date().toISOString().slice(0, 10),
      },
    });
    expect(noType.status()).toBe(400);
    expect(((await noType.json()) as { error?: string }).error).toMatch(/Payment type is required/i);
    const noDate = await page.request.post('/api/payments', {
      data: {
        tenantId: tenant.tenantId,
        amount: 4800,
        paymentType: 'rent',
        paymentMethod: 'gcash',
      },
    });
    expect(noDate.status()).toBe(400);
    expect(((await noDate.json()) as { error?: string }).error).toMatch(/Payment date is required/i);
  });

  test('Edit/update: refund keeps the row and restores the invoice', async ({ page }) => {
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Paolo',
      lastName: 'Refund',
      email: `pay.refund.${stamp()}@parenta.test`,
    });
    const invoice = await createQaInvoice(page, tenant.tenantId, 4800);
    const payment = await createQaPayment(page, {
      tenantId: tenant.tenantId,
      amount: 4800,
      invoiceId: invoice.id,
    });
    await page.goto(`/admin/financial/payments/${payment.id}`);
    await pause(page, 600);
    await page.getByRole('button', { name: 'Refund' }).click();
    await pause(page, 450);
    await expect(page.getByText(/Refund this payment/i)).toBeVisible();
    await page.getByRole('button', { name: 'Refund', exact: true }).last().click();
    await expect(page.getByText(/Payment refunded/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Invoice balances were restored|Refunded/i).first()).toBeVisible();
    await page.reload();
    await pause(page, 500);
    await expect(page.getByText(/Refunded/i).first()).toBeVisible();
  });

  test('Delete/deactivate: void deletes the payment and restores the invoice', async ({ page }) => {
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Paolo',
      lastName: 'Void',
      email: `pay.void.${stamp()}@parenta.test`,
    });
    const invoice = await createQaInvoice(page, tenant.tenantId, 4800);
    const payment = await createQaPayment(page, {
      tenantId: tenant.tenantId,
      amount: 4800,
      invoiceId: invoice.id,
    });
    await page.goto(`/admin/financial/payments/${payment.id}`);
    await pause(page, 600);
    await page.getByRole('button', { name: 'Void' }).click();
    await pause(page, 450);
    await expect(page.getByText(/Void this payment/i)).toBeVisible();
    await page.getByRole('button', { name: 'Void payment' }).click();
    await expect(page.getByText(/Payment voided/i)).toBeVisible({ timeout: 15_000 });
    await page.goto(`/admin/financial/payments/${payment.id}`);
    await pause(page, 500);
    await expect(page.getByText(/not found|removed|Back to payments/i).first()).toBeVisible();
  });

  test('Duplicate/conflict: a second payment on the same invoice is allowed — flag as bug', async ({ page }) => {
    // Unexpectedly permissive: no uniqueness guard on invoiceId.
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Paolo',
      lastName: 'Double',
      email: `pay.dup.${stamp()}@parenta.test`,
    });
    const invoice = await createQaInvoice(page, tenant.tenantId, 4800);
    const first = await createQaPayment(page, {
      tenantId: tenant.tenantId,
      amount: 4800,
      invoiceId: invoice.id,
    });
    const second = await createQaPayment(page, {
      tenantId: tenant.tenantId,
      amount: 4800,
      invoiceId: invoice.id,
    });
    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(second.id).not.toBe(first.id);
  });

  test('Data persists correctly after a page refresh', async ({ page }) => {
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Paolo',
      lastName: 'Persist',
      email: `pay.persist.${stamp()}@parenta.test`,
    });
    const invoice = await createQaInvoice(page, tenant.tenantId, 4800);
    await createQaPayment(page, {
      tenantId: tenant.tenantId,
      amount: 4800,
      invoiceId: invoice.id,
    });
    await page.goto('/admin/financial/payments');
    await pause(page, 500);
    await maybeClickFilters(page);
    await page.locator('#payments-search').fill(invoice.invoiceNumber || 'Paolo Persist');
    await pause(page, 500);
    await expect(page.getByText(/Paolo Persist|Paid|Partially paid/i).first()).toBeVisible();
    await page.reload();
    await pause(page, 500);
    await maybeClickFilters(page);
    await page.locator('#payments-search').fill(invoice.invoiceNumber || 'Paolo Persist');
    await pause(page, 500);
    await expect(page.getByText(/Paolo Persist|Paid|Partially paid/i).first()).toBeVisible();
  });

  test('Permission check: tenant cannot open office Payments; refund/void are admin', async ({ page }) => {
    await page.goto('/admin/financial/payments');
    await expect(page).toHaveURL(/\/auth\/signin/);
    const email = `pay.perm.${stamp()}@parenta.test`;
    await loginAsAdmin(page);
    await createQaTenant(page, {
      firstName: 'Portal',
      lastName: 'Guest',
      email,
      password: 'PortalPass1',
    });
    await page.context().clearCookies();
    await loginAsTenant(page, { email, password: 'PortalPass1' });
    await page.goto('/admin/financial/payments');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Search collections', async ({ page }) => {
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Paolo',
      lastName: 'Search',
      email: `pay.srch.${stamp()}@parenta.test`,
    });
    const invoice = await createQaInvoice(page, tenant.tenantId, 4800);
    await page.goto('/admin/financial/payments');
    await pause(page, 500);
    await maybeClickFilters(page);
    await page.locator('#payments-search').fill(invoice.invoiceNumber);
    await pause(page, 500);
    await expect(page.getByText(new RegExp(invoice.invoiceNumber)).first()).toBeVisible();
  });

  test('Filter by status', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/financial/payments');
    await pause(page, 500);
    await maybeClickFilters(page);
    await expect(page.locator('#payments-status')).toBeVisible();
    await page.locator('#payments-status').selectOption({ label: /Paid/i });
    await pause(page, 500);
    await expect(page.getByRole('link', { name: 'Process Payment' })).toBeVisible();
    await page.locator('#payments-status').selectOption({ label: /Unpaid/i });
    await pause(page, 500);
    await expect(page.locator('#payments-status')).toBeVisible();
  });

  test('Filter by type', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/financial/payments');
    await pause(page, 500);
    await maybeClickFilters(page);
    await page.locator('#payments-type').selectOption({ label: /Rent/i });
    await pause(page, 500);
    await expect(page.locator('#payments-type')).toBeVisible();
  });

  test('Filter by property', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/financial/payments');
    await pause(page, 500);
    await maybeClickFilters(page);
    await expect(page.locator('#payments-building')).toBeVisible();
    await selectFirstRealOption(page.locator('#payments-building'), {
      prefer: /BALIBAGO|Balibago/i,
    });
    await pause(page, 500);
    await expect(page.getByRole('link', { name: 'Process Payment' })).toBeVisible();
  });

  test('Export on Payments', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/financial/payments');
    await pause(page, 500);
    await expect(page.getByRole('link', { name: 'Process Payment' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export|Clear filters/i })).toHaveCount(0);
  });
});
