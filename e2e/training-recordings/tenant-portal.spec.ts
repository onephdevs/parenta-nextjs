import {
  expect,
  loginAsTenant,
  pause,
  saveJobVideo,
  seedRecordingPortalTenant,
  test,
  todayIso,
} from './helpers';

const FIRST = 'Nina';
const LAST = 'Santos';
const EMAIL = `nina.santos.${Date.now()}@parenta.test`;
const PASSWORD = 'PortalWalk8';
const NEW_PASSWORD = 'PortalHome9';

test('tenant-portal training recording', async ({ page }, testInfo) => {
  test.setTimeout(10 * 60 * 1000);
  const creds = { email: EMAIL, password: PASSWORD };

  try {
    await seedRecordingPortalTenant(page, {
      firstName: FIRST,
      lastName: LAST,
      email: EMAIL,
      password: PASSWORD,
    });

    // --- Watch out for: Invalid email, username, or password ---
    await page.goto('/auth/signin');
    await pause(page);
    await page.getByRole('textbox', { name: 'Email or username' }).fill(creds.email);
    await page.locator('#password').fill('wrong-password');
    await pause(page);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('Invalid email, username, or password')).toBeVisible();
    await pause(page, 600);

    // --- Main flow: Login ---
    await loginAsTenant(page, creds);

    // --- Main flow: first-visit setup ---
    const setup = page.getByRole('heading', { name: 'Set up your account' });
    await expect(setup).toBeVisible({ timeout: 20_000 });
    const username = page.locator('#username');
    if (!(await username.inputValue()).trim()) {
      await username.fill(`nina.santos.${Date.now().toString().slice(-6)}`);
    }
    await page.locator('#phone').fill('09170001122');
    await pause(page);
    await page.locator('#currentPassword').fill(PASSWORD);
    await page.locator('#newPassword').fill(NEW_PASSWORD);
    await page.locator('#confirmPassword').fill('mismatch');
    await pause(page);
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await expect(page.getByText(/do not match/i).first()).toBeVisible();
    await pause(page);
    await page.locator('#confirmPassword').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await expect(setup).toBeHidden({ timeout: 20_000 });
    creds.password = NEW_PASSWORD;
    await pause(page, 800);

    // --- Main flow: Home shows Your unit ---
    await page.goto('/tenant');
    await pause(page, 600);
    await expect(page.getByText(/Your unit|Monthly rent|Welcome/i).first()).toBeVisible();

    // --- Main flow: Payments overview / Pay now or Upload receipt ---
    await page.getByRole('link', { name: 'Payments' }).first().click();
    await pause(page, 600);
    await page.getByRole('link', { name: 'Overview & balance' }).first().click().catch(() => {});
    await pause(page);
    await expect(page.getByText(/Total paid|Next due|Past due|Payment Schedule/i).first()).toBeVisible();

    await page.getByRole('link', { name: 'Pay online' }).first().click();
    await pause(page, 600);
    const blocked = page.getByText(/Pay now is unavailable|has not published a GCash/i);
    if (await blocked.isVisible().catch(() => false)) {
      await pause(page, 800);
    } else {
      const amount = page.getByLabel(/Payment amount/i);
      if (await amount.isVisible().catch(() => false)) {
        await amount.fill('4800');
        await pause(page);
      }
    }

    await page.getByRole('link', { name: 'Upload receipt' }).first().click();
    await pause(page);
    await page.locator('#receipt-date').fill(todayIso()).catch(() => {});
    await page.locator('#receipt-amount').fill('4800').catch(() => {});
    await page.locator('#receipt-reference').fill('GCASH-4800-0815').catch(() => {});
    await pause(page);
    const submitReceipt = page.getByRole('button', { name: 'Submit for verification' });
    if (await submitReceipt.isEnabled().catch(() => false)) {
      await submitReceipt.click();
      await pause(page, 800);
    }

    // --- Main flow: Documents ---
    await page.getByRole('link', { name: 'Documents' }).first().click();
    await pause(page, 600);
    const download = page.getByRole('button', { name: 'Download' }).or(page.getByRole('link', { name: 'Download' }));
    if (await download.first().isVisible().catch(() => false)) {
      await download.first().hover();
      await pause(page);
    }

    // --- Main flow: Maintenance → New ticket ---
    await page.getByRole('link', { name: 'Maintenance' }).first().click();
    await pause(page);
    await page.getByRole('button', { name: 'New ticket' }).first().click();
    await pause(page);
    await page.locator('#title').fill('Kitchen faucet drip — Unit water line');
    await pause(page);
    await page.locator('#category').selectOption({ index: 1 }).catch(() => {});
    await pause(page);
    await page.locator('#description').fill('Slow drip under the sink since this morning. Please send maintenance.');
    await pause(page);
    await page.getByRole('button', { name: 'Submit ticket' }).click();
    await pause(page, 800);

    // --- Done when: refresh Home + ticket + history ---
    await page.goto('/tenant');
    await page.reload();
    await pause(page, 600);
    await expect(page.getByText(/Your unit|Monthly rent|Welcome/i).first()).toBeVisible();

    await page.goto('/tenant/maintenance');
    await pause(page);
    await expect(page.getByText(/Kitchen faucet|Tickets/i).first()).toBeVisible();

    await page.goto('/tenant/payments?tab=history');
    await pause(page, 600);

    // --- Also on this page: sign-in extras (Forgot Password) ---
    await page.goto('/auth/signin');
    await pause(page);
    await expect(page.getByRole('link', { name: 'Forgot Password?' })).toBeVisible();
    await expect(page.getByText('Remember me')).toBeVisible();

    await loginAsTenant(page, creds);

    // --- Also on this page: Payments tabs ---
    await page.goto('/tenant/payments?tab=history');
    await pause(page);
    const paySearch = page.getByPlaceholder('Search payments...');
    if (await paySearch.isVisible().catch(() => false)) {
      await paySearch.fill('GCash');
      await pause(page);
      await paySearch.fill('');
    }
    await page.getByRole('link', { name: 'Statements' }).first().click();
    await pause(page, 600);

    await page.goto('/tenant/documents');
    await pause(page);
    const docSearch = page.getByPlaceholder('Search documents...');
    if (await docSearch.isVisible().catch(() => false)) {
      await docSearch.fill('lease');
      await pause(page);
    }
    const cat = page.locator('#document-category');
    if (await cat.isVisible().catch(() => false)) {
      await cat.selectOption({ label: 'Lease' }).catch(() => {});
      await pause(page);
      await page.getByRole('button', { name: 'Clear filters' }).click().catch(() => {});
      await pause(page);
    }

    await page.goto('/tenant/maintenance');
    await pause(page);
    await page.getByRole('button', { name: 'Open' }).click().catch(() => {});
    await pause(page);

    // --- Also on this page: Profile sections ---
    await page.goto('/tenant/profile');
    await pause(page);
    await page.getByRole('link', { name: 'Occupants' }).first().click();
    await pause(page);
    await page.getByRole('link', { name: 'Emergency contact' }).first().click();
    await pause(page);
    await page.getByRole('link', { name: 'Account & password' }).click();
    await pause(page);

    const theme = page.getByRole('button', { name: /Switch to (dark|light) theme/i });
    if (await theme.first().isVisible().catch(() => false)) {
      await theme.first().click();
      await pause(page);
      await theme.first().click();
      await pause(page);
    }
  } finally {
    await saveJobVideo(page, testInfo, 'tenant-portal');
  }
});
