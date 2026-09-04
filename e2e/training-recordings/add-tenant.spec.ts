import {
  expect,
  fillLabeled,
  labeled,
  loginAsAdmin,
  pause,
  saveJobVideo,
  selectFirstRealOption,
  test,
  todayIso,
} from './helpers';

const FIRST = 'Maria';
const LAST = 'Reyes';
const EMAIL = `maria.reyes.${Date.now()}@parenta.test`;

test('add-tenant training recording', async ({ page }, testInfo) => {
  test.setTimeout(10 * 60 * 1000);

  try {
    // --- Login: office admin ---
    await loginAsAdmin(page);

    // --- Main flow: Tenants → Add Tenant ---
    await page.goto('/admin/tenants');
    await pause(page, 600);
    await page.getByRole('button', { name: 'Add Tenant' }).filter({ hasText: 'Add Tenant' }).first().click();
    await expect(page.getByRole('button', { name: 'Create Tenant' })).toBeVisible();
    await pause(page);

    // --- Watch out for: Email is required ---
    await fillLabeled(page, 'First Name', FIRST);
    await fillLabeled(page, 'Last Name', LAST);
    await page.getByRole('button', { name: 'Create Tenant' }).click();
    await expect(page.getByText('Email is required')).toBeVisible();
    await pause(page);

    // --- Watch out for: This email is already in use ---
    await fillLabeled(page, 'Email', 'admin@parenta.com');
    await page.getByRole('button', { name: 'Housing' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Create Tenant' }).click();
    const inUse = page.getByText(/This email is already in use/i);
    if (await inUse.isVisible().catch(() => false)) {
      await pause(page, 600);
    }

    await page.getByRole('button', { name: 'Personal Info' }).click();
    await pause(page);
    await fillLabeled(page, 'Email', EMAIL);
    await page.locator('#phone').fill('09171234800');
    await pause(page);

    // --- Main flow: Housing + Lease ---
    await page.getByRole('button', { name: 'Housing' }).click();
    await pause(page);
    await selectFirstRealOption(page.locator('#buildingId'), {
      prefer: /BALIBAGO|Balibago|VILLASOL|Villasol/i,
    });
    await pause(page, 600);
    await selectFirstRealOption(page.locator('#roomId'), {
      skip: /₱0\/month|Admin|Store/i,
      prefer: /Unit |₱[1-9]/,
    });
    await pause(page);
    const rent = page.locator('#monthlyRent');
    await expect(rent).toBeVisible();
    const rentValue = await rent.inputValue();
    if (!rentValue || rentValue === '0') {
      await rent.fill('4800');
    }
    await pause(page);
    await selectFirstRealOption(labeled(page, 'Lease Template').first());
    await pause(page);

    await page.getByRole('button', { name: 'Lease' }).click();
    await pause(page);
    await page.locator('#leaseStartDate').fill(todayIso());
    await pause(page);
    await page.locator('#moveInDate').fill(todayIso());
    await pause(page);

    await page.getByRole('button', { name: 'Create Tenant' }).click();
    await expect(page.getByRole('heading', { name: 'Tenant account created' })).toBeVisible({
      timeout: 30_000,
    });
    await pause(page, 600);
    await expect(page.getByText('Temporary password')).toBeVisible();
    await page.getByRole('button', { name: 'Copy' }).first().click().catch(() => {});
    await pause(page);
    await page.getByRole('button', { name: 'Continue to tenant' }).click();
    await pause(page, 800);

    // --- Done when: profile opens and list still shows them after refresh ---
    await expect(page).toHaveURL(/\/admin\/tenants\//);
    await expect(page.getByText(FIRST).first()).toBeVisible();
    await page.reload();
    await pause(page, 600);
    await expect(page.getByText(EMAIL).or(page.getByText(`${FIRST} ${LAST}`)).first()).toBeVisible();

    await page.goto('/admin/tenants');
    await pause(page);
    const search = page.getByPlaceholder(/Name, email, phone/i).or(page.getByLabel(/^Search/i));
    await search.first().fill(LAST);
    await pause(page, 600);
    await expect(page.getByText(LAST).first()).toBeVisible();

    // --- Also on this page: tenants list search / filters / sort / group ---
    await search.first().fill('Balibago');
    await pause(page, 600);
    await search.first().fill('');
    await pause(page);

    const buildingFilter = page.getByLabel(/^Building/i).or(page.locator('#building-filter, #tenant-building'));
    if (await buildingFilter.first().isVisible().catch(() => false)) {
      await buildingFilter.first().selectOption({ label: /BALIBAGO|Balibago/i }).catch(async () => {
        await selectFirstRealOption(buildingFilter.first());
      });
      await pause(page);
      await buildingFilter.first().selectOption({ label: 'All Buildings' }).catch(() => {});
      await pause(page);
    }

    const statusFilter = page.getByLabel(/^Status/i);
    if (await statusFilter.first().isVisible().catch(() => false)) {
      await statusFilter.first().selectOption({ label: 'Current tenants' }).catch(() => {});
      await pause(page);
      await statusFilter.first().selectOption({ label: 'Former tenants' }).catch(() => {});
      await pause(page);
      await statusFilter.first().selectOption({ label: 'All Status' }).catch(() => {});
      await pause(page);
    }

    const signalFilter = page.getByLabel(/^Signal/i);
    if (await signalFilter.first().isVisible().catch(() => false)) {
      await signalFilter.first().selectOption({ label: 'Overdue' }).catch(() => {});
      await pause(page);
      await signalFilter.first().selectOption({ label: 'All signals' }).catch(() => {});
      await pause(page);
    }

    const sortFilter = page.getByLabel(/^Sort/i);
    if (await sortFilter.first().isVisible().catch(() => false)) {
      await sortFilter.first().selectOption({ label: 'Last Name' }).catch(() => {});
      await pause(page);
    }
    await page.getByRole('button', { name: /Sort ascending|Sort descending/ }).click().catch(() => {});
    await pause(page);

    await page.getByRole('button', { name: 'By property' }).click().catch(() => {});
    await pause(page);
    await page.getByRole('button', { name: 'By payment' }).click().catch(() => {});
    await pause(page);

    await page.getByRole('button', { name: 'Grid view' }).click().catch(() => {});
    await pause(page);
    await page.getByRole('button', { name: 'List view' }).click().catch(() => {});
    await pause(page);

    // Doc: No bulk actions. No export.

    await page.getByRole('link', { name: 'Inquiries' }).first().click().catch(async () => {
      await page.getByRole('button', { name: 'Inquiries' }).click();
    });
    await pause(page, 600);
    await page.goto('/admin/tenants');
    await pause(page);

    // --- Also on this page: tenant profile tabs ---
    await search.first().fill(EMAIL);
    await pause(page, 600);
    await page.getByText(LAST).first().click();
    await pause(page, 600);

    await page.getByRole('tab', { name: 'Profile' }).click().catch(async () => {
      await page.getByRole('button', { name: 'Profile' }).click();
    });
    await pause(page);
    await page.getByRole('tab', { name: 'Lease' }).click().catch(async () => {
      await page.getByRole('button', { name: 'Lease' }).click();
    });
    await pause(page);
    await page.getByRole('tab', { name: 'Financials' }).click().catch(async () => {
      await page.getByRole('button', { name: 'Financials' }).click();
    });
    await pause(page);
    await page.getByRole('tab', { name: 'Documents' }).click().catch(async () => {
      await page.getByRole('button', { name: 'Documents' }).click();
    });
    await pause(page);
    await page.getByRole('tab', { name: 'Profile' }).click().catch(async () => {
      await page.getByRole('button', { name: 'Profile' }).click();
    });
    await pause(page);

    // --- Also on this page: Reset password (open, do not replace) ---
    await page.getByRole('button', { name: /Reset password|Set portal password/ }).click();
    await pause(page, 600);
    await expect(page.getByText(/Generate a temporary password|Set a password from the office/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await pause(page);

    // --- Also on this page: Preview portal ---
    const preview = page.getByRole('button', { name: 'Preview portal' });
    if (await preview.isVisible().catch(() => false)) {
      await preview.click();
      await pause(page, 800);
      await page.goBack().catch(() => {});
      await pause(page);
    }

    await page.getByRole('button', { name: 'Add note' }).click().catch(() => {});
    await pause(page);
    await page.getByRole('button', { name: 'Cancel' }).click().catch(() => {});
  } finally {
    await saveJobVideo(page, testInfo, 'add-tenant');
  }
});
