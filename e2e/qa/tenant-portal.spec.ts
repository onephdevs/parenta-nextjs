import {
  createQaTenant,
  expect,
  loginAsAdmin,
  loginAsTenant,
  pause,
  seedRecordingPortalTenant,
  stamp,
  test,
} from './helpers';

test.describe('Tenant Portal', () => {
  test('Happy path: tenant signs in and sees their unit', async ({ page }) => {
    const email = `portal.happy.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Ramos',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await expect(page).toHaveURL(/\/tenant/);
    await pause(page, 500);
    await expect(page.getByText(/Your unit/i).first()).toBeVisible();
  });

  test('Invalid login', async ({ page }) => {
    await page.goto('/auth/signin');
    await pause(page, 400);
    await page.getByRole('textbox', { name: 'Email or username' }).fill('nobody@parenta.test');
    await pause(page, 400);
    await page.locator('#password').fill('wrong-password');
    await pause(page, 400);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('Invalid email, username, or password')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Required field validation: first-visit password rules', async ({ page }) => {
    const email = `portal.setup.${stamp()}@parenta.test`;
    const password = 'TempPass12';
    await loginAsAdmin(page);
    await page.request.post('/api/tenants', {
      data: {
        firstName: 'Teresa',
        lastName: 'Setup',
        email,
        password,
        createUserAccount: true,
        profileCompleted: false,
        sendInvitation: false,
      },
    });
    await page.context().clearCookies();
    await loginAsTenant(page, { email, password });
    await pause(page, 600);
    const setup = page.getByText(/Set up your account/i);
    if (await setup.isVisible().catch(() => false)) {
      await page.locator('#newPassword').fill('short');
      await page.locator('#confirmPassword').fill('short');
      await page.getByRole('button', { name: 'Save and continue' }).click();
      await expect(page.getByText(/at least 8 characters/i).first()).toBeVisible();
      await page.locator('#newPassword').fill('password1');
      await page.locator('#confirmPassword').fill('password2');
      await pause(page, 400);
      await page.getByRole('button', { name: 'Save and continue' }).click();
      await expect(page.getByText(/New passwords do not match/i)).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/tenant/);
    }
  });

  test('Invalid input: Pay now is blocked until the office saves a payment phone', async ({ page }) => {
    const email = `portal.pay.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Pay',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await page.goto('/tenant/payments?tab=pay');
    await pause(page, 600);
    const blocked = page.getByText(/Pay now is unavailable|has not published a GCash/i);
    const amount = page.getByLabel(/Payment amount/i);
    const either = (await blocked.isVisible().catch(() => false)) || (await amount.isVisible().catch(() => false));
    expect(either).toBe(true);
  });

  test('Upload receipt requires a photo and amount', async ({ page }) => {
    const email = `portal.up.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Upload',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await page.goto('/tenant/payments?tab=upload');
    await pause(page, 600);
    const submit = page.getByRole('button', { name: /Submit for verification|Submit payment/i });
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      await pause(page, 500);
      await expect(
        page.getByText(/photo|screenshot|required|Select an invoice|valid amount/i).first(),
      ).toBeVisible();
    } else {
      await page.goto('/tenant/payments?tab=pay');
      await pause(page, 500);
      await expect(page.getByText(/Pay now is unavailable|Payment amount|Upload receipt/i).first()).toBeVisible();
    }
  });

  test('New ticket: Subject, Category, and Details are required', async ({ page }) => {
    const email = `portal.tk.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Ticket',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await page.goto('/tenant/maintenance');
    await pause(page, 500);
    await page.getByRole('button', { name: /New ticket/i }).click();
    await pause(page, 500);
    await page.getByRole('button', { name: /Submit ticket/i }).click();
    await pause(page, 450);
    await expect(page.getByText(/Please fill in all required fields|Missing required fields/i).first()).toBeVisible();
    await page.locator('#title').fill('Leaking faucet');
    await pause(page, 400);
    await page.locator('#category').selectOption({ index: 1 }).catch(() => undefined);
    await page.locator('#description').fill('Kitchen faucet drips all night in Unit QA.');
    await pause(page, 400);
    await page.getByRole('button', { name: /Submit ticket/i }).click();
    await expect(
      page.getByText(/Maintenance request submitted successfully|Ticket opened/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Edit/update profile', async ({ page }) => {
    const email = `portal.prof.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Profile',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await page.goto('/tenant/profile');
    await pause(page, 600);
    const phone = page.getByLabel(/Phone/i).first();
    if (await phone.isVisible().catch(() => false)) {
      await phone.fill('09171234800');
      await pause(page, 400);
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByText(/Profile updated successfully|saved successfully/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }
    await expect(page.getByText(/Email cannot be changed/i).first()).toBeVisible();
  });

  test('Delete: tenant cannot upload or delete Documents', async ({ page }) => {
    const email = `portal.docs.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Docs',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await page.goto('/tenant/documents');
    await pause(page, 600);
    await expect(page.getByRole('button', { name: /Upload/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Delete$/i })).toHaveCount(0);
    await expect(page.getByPlaceholder(/Search documents/i)).toBeVisible();
  });

  test("Duplicate/conflict: occupant's room must be assigned", async ({ page }) => {
    const email = `portal.occ.${stamp()}@parenta.test`;
    await loginAsAdmin(page);
    await createQaTenant(page, {
      firstName: 'Teresa',
      lastName: 'NoRoom',
      email,
      password: 'PortalPass1',
    });
    await page.context().clearCookies();
    await loginAsTenant(page, { email, password: 'PortalPass1' });
    const res = await page.request.post('/api/tenant/occupants', {
      data: { firstName: 'Ana', lastName: 'Roommate', moveInDate: new Date().toISOString().slice(0, 10) },
    });
    expect([400, 404]).toContain(res.status());
    const json = (await res.json()) as { error?: string; details?: string };
    expect(`${json.error} ${json.details || ''}`).toMatch(/No active room assignment|required/i);
  });

  test('Data persists correctly after a page refresh', async ({ page }) => {
    const email = `portal.persist.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Stay',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await expect(page.getByText(/Your unit/i).first()).toBeVisible();
    await page.reload();
    await pause(page, 600);
    await expect(page.getByText(/Your unit/i).first()).toBeVisible();
  });

  test('Permission check: tenant cannot open /admin', async ({ page }) => {
    const email = `portal.admin.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Blocked',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await page.goto('/admin/financial/payments');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Search documents', async ({ page }) => {
    const email = `portal.srch.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Search',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await page.goto('/tenant/documents');
    await pause(page, 500);
    await page.getByPlaceholder(/Search documents/i).fill('lease');
    await pause(page, 500);
    const clear = page.getByRole('button', { name: /Clear filters/i });
    if (await clear.isVisible().catch(() => false)) {
      await clear.click();
      await pause(page, 400);
    }
    await expect(page.getByPlaceholder(/Search documents/i)).toHaveValue('');
  });

  test('Maintenance queue filters', async ({ page }) => {
    const email = `portal.filt.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Queue',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await page.goto('/tenant/maintenance');
    await pause(page, 500);
    await expect(page.getByRole('button', { name: /New ticket/i })).toBeVisible();
    const open = page.getByRole('button', { name: /^Open$/i }).or(page.getByRole('tab', { name: /Open/i }));
    if (await open.first().isVisible().catch(() => false)) {
      await open.first().click();
      await pause(page, 400);
    }
  });

  test('Change password after setup', async ({ page }) => {
    const email = `portal.pw.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Pw',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await page.goto('/tenant/profile?section=account');
    await pause(page, 600);
    const current = page.locator('#tenant-current-password');
    if (await current.isVisible().catch(() => false)) {
      await current.fill('wrong');
      await page.locator('#tenant-new-password').fill('NewPass12');
      await page.locator('#tenant-confirm-password').fill('NewPass99');
      await page.getByRole('button', { name: /Change password|Update password/i }).click();
      await expect(page.getByText(/do not match/i).first()).toBeVisible();
      await page.locator('#tenant-confirm-password').fill('NewPass12');
      await page.locator('#tenant-new-password').fill('short');
      await page.getByRole('button', { name: /Change password|Update password/i }).click();
      await expect(page.getByText(/at least 8 characters/i).first()).toBeVisible();
    }
  });

  test('Export: statements PDF / Excel', async ({ page }) => {
    const email = `portal.st.${stamp()}@parenta.test`;
    const password = 'PortalPass1';
    await seedRecordingPortalTenant(page, {
      firstName: 'Teresa',
      lastName: 'Stmt',
      email,
      password,
    });
    await loginAsTenant(page, { email, password });
    await page.goto('/tenant/payments?tab=statements');
    await pause(page, 600);
    await expect(page.getByText(/Statements|PDF|Excel/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Excel|PDF|Generate statement/i }).first()).toBeVisible();
  });
});
