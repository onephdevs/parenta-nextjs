import {
  clickIfVisible,
  clickNamed,
  fillLabeled,
  gotoSettled,
  loginAsAdmin,
  openNav,
  pause,
  runRecording,
  selectIfVisible,
  stamp,
  test,
} from './helpers';

test.describe('Documents module recordings', () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  test('file-documents training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'file-documents', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Documents');
      await clickNamed(page, /Upload document/i);
      await pause(page, 800);
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles({
        name: `recording-id-${stamp()}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from('Recording walkthrough ID copy'),
      });
      await pause(page, 800);
      const dialog = page.getByRole('dialog');
      const name = dialog.getByLabel(/Document name/i).or(page.getByLabel(/Document name/i)).first();
      if (await name.isVisible().catch(() => false)) {
        await name.fill(`Recording ID ${stamp()}`);
      }
      await selectIfVisible(page.getByLabel(/^Category/i).first());
      await clickIfVisible(dialog.getByRole('button', { name: /^Upload/i }));
      await clickIfVisible(page.getByRole('button', { name: /Upload \d+ files/i }));
      await pause(page, 1400);
      const search = page.getByPlaceholder(/Filename, tenant/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('Recording');
        await pause(page, 900);
      }
    });
  });

  test('document-categories training recording', async ({ page }, testInfo) => {
    await runRecording(page, testInfo, 'document-categories', async () => {
      await loginAsAdmin(page);
      await openNav(page, 'Documents');
      await clickIfVisible(page.getByRole('link', { name: /Manage Categories/i }));
      await gotoSettled(page, '/admin/documents/categories');
      await pause(page, 900);
      await clickNamed(page, /New Category/i);
      await fillLabeled(page, 'Category Name', `Recording files ${stamp()}`);
      const desc = page.getByLabel(/Description/i).first();
      if (await desc.isVisible().catch(() => false)) {
        await desc.fill('Training walkthrough category');
      }
      await page.getByLabel(/Parent Category/i).first().hover().catch(() => undefined);
      await pause(page, 700);
      await clickNamed(page, /Create Category/i);
      await pause(page, 1400);
      await gotoSettled(page, '/admin/documents');
      await page.getByLabel(/^Category$/i).first().hover().catch(() => undefined);
      await pause(page, 1000);
    });
  });
});
