import {
  ensureVacantRecordingRoom,
  expect,
  loginAsAdmin,
  pause,
  plusDaysIso,
  saveJobVideo,
  selectFirstRealOption,
  test,
  todayIso,
} from './helpers';

const FIRST = 'Liza';
const LAST = 'Navarro';
const EMAIL = `liza.navarro.${Date.now()}@parenta.test`;

test('move-out training recording', async ({ page }, testInfo) => {
  test.setTimeout(12 * 60 * 1000);

  try {
    // --- Login: office admin ---
    await loginAsAdmin(page);
    const vacantRoom = await ensureVacantRecordingRoom(page);
    const created = await page.request.post('/api/tenants', {
      data: {
        firstName: FIRST,
        lastName: LAST,
        email: EMAIL,
        buildingId: vacantRoom.buildingId,
        roomId: vacantRoom.roomId,
        monthlyRent: 4800,
        leaseStartDate: todayIso(),
        moveInDate: todayIso(),
        createUserAccount: true,
      },
    });
    if (!created.ok()) {
      throw new Error(`Failed to create throwaway tenant: ${created.status()} ${await created.text()}`);
    }
    const createdJson = (await created.json()) as { data?: { tenantId?: string; id?: string } };
    const tenantId = String(createdJson.data?.tenantId || createdJson.data?.id || '');
    if (!tenantId) {
      throw new Error('Throwaway tenant was created without an id');
    }
    const templatesRes = await page.request.get('/api/lease-package-templates');
    const templatesJson = (await templatesRes.json()) as {
      data?: Array<{ id: string; depositMonths?: number | null; advanceMonths?: number }>;
    };
    const templates = templatesJson.data || [];
    const template =
      templates.find((row) => row.depositMonths == null || row.depositMonths === 0) ||
      templates[0];
    if (!template?.id) {
      throw new Error('No lease template available to occupy the recording room');
    }
    const monthlyRate = 4800;
    const assigned = await page.request.post(`/api/rooms/${vacantRoom.roomId}/assign`, {
      data: {
        tenantId,
        startDate: todayIso(),
        monthlyRate,
        leasePackageTemplateId: template.id,
        depositPaid:
          template.depositMonths == null ? 0 : monthlyRate * Number(template.depositMonths),
        advanceAmount: monthlyRate * Number(template.advanceMonths ?? 0),
      },
    });
    if (!assigned.ok()) {
      throw new Error(`Failed to assign throwaway tenant: ${assigned.status()} ${await assigned.text()}`);
    }

    // --- Main flow: Leasing → Move-outs → Start move-out ---
    await page.goto('/admin/leasing');
    await pause(page, 600);
    await page.getByRole('button', { name: 'Move-outs' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Start move-out' }).first().click();
    await pause(page);
    const occupiedLease = page.locator('#moveout-lease');
    const leaseLabel = await selectFirstRealOption(occupiedLease, {
      prefer: new RegExp(LAST, 'i'),
    });
    await pause(page);
    if (!new RegExp(LAST, 'i').test(leaseLabel)) {
      await page.getByRole('button', { name: 'Cancel' }).click();
      await pause(page);
    } else {
      await page.locator('#moveout-date').fill(plusDaysIso(3));
      await pause(page);
      await page.getByRole('button', { name: 'Start move-out' }).last().click();
      await expect(page.getByText(/Move-out started|Inspection worksheet/i).first()).toBeVisible({
        timeout: 15_000,
      });
      await pause(page, 600);
    }

    // Worksheet does not vacate — show fields, then vacate via End Assignment
    const worksheetLink = page.getByRole('link', { name: /inspection|move-out/i }).first();
    if (await worksheetLink.isVisible().catch(() => false)) {
      await worksheetLink.click();
      await pause(page, 600);
    } else if (page.url().includes('/moveouts/')) {
      await pause(page);
    }
    if (page.url().includes('/moveouts/')) {
      await expect(page.getByText(/Held funds|Actual move-out date/i).first()).toBeVisible();
      await page.getByLabel('Inspection notes').fill('Walkthrough for recording').catch(() => {});
      await pause(page);
    }

    // --- Watch out for: Terminate is notice only — open and cancel ---
    await page.goto('/admin/leasing');
    await pause(page);
    await page.getByRole('button', { name: 'All leases' }).click();
    await pause(page);
    const leaseSearch = page.getByPlaceholder('Tenant, unit...');
    if (await leaseSearch.isVisible().catch(() => false)) {
      await leaseSearch.fill(LAST);
      await pause(page, 800);
    }
    const leaseHit = page.getByText(LAST).first();
    if (await leaseHit.isVisible().catch(() => false)) {
      await leaseHit.click();
      await pause(page, 600);
      const terminate = page.getByRole('button', { name: 'Terminate' });
      if (await terminate.isVisible().catch(() => false)) {
        await terminate.click();
        await pause(page);
        await expect(page.getByText(/does not empty the unit/i)).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await pause(page);
      }
    }

    // --- Main flow: End Assignment (this vacates) ---
    await page.goto(`/admin/rooms/${vacantRoom.roomId}`);
    await pause(page, 800);

    await page.getByRole('button', { name: 'End Assignment' }).click();
    await pause(page);

    // --- Watch out for: End Date is required ---
    const endDate = page.locator('#endDate');
    await endDate.fill('');
    await pause(page);
    await page.getByRole('button', { name: 'End Assignment' }).last().click();
    await pause(page, 400);

    await endDate.fill(todayIso());
    await page.locator('#unassignNotes').fill('Move-out recording — unit returned vacant');
    await pause(page);
    await page.getByRole('button', { name: 'End Assignment' }).last().click();
    await expect(page.getByText(/Tenant unassigned successfully/i)).toBeVisible({ timeout: 20_000 });
    await pause(page, 600);

    // --- Done when: room vacant, person still in history ---
    await page.reload();
    await pause(page, 600);
    await expect(page.getByText(/No tenant|Assign Tenant|Vacant/i).first()).toBeVisible();
    await expect(page.getByText(/Tenancy History/i)).toBeVisible();

    await page.goto('/admin/tenants');
    await pause(page);
    await page.locator('#tenant-status').selectOption({ label: 'Former tenants' }).catch(async () => {
      await page.getByLabel(/^Status/i).first().selectOption({ label: 'Former tenants' });
    });
    await pause(page);
    await page.locator('#tenant-search').fill(LAST);
    await pause(page, 600);
    await expect(page.getByText(LAST).first()).toBeVisible();

    // --- Also on this page: leasing tabs ---
    await page.goto('/admin/leasing');
    await pause(page);
    await page.getByRole('button', { name: 'Expiration alerts' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Generate Alerts' }).click().catch(() => {});
    await pause(page);
    await page.getByRole('button', { name: 'Renewals' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'All leases' }).click();
    await pause(page);
    await page.getByLabel('Status').selectOption({ label: 'Notice given' }).catch(() => {});
    await pause(page);
    await page.getByLabel('Status').selectOption({ label: 'All Status' }).catch(() => {});
    await pause(page);

    // Finalize skipped if End Assignment already vacated the unit.
  } finally {
    await saveJobVideo(page, testInfo, 'move-out');
  }
});
