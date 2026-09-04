import { expect, loginAsAdmin, pause, saveJobVideo, test } from './helpers';

test('issue-lease training recording', async ({ page }, testInfo) => {
  test.setTimeout(10 * 60 * 1000);

  try {
    // --- Login: office admin ---
    await loginAsAdmin(page);

    // --- Main flow: Tenants → open tenant → Documents ---
    await page.goto('/admin/tenants');
    await pause(page, 600);
    await expect(page.locator('#tenant-search')).toBeVisible();
    await expect
      .poll(
        async () =>
          page.locator('a[href*="/admin/tenants/"]:not([href*="/new"]):not([href*="reservations"])').count(),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(0);
    await page.locator('#tenant-search').fill('Reyes');
    await pause(page, 800);
    await page.locator('#tenant-status').selectOption({ label: 'Current tenants' }).catch(() => {});
    await pause(page);
    const reyes = page
      .locator('a[href*="/admin/tenants/"]:not([href*="/new"]):not([href*="reservations"])')
      .filter({ hasText: /Reyes/i });
    if (await reyes.first().isVisible().catch(() => false)) {
      await reyes.first().click();
    } else {
      await page.locator('#tenant-search').fill('');
      await pause(page, 400);
      await page
        .locator('a[href*="/admin/tenants/"]:not([href*="/new"]):not([href*="reservations"])')
        .first()
        .click();
    }
    await page.waitForURL(/\/admin\/tenants\/[0-9a-f-]{8,}/i, { timeout: 20_000 });
    await pause(page, 800);
    await page.getByRole('tab', { name: 'Documents' }).click();
    await pause(page, 600);

    // --- Watch out for: Generate lease needs an active room assignment ---
    const generate = page.getByRole('button', { name: /Generate lease|Regenerate lease/ });
    if (await generate.isVisible().catch(() => false)) {
      await generate.click();
      await pause(page, 800);
      const replace = page.getByRole('button', { name: 'Replace & generate' });
      if (await replace.isVisible().catch(() => false)) {
        await replace.click();
        await pause(page, 800);
      }
    } else {
      await expect(page.getByText(/No lease agreement on file|Generate a draft/i).first()).toBeVisible();
    }

    await expect(
      page.getByText(/Lease agreement on file|Lease Contract|Generating|Generate lease/i).first()
    ).toBeVisible({ timeout: 30_000 });
    await pause(page);

    // --- Watch out for: Sign needs typed name + agreement checkbox ---
    const signAsLandlord = page.getByRole('button', { name: 'Sign as landlord' });
    if (await signAsLandlord.isVisible().catch(() => false)) {
      await signAsLandlord.click();
      await pause(page);
    }
    const signLease = page.getByRole('button', { name: 'Sign lease' });
    if (await signLease.isVisible().catch(() => false)) {
      await signLease.click();
      await pause(page);
      await expect(page.getByText(/Name required|Confirm required|Type your full legal name/i).first()).toBeVisible();
      await pause(page);

      // --- Main flow: e-sign as landlord ---
      await page.getByPlaceholder('Full legal name').fill('Alfonso Cruz');
      await pause(page);
      await page.getByText(/I have read the lease agreement/i).click();
      await pause(page);
      await signLease.click();
      await pause(page, 800);
    }

    // --- Done when: Lease Contract still there after refresh ---
    await page.reload();
    await pause(page, 600);
    await page.getByRole('tab', { name: 'Documents' }).click();
    await pause(page);
    await expect(page.getByText(/Lease Contract|Lease agreement on file/i).first()).toBeVisible();

    // --- Also on this page: required / optional documents ---
    await expect(page.getByText('ID Requirements')).toBeVisible();
    await expect(page.getByText('Proof of Residency')).toBeVisible();
    await page.getByRole('heading', { name: 'Optional Documents' }).scrollIntoViewIfNeeded();
    await pause(page);
    const addDoc = page.getByRole('button', { name: 'Add Document' }).or(page.getByText('Add Document'));
    if (await addDoc.first().isVisible().catch(() => false)) {
      await addDoc.first().click();
      await pause(page, 600);
      // Doc notes optional Add Document may only set location.hash
      await page.keyboard.press('Escape');
      await pause(page);
    }

    // --- Also on this page: View / Delete (open delete, cancel) ---
    const view = page.getByRole('button', { name: 'View' }).first();
    if (await view.isVisible().catch(() => false)) {
      await view.click();
      await pause(page, 600);
      await page.keyboard.press('Escape');
      await pause(page);
    }
    const del = page.getByRole('button', { name: 'Delete' }).first();
    if (await del.isVisible().catch(() => false)) {
      await del.click();
      await pause(page);
      if (await page.getByText('Delete document?').isVisible().catch(() => false)) {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await pause(page);
      }
    }

    // Doc: No search / filter / sort / export / print on this tab.

    // --- Also on this page: sidebar Documents library (separate from tenant tab) ---
    await page.goto('/admin/documents');
    await pause(page, 600);
    await page.getByPlaceholder('Filename, tenant...').fill('lease');
    await pause(page, 600);
    await page.getByPlaceholder('Filename, tenant...').fill('');
    await pause(page);
    const cat = page.getByLabel('Category');
    if (await cat.isVisible().catch(() => false)) {
      await cat.selectOption({ label: 'All Categories' });
      await pause(page);
    }
  } finally {
    await saveJobVideo(page, testInfo, 'issue-lease');
  }
});
