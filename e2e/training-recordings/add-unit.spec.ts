import {
  clickNamed,
  deleteBuildingNamed,
  expect,
  fillLabeled,
  labeled,
  loginAsAdmin,
  maybeClickFilters,
  pause,
  saveJobVideo,
  selectFirstRealOption,
  test,
} from './helpers';

const BUILDING_NAME = 'Recording Annex Balibago';
const ROOM_NUMBER = 'RA-1';
const MONTHLY_RATE = '4800';

test('add-unit training recording', async ({ page }, testInfo) => {
  test.setTimeout(12 * 60 * 1000);

  try {
    // --- Login: office admin ---
    await loginAsAdmin(page);
    await deleteBuildingNamed(page, BUILDING_NAME);

    // --- Watch out for: Create building needs Building name, Region, and City ---
    await page.goto('/admin/properties');
    await pause(page, 600);
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Create building' })).toBeVisible();
    await pause(page);
    await page.locator('#add-building-form #name').fill(BUILDING_NAME);
    await page.getByRole('button', { name: 'Create building' }).click();
    await pause(page, 600);
    await expect(page.getByText(/Missing required fields|Name, city, and region|Failed to create building/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await pause(page);

    // --- Main flow: add a building and rooms ---
    const regionsLoaded = page.waitForResponse(
      (response) => response.url().includes('/api/addresses/regions') && response.ok(),
      { timeout: 20_000 },
    );
    await page.getByRole('button', { name: 'Location', exact: true }).click();
    await regionsLoaded;
    await pause(page);
    await expect(labeled(page, 'Region')).toBeVisible();
    await selectFirstRealOption(labeled(page, 'Region'), {
      prefer: /Central Luzon|Pampanga|III/i,
    });
    await pause(page, 600);
    await selectFirstRealOption(labeled(page, 'City'));
    await pause(page);

    await page.getByRole('button', { name: 'Deposits & advance' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Months of rent' }).first().click();
    await pause(page, 400);
    const months = page.getByLabel('Months of rent').first();
    if (await months.isVisible().catch(() => false)) {
      await months.fill('2');
      await pause(page, 400);
    }
    const minFloor = page.getByLabel('Minimum deposit floor');
    if (await minFloor.isVisible().catch(() => false)) {
      await minFloor.fill('4800');
      await pause(page, 400);
    }
    const utilityDeposit = page.getByLabel('Utility deposit amount');
    if (await utilityDeposit.isVisible().catch(() => false)) {
      await utilityDeposit.fill('3000');
      await pause(page, 400);
    }

    await page.getByRole('button', { name: 'Create building' }).click();
    await expect(page.getByText(/Building created successfully/i)).toBeVisible({ timeout: 20_000 });
    await pause(page, 600);

    await page.getByRole('button', { name: new RegExp(`^${BUILDING_NAME}`) }).first().click();
    await pause(page, 600);
    await page.getByRole('tab', { name: 'Rooms' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Add Room' }).filter({ hasText: 'Add Room' }).first().click();
    const addRoom = page.getByRole('dialog');
    await expect(addRoom.getByRole('button', { name: 'Create room' })).toBeVisible();
    await pause(page);
    await addRoom.locator('#roomNumber').fill(ROOM_NUMBER);
    await pause(page, 400);
    await addRoom.getByRole('button', { name: 'Details', exact: true }).click();
    await pause(page);
    await selectFirstRealOption(addRoom.locator('#roomType'), { prefer: /^Studio$/i });
    await pause(page);
    await addRoom.getByRole('button', { name: 'Financial', exact: true }).click();
    await pause(page);
    await addRoom.locator('#monthlyRate').fill(MONTHLY_RATE);
    await pause(page, 400);
    await addRoom.getByRole('button', { name: 'Create room' }).click();
    await expect(page.getByText(/room created|created successfully/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await pause(page, 600);

    // --- Main flow: Edit property / Edit Room ---
    await page.getByRole('button', { name: 'Property options' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Edit property', exact: true }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Deposits & advance' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Update building' }).click();
    await expect(page.getByText(/Building updated successfully/i)).toBeVisible({ timeout: 15_000 });
    await pause(page);

    await page.getByRole('tab', { name: 'Rooms' }).click().catch(async () => {
      await page.getByRole('button', { name: 'Rooms' }).click();
    });
    await pause(page);
    await page.getByRole('button', { name: 'View' }).filter({ hasText: 'View' }).first().click();
    await expect(page.getByRole('heading', { name: `Unit ${ROOM_NUMBER}` })).toBeVisible({
      timeout: 20_000,
    });
    await pause(page, 600);
    await page.getByRole('button', { name: 'Close modal' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Property options' }).click();
    await pause(page);
    await page.getByRole('link', { name: 'Manage rooms' }).click();
    await expect(page.getByRole('link', { name: 'View' })).toBeVisible({ timeout: 20_000 });
    await pause(page);
    await page.getByRole('link', { name: 'View' }).click();
    await expect(page.getByRole('button', { name: 'Edit Room' })).toBeVisible({ timeout: 20_000 });
    await pause(page);
    await clickNamed(page, 'Edit Room');
    await pause(page);
    const editRoom = page.getByRole('dialog');
    await editRoom.getByRole('button', { name: 'Pricing', exact: true }).click();
    await pause(page);
    await editRoom.locator('#monthlyRate').fill(MONTHLY_RATE);
    await pause(page, 400);
    await editRoom.getByRole('button', { name: 'Deposit', exact: true }).click();
    await pause(page);
    const deposit = editRoom.locator('#depositAmount');
    if (await deposit.isVisible().catch(() => false)) {
      await deposit.fill('9600');
      await pause(page, 400);
    }
    await clickNamed(page, 'Save Changes');
    await pause(page, 600);

    // --- Done when: persists after refresh ---
    await page.goto('/admin/properties');
    await pause(page, 600);
    await page.getByLabel('Search properties').fill(BUILDING_NAME);
    await pause(page, 600);
    await expect(page.getByRole('button', { name: new RegExp(`^${BUILDING_NAME}`) }).first()).toBeVisible();
    await page.getByRole('button', { name: new RegExp(`^${BUILDING_NAME}`) }).first().click();
    await pause(page);
    await expect(page.getByText(ROOM_NUMBER).first()).toBeVisible();

    // --- Also on this page: search by property name ---
    await page.getByLabel('Search properties').fill('Balibago');
    await pause(page, 600);
    await page.getByLabel('Search properties').fill('');
    await pause(page);

    // --- Also on this page: sort ---
    await maybeClickFilters(page);
    await page.getByLabel('Sort properties').selectOption({ label: 'Name Z–A' });
    await pause(page);
    await page.getByLabel('Sort properties').selectOption({ label: 'Most vacant' });
    await pause(page);
    await page.getByLabel('Sort properties').selectOption({ label: 'Name A–Z' });
    await pause(page);

    // --- Also on this page: occupancy filter ---
    await page.getByLabel('Filter properties').selectOption({ label: 'Has vacant rooms' });
    await pause(page);
    await page.getByLabel('Filter properties').selectOption({ label: 'Fully occupied' });
    await pause(page);
    await page.getByLabel('Filter properties').selectOption({ label: 'All properties' });
    await pause(page);

    // Doc: No pagination on the property list. No bulk edit/delete. No export or print.

    // --- Also on this page: expand rooms ---
    const expand = page.getByRole('button', { name: /Expand rooms/i }).first();
    if (await expand.isVisible().catch(() => false)) {
      await expand.click();
      await pause(page);
      const collapse = page.getByRole('button', { name: /Collapse rooms/i }).first();
      if (await collapse.isVisible().catch(() => false)) {
        await collapse.click();
        await pause(page);
      }
    }

    await page.getByLabel('Search properties').fill(BUILDING_NAME);
    await pause(page);
    await page.getByText(BUILDING_NAME).first().click();
    await pause(page);

    // --- Also on this page: tabs Overview / Rooms / Maintenance ---
    await page.getByRole('tab', { name: 'Overview' }).click().catch(async () => {
      await page.getByRole('button', { name: 'Overview' }).click();
    });
    await pause(page);
    await expect(page.getByText(/Collection of Rent|Total units|Notes/i).first()).toBeVisible();

    await page.getByRole('tab', { name: 'Rooms' }).click().catch(async () => {
      await page.getByRole('button', { name: 'Rooms' }).click();
    });
    await pause(page);
    const roomSearch = page.getByPlaceholder('Room, tenant, type...');
    if (await roomSearch.isVisible().catch(() => false)) {
      await roomSearch.fill(ROOM_NUMBER);
      await pause(page, 600);
      await roomSearch.fill('');
      await pause(page);
    }
    const roomStatus = page.getByLabel('Status', { exact: true }).first();
    if (await roomStatus.isVisible().catch(() => false)) {
      await roomStatus.selectOption({ label: 'Vacant' }).catch(() => {});
      await pause(page);
      await roomStatus.selectOption({ label: 'All Status' }).catch(() => {});
      await pause(page);
    }

    await page.getByRole('tab', { name: 'Maintenance' }).click().catch(async () => {
      await page.getByRole('button', { name: 'Maintenance' }).click();
    });
    await pause(page);
    const maintSearch = page.getByPlaceholder('Ticket, title, tenant, unit...');
    if (await maintSearch.isVisible().catch(() => false)) {
      await maintSearch.fill('leak');
      await pause(page);
      await maintSearch.fill('');
    }

    await page.getByRole('tab', { name: 'Overview' }).click().catch(async () => {
      await page.getByRole('button', { name: 'Overview' }).click();
    });
    await pause(page);

    // --- Also on this page: landing toggle / maps / photo ---
    const landing = page.getByRole('switch', { name: /Show on landing page/i });
    if (await landing.isVisible().catch(() => false)) {
      await landing.scrollIntoViewIfNeeded();
      await pause(page);
      if (await landing.isEnabled()) {
        await landing.click();
        await pause(page);
        await landing.click();
        await pause(page);
      }
    }
    const maps = page.getByRole('link', { name: 'Open on Google Maps' });
    if (await maps.isVisible().catch(() => false)) {
      await maps.scrollIntoViewIfNeeded();
      await pause(page);
    }
    const photo = page.getByText(/Add property photo|Change photo/i).first();
    if (await photo.isVisible().catch(() => false)) {
      await photo.scrollIntoViewIfNeeded();
      await pause(page);
    }

    // --- Also on this page: property action rail (hover labels) ---
    for (const label of ['Record Payment', 'Add note', 'Add Tenant', 'Add Room', 'Maintenance']) {
      const rail = page.getByRole('button', { name: label }).first();
      if (await rail.isVisible().catch(() => false)) {
        await rail.hover();
        await pause(page, 400);
      }
    }

    // --- Also on this page: Add Room bulk (List) ---
    await page.getByRole('tab', { name: 'Rooms' }).click().catch(() => {});
    await page.getByRole('button', { name: 'Add Room' }).filter({ hasText: 'Add Room' }).first().click();
    await pause(page);
    const listMode = page.getByRole('button', { name: 'List', exact: true });
    if (await listMode.isVisible().catch(() => false)) {
      await listMode.click();
      await pause(page);
      await labeled(page, 'Room numbers').fill('RA-2\nRA-3');
      await pause(page);
      await page.getByRole('button', { name: /Create 2 rooms|Create room/ }).click();
      await pause(page, 800);
    } else {
      await page.getByRole('button', { name: 'Cancel' }).click();
      await pause(page);
    }

    // --- Also on this page: rooms master list (not in sidebar) ---
    await page.goto('/admin/rooms');
    await pause(page, 600);
    const roomsSearch = page.getByPlaceholder('Search').or(page.getByLabel('Search'));
    if (await roomsSearch.first().isVisible().catch(() => false)) {
      await roomsSearch.first().fill(ROOM_NUMBER);
      await pause(page, 600);
    }

    // --- Also on this page: /admin/buildings redirects here ---
    await page.goto('/admin/buildings');
    await page.waitForURL(/\/admin\/properties/);
    await pause(page);

    // --- Also on this page: Delete property (the recording building only) ---
    await page.getByLabel('Search properties').fill(BUILDING_NAME);
    await pause(page, 600);
    await page.getByRole('button', { name: new RegExp(`^${BUILDING_NAME}`) }).first().click();
    await pause(page);
    await page.getByRole('button', { name: 'Property options' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Delete property', exact: true }).click();
    await pause(page);
    const typeDelete = page.getByPlaceholder(/Type DELETE/i);
    if (await typeDelete.isVisible().catch(() => false)) {
      await typeDelete.fill('DELETE');
      await pause(page);
      await page.getByRole('button', { name: 'Delete Building' }).click();
      await pause(page, 800);
    } else {
      // Edit-modal confirm path
      await page.getByRole('button', { name: 'Delete Building' }).click().catch(() => {});
      await pause(page);
    }
  } finally {
    await saveJobVideo(page, testInfo, 'add-unit');
  }
});
