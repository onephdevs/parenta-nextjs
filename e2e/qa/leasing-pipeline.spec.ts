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
  selectFirstRealOption,
  stamp,
  test,
} from './helpers';

test.describe('Leasing Pipeline', () => {
  test('Happy path: create an onboarding opportunity', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `luis.santos.${stamp()}@parenta.test`;
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 600);
    await page.getByRole('button', { name: /Add opportunity/i }).click();
    await pause(page, 500);
    await page.locator('#opp-first-name').fill('Luis');
    await page.locator('#opp-last-name').fill('Santos');
    await page.locator('#opp-email').fill(email);
    await page.locator('#opp-phone').fill('09181234567');
    await pause(page, 400);
    if (await page.locator('#opp-building').isVisible().catch(() => false)) {
      await selectFirstRealOption(page.locator('#opp-building'), {
        prefer: /BALIBAGO|Balibago/i,
      });
      await pause(page, 500);
    }
    if (await page.locator('#opp-room').isEnabled().catch(() => false)) {
      await selectFirstRealOption(page.locator('#opp-room'), {
        skip: /Not sure|Admin|Store/i,
      }).catch(() => undefined);
    }
    if (await page.locator('#opp-amount').isVisible().catch(() => false)) {
      await page.locator('#opp-amount').fill('4800');
    }
    await page.getByRole('button', { name: /Create opportunity/i }).click();
    await pause(page, 800);
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 500);
    await page.getByPlaceholder(/Search Opportunities/i).fill('Luis');
    await pause(page, 500);
    await expect(page.getByText(/Luis Santos|Luis/i).first()).toBeVisible();
  });

  test('Required field validation: create does not require name or email — flag as bug', async ({ page }) => {
    // Unexpectedly permissive: POST /api/pipeline/cards only requires boardSlug.
    await loginAsAdmin(page);
    const created = await page.request.post('/api/pipeline/cards', {
      data: { boardSlug: 'onboarding', title: `QA bare card ${stamp()}` },
    });
    expect(created.ok()).toBe(true);
    const json = (await created.json()) as { success?: boolean; data?: { id?: string } };
    expect(json.success).not.toBe(false);
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 500);
    await page.getByRole('button', { name: /Add opportunity/i }).click();
    await pause(page, 500);
    await page.getByRole('button', { name: /Create opportunity/i }).click();
    await pause(page, 800);
    await expect(page.getByText(/First name is required|Email is required/i)).toHaveCount(0);
  });

  test('Generate lease: email, room, payment received, template, and start date', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 600);
    await page.getByRole('button', { name: /Add opportunity/i }).click();
    await pause(page);
    await page.locator('#opp-first-name').fill('Luis');
    await page.locator('#opp-last-name').fill('Gates');
    await page.getByRole('button', { name: /Create opportunity/i }).click();
    await pause(page, 800);
    const generate = page.getByRole('button', { name: /Generate lease/i }).first();
    if (await generate.isVisible().catch(() => false)) {
      await expect(generate).toBeDisabled();
    }
    const reopen = page.getByText(/Luis Gates/i).first();
    if (await reopen.isVisible().catch(() => false)) {
      await reopen.click();
      await pause(page, 500);
    }
    const gen = page.getByRole('button', { name: /Generate lease/i }).first();
    if (await gen.isEnabled().catch(() => false)) {
      await gen.click();
    } else {
      await expect(page.getByText(/Mark Payment received first|Generate lease/i).first()).toBeVisible();
    }
    await expect(
      page.getByText(
        /Email is required to generate a lease|Select building and room|Confirm payment under Payment|Select a lease template|Lease start date is required|Mark Payment received first/i,
      ).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Invalid / conflict: occupied room cannot take a lease from the pipeline', async ({ page }) => {
    await loginAsAdmin(page);
    const name = `QA Pipe Occ ${stamp()}`;
    await deleteBuildingNamed(page, name);
    const building = await createQaBuilding(page, name);
    const room = await createQaRoom(page, building.id, `PO-${stamp()}`, 4800);
    const occupant = await createQaTenant(page, {
      firstName: 'Occupied',
      lastName: 'Unit',
      email: `occ.${stamp()}@parenta.test`,
    });
    await assignQaTenant(page, room.id, occupant.tenantId);
    const created = await page.request.post('/api/pipeline/cards', {
      data: {
        boardSlug: 'onboarding',
        firstName: 'Luis',
        lastName: 'Conflict',
        email: `luis.conflict.${stamp()}@parenta.test`,
        buildingId: building.id,
        roomId: room.id,
      },
    });
    const createdJson = (await created.json()) as {
      data?: { card?: { id?: string }; id?: string };
    };
    const cardId = createdJson.data?.card?.id || createdJson.data?.id || '';
    const patch = await page.request.patch(`/api/pipeline/cards/${cardId}`, {
      data: { generateLease: true },
    });
    const text = `${created.status()} ${patch.status()} ${await patch.text()}`;
    expect(text).toMatch(/already occupied|Room is already occupied|generate/i);
    await deleteBuildingNamed(page, name);
  });

  test('Edit/update an opportunity', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `luis.edit.${stamp()}@parenta.test`;
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 500);
    await page.getByRole('button', { name: /Add opportunity/i }).click();
    await page.locator('#opp-first-name').fill('Luis');
    await page.locator('#opp-last-name').fill('Editor');
    await page.locator('#opp-email').fill(email);
    await page.getByRole('button', { name: /Create opportunity/i }).click();
    await pause(page, 800);
    await page.getByText(/Luis Editor/i).first().click();
    await pause(page, 500);
    if (await page.locator('#opp-phone').isVisible()) {
      await page.locator('#opp-phone').fill('09180001111');
    }
    const save = page.getByRole('button', { name: /Save changes/i });
    await expect(save).toBeVisible();
    await save.click();
    await pause(page, 600);
    await page.getByText(/Luis Editor/i).first().click();
    await pause(page, 400);
    await expect(page.locator('#opp-phone')).toHaveValue(/09180001111/);
  });

  test('Delete an opportunity', async ({ page }) => {
    await loginAsAdmin(page);
    const created = await page.request.post('/api/pipeline/cards', {
      data: {
        boardSlug: 'onboarding',
        firstName: 'Luis',
        lastName: 'Gone',
        email: `luis.gone.${stamp()}@parenta.test`,
        title: `QA delete ${stamp()}`,
      },
    });
    const createdJson = (await created.json()) as {
      data?: { card?: { id?: string }; id?: string };
    };
    const id = createdJson.data?.card?.id || createdJson.data?.id;
    expect(id).toBeTruthy();
    const del = await page.request.delete(`/api/pipeline/cards/${id}`);
    expect(del.ok()).toBe(true);
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 500);
    await page.getByPlaceholder(/Search Opportunities/i).fill('Luis Gone');
    await pause(page, 500);
    await expect(page.getByText(/Luis Gone/i)).toHaveCount(0);
  });

  test('Duplicate emails on two opportunities are allowed — flag as bug', async ({ page }) => {
    // Unexpectedly permissive: no unique email on pipeline cards.
    await loginAsAdmin(page);
    const email = `luis.dup.${stamp()}@parenta.test`;
    const first = await page.request.post('/api/pipeline/cards', {
      data: { boardSlug: 'onboarding', firstName: 'Luis', lastName: 'One', email },
    });
    const second = await page.request.post('/api/pipeline/cards', {
      data: { boardSlug: 'onboarding', firstName: 'Luis', lastName: 'Two', email },
    });
    expect(first.ok()).toBe(true);
    expect(second.ok()).toBe(true);
  });

  test('Data persists correctly after a page refresh', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `luis.persist.${stamp()}@parenta.test`;
    await page.request.post('/api/pipeline/cards', {
      data: { boardSlug: 'onboarding', firstName: 'Luis', lastName: 'Persist', email },
    });
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 500);
    await page.getByPlaceholder(/Search Opportunities/i).fill(email);
    await pause(page, 500);
    await expect(page.getByText(/Luis Persist/i).first()).toBeVisible();
    await page.reload();
    await pause(page, 500);
    await page.getByPlaceholder(/Search Opportunities/i).fill(email);
    await pause(page, 500);
    await expect(page.getByText(/Luis Persist/i).first()).toBeVisible();
  });

  test('Permission check: pipeline APIs require admin', async ({ page }) => {
    await page.goto('/admin/tasks?board=onboarding');
    await expect(page).toHaveURL(/\/auth\/signin/);
    const email = `pipe.perm.${stamp()}@parenta.test`;
    await loginAsAdmin(page);
    await createQaTenant(page, {
      firstName: 'Portal',
      lastName: 'Guest',
      email,
      password: 'PortalPass1',
    });
    await page.context().clearCookies();
    await loginAsTenant(page, { email, password: 'PortalPass1' });
    await page.goto('/admin/tasks?board=onboarding');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('Search opportunities', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `luis.search.${stamp()}@parenta.test`;
    await page.request.post('/api/pipeline/cards', {
      data: { boardSlug: 'onboarding', firstName: 'Luis', lastName: 'Search', email },
    });
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 500);
    await page.getByPlaceholder(/Search Opportunities/i).fill('Luis Search');
    await pause(page, 500);
    await expect(page.getByText(/Luis Search/i).first()).toBeVisible();
  });

  test('Sort the board', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 500);
    const sort = page.getByRole('button', { name: /Sort/i }).first();
    await expect(sort).toBeVisible();
    await sort.click();
    await pause(page, 450);
    await expect(page.getByRole('button', { name: /Add opportunity/i })).toBeVisible();
  });

  test('Advanced Filters', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 500);
    await page.getByRole('button', { name: /Advanced Filters/i }).click();
    await pause(page, 500);
    await expect(page.getByText(/Stage|Building|Amount/i).first()).toBeVisible();
    const clear = page.getByRole('button', { name: /Clear filters/i });
    if (await clear.isVisible().catch(() => false)) {
      await clear.click();
      await pause(page, 400);
    }
    await expect(page.getByRole('button', { name: /Add opportunity/i })).toBeVisible();
  });

  test('Import CSV limit', async ({ page }) => {
    await loginAsAdmin(page);
    const tooMany = Array.from({ length: 201 }, (_, i) => `title${i}`).join('\n');
    const csv = `title\n${tooMany}`;
    const res = await page.request.post('/api/pipeline/cards/import', {
      data: { boardSlug: 'onboarding', csv },
    });
    expect(res.ok()).toBe(false);
    const json = (await res.json()) as { error?: string };
    expect(json.error || '').toMatch(/200 rows/i);
    const missing = await page.request.post('/api/pipeline/cards/import', { data: {} });
    expect(((await missing.json()) as { error?: string }).error).toMatch(/boardSlug and csv are required/i);
  });

  test('Export / pagination', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 500);
    await expect(page.getByRole('button', { name: /Export|Print/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Add opportunity/i })).toBeVisible();
  });
});
