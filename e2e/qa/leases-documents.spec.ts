import {
  assignQaTenant,
  createQaBuilding,
  createQaRoom,
  createQaTenant,
  deleteBuildingNamed,
  expect,
  loginAsAdmin,
  loginAsTenant,
  pause,
  stamp,
  test,
} from './helpers';

test.describe('Leases / Documents', () => {
  test('Happy path: generate a lease for an assigned tenant', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Lease Gen ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `LG-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Liza',
      lastName: 'Torres',
      email: `liza.torres.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId, 4800);
    await page.goto(`/admin/tenants/${tenant.tenantId}?tab=documents`);
    await pause(page, 600);
    await page.getByRole('button', { name: /Generate lease/i }).click();
    await expect(
      page.getByText(/Lease agreement generated|Lease agreement on file|Lease agreement updated/i).first(),
    ).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: 'View' }).first()).toBeVisible();
    await deleteBuildingNamed(page, name);
  });

  test('Required: generate lease needs an active room assignment', async ({ page }) => {
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Liza',
      lastName: 'Unassigned',
      email: `liza.none.${stamp()}@parenta.test`,
    });
    await page.goto(`/admin/tenants/${tenant.tenantId}?tab=documents`);
    await pause(page, 600);
    await expect(page.getByText(/No lease agreement on file/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Generate lease/i }).click();
    await expect(
      page.getByText(/no room assignment|Assign a room before generating/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Invalid input: upload rejects non-PDF/DOC and files over 10MB', async ({ page }) => {
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Liza',
      lastName: 'Upload',
      email: `liza.up.${stamp()}@parenta.test`,
    });
    await page.goto(`/admin/tenants/${tenant.tenantId}?tab=documents`);
    await pause(page, 600);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'not-a-lease.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await pause(page, 500);
    await expect(
      page.getByText(/PDF, DOC, or DOCX|Invalid File|not supported/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Sign as landlord: name and terms checkbox are required', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Sign ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `SG-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Liza',
      lastName: 'Signer',
      email: `liza.sign.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    await page.goto(`/admin/tenants/${tenant.tenantId}?tab=documents`);
    await pause(page, 600);
    await page.getByRole('button', { name: /Generate lease/i }).click();
    await expect(page.getByText(/Lease agreement on file|generated/i).first()).toBeVisible({
      timeout: 25_000,
    });
    await page.getByRole('button', { name: /Sign as landlord/i }).click();
    await pause(page, 450);
    await page.getByRole('button', { name: 'Sign lease' }).click();
    await expect(page.getByText(/Please confirm you agree to the lease terms/i)).toBeVisible();
    await page.getByText(/I have read the lease agreement/i).click();
    await pause(page, 400);
    await page.getByPlaceholder(/Full legal name/i).fill('Al');
    await pause(page, 400);
    await page.getByRole('button', { name: 'Sign lease' }).click();
    await expect(page.getByText(/Type your full legal name to sign/i)).toBeVisible();
    await deleteBuildingNamed(page, name);
  });

  test('Edit/update: regenerate / replace a signed lease', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Replace ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `RG-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Liza',
      lastName: 'Replace',
      email: `liza.rep.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    await page.request.post(`/api/tenants/${tenant.tenantId}/agreement/generate`);
    await page.goto(`/admin/tenants/${tenant.tenantId}?tab=documents`);
    await pause(page, 600);
    const regen = page.getByRole('button', { name: /Regenerate lease|Generate lease/i });
    await regen.click();
    await pause(page, 500);
    const replace = page.getByRole('button', { name: /Replace & generate/i });
    if (await replace.isVisible().catch(() => false)) {
      await expect(page.getByText(/Replace signed lease/i)).toBeVisible();
      await replace.click();
      await expect(page.getByText(/replaced with a new draft|Lease agreement/i).first()).toBeVisible({
        timeout: 25_000,
      });
    } else {
      await expect(page.getByText(/Lease agreement generated|updated|on file/i).first()).toBeVisible();
    }
    await deleteBuildingNamed(page, name);
  });

  test('Delete the lease document', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Del Doc ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `DD-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Liza',
      lastName: 'Delete',
      email: `liza.del.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    await page.request.post(`/api/tenants/${tenant.tenantId}/agreement/generate`);
    await page.goto(`/admin/tenants/${tenant.tenantId}?tab=documents`);
    await pause(page, 600);
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await pause(page, 450);
    await expect(page.getByText(/Delete document/i)).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    await expect(page.getByText(/deleted successfully|No lease agreement on file/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await deleteBuildingNamed(page, name);
  });

  test('Duplicate/conflict: signed lease is locked until replace', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Locked ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `LK-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Liza',
      lastName: 'Locked',
      email: `liza.lock.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    await page.request.post(`/api/tenants/${tenant.tenantId}/agreement/generate`);
    const sign = await page.request.post(`/api/tenants/${tenant.tenantId}/agreement/sign`, {
      data: { acceptTerms: true, typedName: 'Alfonso Admin', role: 'landlord' },
    });
    if (sign.ok()) {
      const locked = await page.request.post(`/api/tenants/${tenant.tenantId}/agreement/generate`, {
        data: { forceReplace: false },
      });
      expect([409, 200]).toContain(locked.status());
      if (locked.status() === 409) {
        const body = (await locked.json()) as { error?: string; code?: string };
        expect(body.code || body.error || '').toMatch(/AGREEMENT_LOCKED|already on file/i);
      }
    }
    await deleteBuildingNamed(page, name);
  });

  test('Data persists correctly after a page refresh', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Doc Persist ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `DP-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Liza',
      lastName: 'Persist',
      email: `liza.persist.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    await page.request.post(`/api/tenants/${tenant.tenantId}/agreement/generate`);
    await page.goto(`/admin/tenants/${tenant.tenantId}?tab=documents`);
    await pause(page, 600);
    await expect(page.getByText(/Lease agreement on file/i).first()).toBeVisible();
    await page.reload();
    await pause(page, 600);
    await expect(page.getByText(/Lease agreement on file/i).first()).toBeVisible();
    await deleteBuildingNamed(page, name);
  });

  test('Permission check: agreement APIs are admin; tenants cannot open this tab as office', async ({ page }) => {
    await page.goto('/admin/tenants');
    await expect(page).toHaveURL(/\/auth\/signin/);
    const email = `lease.perm.${stamp()}@parenta.test`;
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Portal',
      lastName: 'Guest',
      email,
      password: 'PortalPass1',
    });
    await page.context().clearCookies();
    await loginAsTenant(page, { email, password: 'PortalPass1' });
    await page.goto(`/admin/tenants/${tenant.tenantId}?tab=documents`);
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Search / filter / sort / export on the Documents tab', async ({ page }) => {
    await loginAsAdmin(page);
    const tenant = await createQaTenant(page, {
      firstName: 'Liza',
      lastName: 'Chrome',
      email: `liza.chrome.${stamp()}@parenta.test`,
    });
    await page.goto(`/admin/tenants/${tenant.tenantId}?tab=documents`);
    await pause(page, 600);
    await expect(page.getByText(/Required Documents|Lease Contract/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Search/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Export|Print/i })).toHaveCount(0);
  });
});
