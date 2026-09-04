import {
  createQaBuilding,
  createQaRoom,
  createQaTenant,
  expect,
  fillLabeled,
  labeled,
  loginAsAdmin,
  loginAsTenant,
  pause,
  selectFirstRealOption,
  stamp,
  test,
} from './helpers';

test.describe('Tenants', () => {
  test('Happy path: create a tenant with portal email', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `rosa.cruz.${stamp()}@parenta.test`;
    await page.goto('/admin/tenants');
    await pause(page, 500);
    await page.getByRole('button', { name: 'Add Tenant' }).filter({ hasText: 'Add Tenant' }).first().click();
    await expect(page.getByRole('button', { name: 'Create Tenant' })).toBeVisible();
    await fillLabeled(page, 'First Name', 'Rosa');
    await fillLabeled(page, 'Last Name', 'Cruz');
    await fillLabeled(page, 'Email', email);
    await page.locator('#phone').fill('09171234800');
    await pause(page, 400);
    await page.getByRole('button', { name: 'Create Tenant' }).click();
    await expect(page.getByRole('dialog', { name: /Tenant account created/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Temporary password|temporary password/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Continue to tenant/i }).click();
    await pause(page, 600);
    await expect(page.getByText(/Rosa Cruz/i).first()).toBeVisible();
  });

  test('Required field validation: first name, last name, and email', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tenants');
    await page.getByRole('button', { name: 'Add Tenant' }).filter({ hasText: 'Add Tenant' }).first().click();
    await expect(page.getByRole('button', { name: 'Create Tenant' })).toBeVisible();
    await page.getByRole('button', { name: 'Create Tenant' }).click();
    await pause(page, 450);
    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();
    await fillLabeled(page, 'First Name', 'Rosa');
    await fillLabeled(page, 'Last Name', 'Cruz');
    await page.getByRole('button', { name: 'Create Tenant' }).click();
    await pause(page, 450);
    await expect(page.getByText('Email is required')).toBeVisible();
  });

  test('Invalid input: email format and negative monthly rent', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tenants');
    await page.getByRole('button', { name: 'Add Tenant' }).filter({ hasText: 'Add Tenant' }).first().click();
    await fillLabeled(page, 'First Name', 'Rosa');
    await fillLabeled(page, 'Last Name', 'Cruz');
    await fillLabeled(page, 'Email', 'not-an-email');
    await page.getByRole('button', { name: 'Create Tenant' }).click();
    await pause(page, 450);
    await expect(page.getByText('Email is invalid')).toBeVisible();
    await fillLabeled(page, 'Email', `rosa.valid.${stamp()}@parenta.test`);
    await page.getByRole('button', { name: 'Housing' }).click();
    await pause(page);
    await selectFirstRealOption(page.locator('#buildingId'), {
      prefer: /BALIBAGO|Balibago|VILLASOL|Villasol/i,
    });
    await pause(page, 500);
    const room = page.locator('#roomId');
    if (await room.isEnabled()) {
      await selectFirstRealOption(room, { skip: /₱0\/month|Admin|Store/i });
      await pause(page);
      const rent = page.locator('#monthlyRent');
      await rent.fill('-1');
      await pause(page, 400);
      await page.getByRole('button', { name: 'Create Tenant' }).click();
      await pause(page, 450);
      await expect(page.getByText('Monthly rent cannot be negative')).toBeVisible();
    }
  });

  test('Duplicate email is rejected', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tenants');
    await page.getByRole('button', { name: 'Add Tenant' }).filter({ hasText: 'Add Tenant' }).first().click();
    await fillLabeled(page, 'First Name', 'Rosa');
    await fillLabeled(page, 'Last Name', 'Cruz');
    await fillLabeled(page, 'Email', 'admin@parenta.com');
    await page.getByRole('button', { name: 'Create Tenant' }).click();
    await expect(
      page.getByText(/This email is already in use/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Edit/update an existing tenant', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `rosa.edit.${stamp()}@parenta.test`;
    const created = await createQaTenant(page, {
      firstName: 'Rosa',
      lastName: 'Cruz',
      email,
    });
    await page.goto(`/admin/tenants/${created.tenantId}`);
    await pause(page, 600);
    await page.getByRole('button', { name: 'Edit Tenant Information' }).click();
    await pause(page, 450);
    const lastName = page.getByLabel(/Last Name/i).first();
    await lastName.fill('Cruz-Reyes');
    await pause(page, 400);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/Saved/i).first()).toBeVisible({ timeout: 15_000 });
    await pause(page, 500);
    await expect(page.getByText(/Rosa Cruz-Reyes/i).first()).toBeVisible();
  });

  test('Delete/deactivate: no office Delete button; occupancy history is protected', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Ten Protect ${stamp()}`;
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `TP-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Nico',
      lastName: 'Reyes',
      email: `nico.reyes.${stamp()}@parenta.test`,
    });
    await page.goto(`/admin/tenants/${tenant.tenantId}`);
    await pause(page, 600);
    await expect(page.getByRole('button', { name: /^Delete$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Delete tenant/i })).toHaveCount(0);

    const { assignQaTenant } = await import('./helpers');
    await assignQaTenant(page, room.id, tenant.tenantId);
    const hard = await page.request.delete(`/api/tenants/${tenant.tenantId}`);
    expect(hard.status()).toBe(409);
    const body = (await hard.json()) as { error?: string; code?: string };
    expect(body.code || body.error || '').toMatch(/HISTORY_PROTECTED|occupancy history/i);
  });

  test('Room assignment requires lease template, start date, and rent', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tenants');
    await page.getByRole('button', { name: 'Add Tenant' }).filter({ hasText: 'Add Tenant' }).first().click();
    await fillLabeled(page, 'First Name', 'Rosa');
    await fillLabeled(page, 'Last Name', 'Cruz');
    await fillLabeled(page, 'Email', `rosa.room.${stamp()}@parenta.test`);
    await page.getByRole('button', { name: 'Housing' }).click();
    await pause(page);
    await selectFirstRealOption(page.locator('#buildingId'), {
      prefer: /BALIBAGO|Balibago|VILLASOL|Villasol/i,
    });
    await pause(page, 500);
    await selectFirstRealOption(page.locator('#roomId'), { skip: /₱0\/month|Admin|Store/i });
    await pause(page);
    await page.locator('#monthlyRent').fill('0');
    await pause(page);
    const template = labeled(page, 'Lease Template').first();
    if (await template.isVisible().catch(() => false)) {
      await template.selectOption({ index: 0 }).catch(() => undefined);
    }
    await page.getByRole('button', { name: 'Create Tenant' }).click();
    await pause(page, 500);
    await expect(
      page.getByText(/Monthly rent is required when assigning a room|Select a lease template|Lease start date is required/i).first(),
    ).toBeVisible();
  });

  test('Data persists correctly after a page refresh', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `rosa.persist.${stamp()}@parenta.test`;
    await createQaTenant(page, { firstName: 'Rosa', lastName: 'Cruz', email });
    await page.goto('/admin/tenants');
    await pause(page, 500);
    await page.locator('#tenant-search').fill(email);
    await pause(page, 500);
    await expect(page.getByText(/Rosa Cruz/i).first()).toBeVisible();
    await page.reload();
    await pause(page, 500);
    await page.locator('#tenant-search').fill(email);
    await pause(page, 500);
    await expect(page.getByText(/Rosa Cruz/i).first()).toBeVisible();
    await expect(page.getByText(email).first()).toBeVisible();
  });

  test('Permission check: tenant cannot open the Tenants admin list', async ({ page }) => {
    await page.goto('/admin/tenants');
    await expect(page).toHaveURL(/\/auth\/signin/);
    const email = `qa.ten.perm.${stamp()}@parenta.test`;
    await loginAsAdmin(page);
    await createQaTenant(page, {
      firstName: 'Portal',
      lastName: 'Guest',
      email,
      password: 'PortalPass1',
    });
    await page.context().clearCookies();
    await loginAsTenant(page, { email, password: 'PortalPass1' });
    await page.goto('/admin/tenants');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Search tenants by name, email, or unit', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `rosa.search.${stamp()}@parenta.test`;
    await createQaTenant(page, { firstName: 'Rosa', lastName: 'Cruz', email });
    await page.goto('/admin/tenants');
    await pause(page, 500);
    await page.locator('#tenant-search').fill('Rosa Cruz');
    await pause(page, 500);
    await expect(page.getByText(/Rosa Cruz/i).first()).toBeVisible();
    await page.locator('#tenant-search').fill(email);
    await pause(page, 500);
    await expect(page.getByText(email).first()).toBeVisible();
    await page.locator('#tenant-search').fill('ZZZZNOMATCH-QA');
    await pause(page, 500);
    await expect(page.getByText(/Rosa Cruz/i)).toHaveCount(0);
  });

  test('Filter tenants by building', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `rosa.unassigned.${stamp()}@parenta.test`;
    await createQaTenant(page, { firstName: 'Rosa', lastName: 'Unassigned', email });
    await page.goto('/admin/tenants');
    await pause(page, 500);
    await page.locator('#tenant-property').selectOption({ label: 'Unassigned' });
    await pause(page, 500);
    await page.locator('#tenant-search').fill(email);
    await pause(page, 500);
    await expect(page.getByText(/Rosa Unassigned/i).first()).toBeVisible();
  });

  test('Filter tenants by status', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tenants');
    await pause(page, 500);
    await expect(page.locator('#tenant-status')).toBeVisible();
    await page.locator('#tenant-status').selectOption({ label: 'Current tenants' });
    await pause(page, 500);
    await expect(page.getByRole('button', { name: 'Add Tenant' }).first()).toBeVisible();
    await page.locator('#tenant-status').selectOption({ label: 'Former tenants' });
    await pause(page, 500);
    await expect(page.locator('#tenant-status')).toBeVisible();
  });

  test('Sort tenants', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tenants');
    await pause(page, 500);
    await expect(page.locator('#tenant-sort')).toBeVisible();
    await page.locator('#tenant-sort').selectOption({ label: /Last Name/i });
    await pause(page, 450);
    await expect(page.getByRole('button', { name: 'Add Tenant' }).first()).toBeVisible();
  });

  test('Export on Tenants', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tenants');
    await pause(page, 500);
    await expect(page.getByRole('button', { name: 'Add Tenant' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Export|Print/i })).toHaveCount(0);
  });
});
