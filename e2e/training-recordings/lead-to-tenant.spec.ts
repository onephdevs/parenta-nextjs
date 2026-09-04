import {
  clickNamed,
  expect,
  fillLabeled,
  loginAsAdmin,
  pause,
  saveJobVideo,
  selectFirstRealOption,
  test,
  todayIso,
} from './helpers';

const FIRST = 'Paolo';
const LAST = 'Santos';
const EMAIL = `paolo.santos.${Date.now()}@parenta.test`;

test('lead-to-tenant training recording', async ({ page }, testInfo) => {
  test.setTimeout(12 * 60 * 1000);

  try {
    // --- Login: office admin ---
    await loginAsAdmin(page);

    // --- Main flow: Tasks Onboarding → Add opportunity ---
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page, 800);
    await page.getByRole('button', { name: 'Add opportunity' }).click();
    await pause(page);

    await fillLabeled(page, 'First name', FIRST);
    await fillLabeled(page, 'Last name', LAST);
    await fillLabeled(page, 'Email', EMAIL);
    await page.locator('#opp-phone').fill('09175551234');
    await pause(page);

    await page.getByRole('button', { name: 'Property', exact: true }).click();
    await pause(page);
    await selectFirstRealOption(page.locator('#opp-building'), {
      prefer: /BALIBAGO|Balibago|VILLASOL|Villasol/i,
    });
    await pause(page, 600);
    await selectFirstRealOption(page.locator('#opp-room'), {
      skip: /₱0\/mo|Admin|Store/i,
      prefer: /₱[1-9]/,
    });
    await pause(page);
    const rent = page.locator('#opp-amount');
    if (await rent.isVisible()) {
      const current = await rent.inputValue();
      if (!current || current === '0') await rent.fill('4800');
    }
    await pause(page);

    await clickNamed(page, 'Create opportunity');
    await pause(page, 800);

    // Re-open the card for payment + lease
    await page.getByText(`${FIRST} ${LAST}`).first().click();
    await pause(page, 600);

    // --- Watch out for: Generate lease stays off until Payment received ---
    await page.getByRole('button', { name: 'Lease', exact: true }).click();
    await pause(page);
    await expect(page.getByText(/Mark Payment received first/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Payment' })).toBeVisible();
    await pause(page);

    // --- Main flow: Payment received + Generate lease ---
    await page.getByRole('button', { name: 'Go to Payment' }).click();
    await pause(page);
    await selectFirstRealOption(page.locator('#opp-lease-package-payment'));
    await pause(page, 600);
    const totalPaid = page.locator('#opp-total-paid');
    if (await totalPaid.isVisible().catch(() => false)) {
      const totalValue = await totalPaid.inputValue();
      if (!totalValue || totalValue === '0') {
        await totalPaid.fill('9600');
      }
    }
    await page.locator('#opp-pay-date').fill(todayIso()).catch(() => {});
    await pause(page);
    await page.locator('#opp-payment-received').click({ force: true });
    await expect(page.locator('#opp-payment-received')).toBeChecked({ timeout: 20_000 });
    await pause(page, 800);

    await page.getByRole('button', { name: 'Lease', exact: true }).click();
    await pause(page);
    await page.locator('#opp-lease-start').fill(todayIso());
    await pause(page);
    await selectFirstRealOption(page.locator('#opp-lease-package'));
    await pause(page);
    await page.getByRole('button', { name: 'Generate lease' }).click();
    await expect(page.getByText(/Lease generated/i).first()).toBeVisible({
      timeout: 40_000,
    });
    await pause(page, 600);

    // --- Also on this page: move through stages (Status → Stage) ---
    const statusSection = page.getByRole('button', { name: 'Status', exact: true });
    if (await statusSection.isVisible().catch(() => false)) {
      await statusSection.click();
      await pause(page);
      const stage = page.getByLabel('Stage', { exact: true });
      if (await stage.isVisible().catch(() => false)) {
        await stage.selectOption({ label: 'Lease signed' }).catch(() => {});
        await pause(page);
        await page.getByRole('button', { name: 'Save changes' }).click().catch(() => {});
        await pause(page, 600);
      }
    }

    // --- Done when: tenant exists, card in Lease signed ---
    await page.keyboard.press('Escape');
    await pause(page);
    await page.reload();
    await pause(page, 800);
    await expect(page.getByText(/Lease signed/i).first()).toBeVisible();

    await page.goto('/admin/tenants');
    await pause(page);
    await page.locator('#tenant-search').fill(LAST);
    await pause(page, 600);
    await expect(page.getByText(LAST).first()).toBeVisible();

    // --- Also on this page: board chrome ---
    await page.goto('/admin/tasks?board=onboarding');
    await pause(page);
    await page.getByPlaceholder('Search Opportunities').fill(LAST);
    await pause(page, 600);
    await page.getByPlaceholder('Search Opportunities').fill('');
    await pause(page);

    await page.getByRole('button', { name: 'Advanced Filters' }).click();
    await pause(page);
    const stageFilter = page.getByLabel('Stage');
    if (await stageFilter.isVisible().catch(() => false)) {
      await stageFilter.selectOption({ label: 'All stages' });
      await pause(page);
    }
    await page.getByRole('button', { name: 'Clear filters' }).click().catch(() => {});
    await pause(page);

    await page.getByRole('button', { name: 'Sort' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'List view' }).click();
    await pause(page);
    await page.getByRole('button', { name: 'Kanban view' }).click();
    await pause(page);

    await page.getByRole('button', { name: 'Import' }).click();
    await pause(page, 600);
    await expect(page.getByText(/Import CSV/i)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await pause(page);

    await page.getByRole('button', { name: 'Bulk Actions' }).click();
    await pause(page);
    await page.keyboard.press('Escape');
    await pause(page);

    // --- Also on this page: other boards (do not Generate lease here) ---
    const paymentsBoard = page.getByRole('button', { name: /^Payments$/ }).or(page.getByText('Payments', { exact: true }));
    if (await paymentsBoard.first().isVisible().catch(() => false)) {
      await paymentsBoard.first().click();
      await pause(page, 600);
    }
  } finally {
    await saveJobVideo(page, testInfo, 'lead-to-tenant');
  }
});
