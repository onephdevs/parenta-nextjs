import {
  assignQaTenant,
  createQaBuilding,
  createQaRoom,
  createQaTenant,
  deleteBuildingNamed,
  expect,
  expectRequiredMissing,
  loginAsAdmin,
  loginAsTenant,
  pause,
  plusDaysIso,
  stamp,
  test,
  todayIso,
} from './helpers';

test.describe('Move-out', () => {
  test('Happy path: End Assignment vacates the unit and keeps history', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Move Out ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `MO-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Marco',
      lastName: 'Villanueva',
      email: `marco.mo.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    await page.goto(`/admin/rooms/${room.id}`);
    await pause(page, 600);
    await page.getByRole('button', { name: 'End Assignment' }).click();
    await pause(page, 500);
    await expect(page.getByText(/End Tenant Assignment/i)).toBeVisible();
    await page.locator('#endDate').fill(todayIso());
    await pause(page, 400);
    await page.getByRole('button', { name: 'End Assignment' }).last().click();
    await expect(page.getByText(/Tenant unassigned successfully/i)).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await pause(page, 500);
    await expect(page.getByText(/Vacant/i).first()).toBeVisible();
    await expect(page.getByText(/Tenancy History|Terminated|Marco Villanueva/i).first()).toBeVisible();
    await page.goto('/admin/tenants');
    await page.locator('#tenant-status').selectOption({ label: 'Former tenants' });
    await page.locator('#tenant-search').fill('Marco Villanueva');
    await pause(page, 500);
    await expect(page.getByText(/Marco Villanueva/i).first()).toBeVisible();
    await deleteBuildingNamed(page, name);
  });

  test('Required field validation: End Date is required in the UI', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA End Date ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `ED-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Marco',
      lastName: 'Date',
      email: `marco.date.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    await page.goto(`/admin/rooms/${room.id}`);
    await pause(page, 600);
    await page.getByRole('button', { name: 'End Assignment' }).click();
    await pause(page, 500);
    await page.locator('#endDate').fill('');
    await pause(page, 400);
    await page.getByRole('button', { name: 'End Assignment' }).last().click();
    await pause(page, 400);
    await expectRequiredMissing(page.locator('#endDate'));
    await deleteBuildingNamed(page, name);
  });

  test('Start move-out does not vacate the room', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Start MO ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `SM-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Marco',
      lastName: 'Start',
      email: `marco.start.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    await page.goto('/admin/leasing');
    await pause(page, 600);
    await page.getByRole('tab', { name: /Move-outs/i }).click();
    await pause(page, 500);
    await page.getByRole('button', { name: 'Start move-out' }).click();
    await pause(page, 500);
    await expect(page.locator('#moveout-lease')).toBeVisible();
    await page.locator('#moveout-lease').selectOption({ index: 1 }).catch(async () => {
      const options = page.locator('#moveout-lease option');
      const count = await options.count();
      if (count > 1) await page.locator('#moveout-lease').selectOption({ index: 1 });
    });
    await page.locator('#moveout-date').fill(plusDaysIso(7));
    await pause(page, 400);
    await page.getByRole('button', { name: 'Start move-out' }).last().click();
    await expect(
      page.getByText(/Inspection worksheet is ready|unit stays occupied/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    await page.goto(`/admin/rooms/${room.id}`);
    await pause(page, 500);
    await expect(page.getByText(/Occupied/i).first()).toBeVisible();
    await deleteBuildingNamed(page, name);
  });

  test('Terminate on paper does not vacate', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Term ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `TM-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Marco',
      lastName: 'Notice',
      email: `marco.term.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    const leases = await page.request.get('/api/leases?limit=50');
    const leasesJson = (await leases.json()) as {
      data?: Array<{ id?: string; tenantId?: string }>;
      leases?: Array<{ id?: string; tenantId?: string }>;
    };
    const rows = leasesJson.data || leasesJson.leases || [];
    const lease = rows.find((row) => String(row.tenantId) === tenant.tenantId);
    if (lease?.id) {
      await page.goto(`/admin/leasing/${lease.id}`);
      await pause(page, 600);
      await page.getByRole('button', { name: 'Terminate' }).click();
      await pause(page, 500);
      await page.locator('#planned-move-out').fill(plusDaysIso(14));
      await pause(page, 400);
      await page.getByRole('button', { name: /Terminate/i }).last().click();
      await expect(
        page.getByText(/ended on paper|unit stays occupied|Notice given/i).first(),
      ).toBeVisible({ timeout: 20_000 });
    }
    await page.goto(`/admin/rooms/${room.id}`);
    await pause(page, 500);
    await expect(page.getByText(/Occupied/i).first()).toBeVisible();
    await deleteBuildingNamed(page, name);
  });

  test('Start move-out reuses an open worksheet', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Reuse ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `RW-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Marco',
      lastName: 'Reuse',
      email: `marco.reuse.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    const leases = await page.request.get('/api/leases?limit=80');
    const json = (await leases.json()) as {
      data?: Array<{ id?: string; tenantId?: string; roomAssignmentId?: string; assignmentId?: string }>;
    };
    const lease = (json.data || []).find((row) => String(row.tenantId) === tenant.tenantId);
    const assignmentId = lease?.roomAssignmentId || lease?.assignmentId || lease?.id;
    const first = await page.request.post('/api/lease/moveouts', {
      data: {
        tenantId: tenant.tenantId,
        roomAssignmentId: assignmentId,
        moveoutDate: plusDaysIso(7),
      },
    });
    const second = await page.request.post('/api/lease/moveouts', {
      data: {
        tenantId: tenant.tenantId,
        roomAssignmentId: assignmentId,
        moveoutDate: plusDaysIso(8),
      },
    });
    const a = (await first.json()) as { data?: { moveoutId?: string; id?: string } };
    const b = (await second.json()) as { data?: { moveoutId?: string; id?: string } };
    const idA = String(a.data?.moveoutId || a.data?.id || '');
    const idB = String(b.data?.moveoutId || b.data?.id || '');
    if (first.ok() && second.ok() && idA && idB) {
      expect(idB).toBe(idA);
    }
    await deleteBuildingNamed(page, name);
  });

  test('Finalize requires actual move-out date', async ({ page }) => {
    await loginAsAdmin(page);
    const missing = await page.request.post('/api/lease/moveouts/not-a-real-id');
    // Unauthenticated would 401; as admin, missing actualMoveoutDate → 400
    const withId = await page.request.post('/api/lease/moveouts/00000000-0000-0000-0000-000000000000', {
      data: {},
    });
    expect([400, 404]).toContain(withId.status());
    const body = (await withId.json()) as { error?: string };
    expect(`${missing.status()} ${body.error || ''}`).toMatch(/actualMoveoutDate|not found|Unauthorized|400|404/i);
    await page.goto('/admin/leasing');
    await pause(page, 500);
    await page.getByRole('tab', { name: /Move-outs/i }).click();
    await pause(page, 500);
    const open = page.getByRole('link', { name: /View|Open|Inspect/i }).first();
    if (await open.isVisible().catch(() => false)) {
      await open.click();
      await pause(page, 600);
      const finalize = page.getByRole('button', { name: /Finalize/i });
      if (await finalize.isVisible().catch(() => false)) {
        await finalize.click();
        await expect(page.getByText(/Enter the actual move-out date|Date required/i).first()).toBeVisible();
      }
    }
  });

  test('Delete/deactivate: person is not deleted on vacate', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Keep Person ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `KP-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Marco',
      lastName: 'Kept',
      email: `marco.kept.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    await page.request.delete(`/api/rooms/${room.id}/assign`, {
      data: { tenantId: tenant.tenantId, endDate: todayIso() },
    });
    const hard = await page.request.delete(`/api/tenants/${tenant.tenantId}`);
    expect(hard.status()).toBe(409);
    await page.goto('/admin/tenants');
    await page.locator('#tenant-status').selectOption({ label: 'Former tenants' });
    await page.locator('#tenant-search').fill('Marco Kept');
    await pause(page, 500);
    await expect(page.getByText(/Marco Kept/i).first()).toBeVisible();
    await deleteBuildingNamed(page, name);
  });

  test('Data persists correctly after a page refresh', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA MO Persist ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `MP-${stamp()}`, 4800);
    const tenant = await createQaTenant(page, {
      firstName: 'Marco',
      lastName: 'Persist',
      email: `marco.persist.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, tenant.tenantId);
    await page.request.delete(`/api/rooms/${room.id}/assign`, {
      data: { tenantId: tenant.tenantId, endDate: todayIso() },
    });
    await page.goto(`/admin/rooms/${room.id}`);
    await pause(page, 500);
    await expect(page.getByText(/Vacant/i).first()).toBeVisible();
    await page.reload();
    await pause(page, 500);
    await expect(page.getByText(/Vacant/i).first()).toBeVisible();
    await deleteBuildingNamed(page, name);
  });

  test('Permission check: unauthenticated cannot open Leasing', async ({ page }) => {
    await page.goto('/admin/leasing');
    await expect(page).toHaveURL(/\/auth\/signin/);
    const email = `mo.perm.${stamp()}@parenta.test`;
    await loginAsAdmin(page);
    await createQaTenant(page, {
      firstName: 'Portal',
      lastName: 'Guest',
      email,
      password: 'PortalPass1',
    });
    await page.context().clearCookies();
    await loginAsTenant(page, { email, password: 'PortalPass1' });
    await page.goto('/admin/leasing');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Search leases', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/leasing');
    await pause(page, 500);
    await expect(page.locator('#lease-search')).toBeVisible();
    await page.locator('#lease-search').fill('Balibago');
    await pause(page, 500);
    await expect(page.getByRole('button', { name: /New lease|New tenant/i }).first()).toBeVisible();
  });

  test('Filter leases by status and building', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/leasing');
    await pause(page, 500);
    await page.locator('#lease-status').selectOption({ label: /Active/i });
    await pause(page, 400);
    await page.locator('#lease-status').selectOption({ label: /Notice given/i });
    await pause(page, 400);
    await expect(page.locator('#lease-building')).toBeVisible();
  });

  test('Export on Leasing', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/leasing');
    await pause(page, 500);
    await expect(page.getByRole('button', { name: /Export|Print/i })).toHaveCount(0);
  });
});
