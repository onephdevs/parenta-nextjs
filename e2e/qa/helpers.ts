import type { Page, TestInfo } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  clickNamed,
  deleteBuildingNamed,
  expect,
  fillLabeled,
  labeled,
  loginAsAdmin,
  loginAsTenant,
  loginViaCredentialsApi,
  maybeClickFilters,
  pause,
  selectFirstRealOption,
  test as trainingTest,
  todayIso,
  plusDaysIso,
  adminCredentials,
  seedRecordingPortalTenant,
} from '../training-recordings/helpers';

export {
  clickNamed,
  deleteBuildingNamed,
  expect,
  fillLabeled,
  labeled,
  loginAsAdmin,
  loginAsTenant,
  loginViaCredentialsApi,
  maybeClickFilters,
  pause,
  selectFirstRealOption,
  todayIso,
  plusDaysIso,
  adminCredentials,
  seedRecordingPortalTenant,
};

/** 300ms slowMo so passing-test videos stay legible as proof. */
export const test = trainingTest.extend({
  page: async ({ page }, use, testInfo) => {
    testInfo.setTimeout(4 * 60 * 1000);
    await use(page);
    await saveQaVideo(page, testInfo);
  },
});

test.use({
  launchOptions: { slowMo: 300 },
  video: {
    mode: 'on',
    size: { width: 1920, height: 1080 },
  },
});

export function stamp(): string {
  return Date.now().toString().slice(-6);
}

export async function saveQaVideo(page: Page, testInfo: TestInfo): Promise<void> {
  const video = page.video();
  try {
    await page.close();
  } catch {
    /* already closed */
  }
  if (!video) return;
  const src = await video.path();
  const moduleName = path.basename(testInfo.file, '.spec.ts');
  const destDir = path.join(process.cwd(), 'recordings', 'qa', moduleName);
  await fs.mkdir(destDir, { recursive: true });
  const safeTitle = testInfo.title
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  await fs.copyFile(src, path.join(destDir, `${safeTitle}.webm`));
  testInfo.annotations.push({
    type: 'video',
    description: `recordings/qa/${moduleName}/${safeTitle}.webm`,
  });
}

export async function expectRequiredMissing(locator: { evaluate: Function }): Promise<void> {
  const missing = await locator.evaluate((el: HTMLInputElement | HTMLSelectElement) => el.validity.valueMissing);
  expect(missing).toBe(true);
}

export async function expectRangeUnderflow(locator: { evaluate: Function }): Promise<void> {
  const underflow = await locator.evaluate((el: HTMLInputElement) => el.validity.rangeUnderflow);
  expect(underflow).toBe(true);
}

interface BuildingRow {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

export async function listBuildings(page: Page): Promise<BuildingRow[]> {
  const response = await page.request.get('/api/buildings');
  if (!response.ok()) return [];
  const json = (await response.json()) as {
    data?: { buildings?: BuildingRow[] };
    buildings?: BuildingRow[];
  };
  return json.data?.buildings || json.buildings || [];
}

export async function copyBalibagoLocation(
  page: Page,
): Promise<{ city: string; state: string }> {
  const buildings = await listBuildings(page);
  const prefer =
    buildings.find((row) => /BALIBAGO|VILLASOL/i.test(row.name)) || buildings[0];
  if (!prefer?.city || !prefer?.state) {
    throw new Error('Need an existing building with city and region to seed QA data');
  }
  return { city: prefer.city, state: prefer.state };
}

export async function createQaBuilding(
  page: Page,
  name: string,
): Promise<{ id: string; name: string }> {
  const location = await copyBalibagoLocation(page);
  const created = await page.request.post('/api/buildings', {
    data: {
      name,
      city: location.city,
      state: location.state,
      buildingType: 'residential',
    },
  });
  if (!created.ok()) {
    throw new Error(`Failed to create QA building: ${created.status()} ${await created.text()}`);
  }
  const json = (await created.json()) as { data?: { id?: string } };
  const id = String(json.data?.id || '');
  if (!id) throw new Error('QA building created without an id');
  return { id, name };
}

export async function createQaRoom(
  page: Page,
  buildingId: string,
  roomNumber: string,
  monthlyRate = 4800,
): Promise<{ id: string; roomNumber: string }> {
  const created = await page.request.post('/api/rooms', {
    data: {
      buildingId,
      roomNumber,
      roomType: 'Studio',
      monthlyRate,
      roomStatus: 'vacant',
    },
  });
  if (!created.ok()) {
    throw new Error(`Failed to create QA room: ${created.status()} ${await created.text()}`);
  }
  const json = (await created.json()) as { data?: { id?: string; roomNumber?: string } };
  const id = String(json.data?.id || '');
  if (!id) throw new Error('QA room created without an id');
  return { id, roomNumber: json.data?.roomNumber || roomNumber };
}

export async function createQaTenant(
  page: Page,
  person: { firstName: string; lastName: string; email: string; password?: string },
): Promise<{ tenantId: string; temporaryPassword?: string }> {
  const created = await page.request.post('/api/tenants', {
    data: {
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      password: person.password,
      createUserAccount: true,
      profileCompleted: true,
      sendInvitation: false,
    },
  });
  if (!created.ok()) {
    throw new Error(`Failed to create QA tenant: ${created.status()} ${await created.text()}`);
  }
  const json = (await created.json()) as {
    data?: { tenantId?: string; id?: string; temporaryPassword?: string };
  };
  const tenantId = String(json.data?.tenantId || json.data?.id || '');
  if (!tenantId) throw new Error('QA tenant created without an id');
  return { tenantId, temporaryPassword: json.data?.temporaryPassword };
}

export async function firstLeaseTemplateId(page: Page): Promise<string> {
  const response = await page.request.get('/api/lease-package-templates');
  const json = (await response.json()) as {
    data?: Array<{ id: string; depositMonths?: number | null; advanceMonths?: number }>;
  };
  const templates = json.data || [];
  const template =
    templates.find((row) => row.depositMonths == null || Number(row.depositMonths) === 0) ||
    templates[0];
  if (!template?.id) throw new Error('No lease template available');
  return template.id;
}

export async function assignQaTenant(
  page: Page,
  roomId: string,
  tenantId: string,
  monthlyRate = 4800,
): Promise<void> {
  const templateId = await firstLeaseTemplateId(page);
  const assigned = await page.request.post(`/api/rooms/${roomId}/assign`, {
    data: {
      tenantId,
      startDate: todayIso(),
      monthlyRate,
      leasePackageTemplateId: templateId,
      depositPaid: 0,
      advanceAmount: 0,
    },
  });
  if (!assigned.ok()) {
    throw new Error(`Failed to assign QA tenant: ${assigned.status()} ${await assigned.text()}`);
  }
}

export async function createQaInvoice(
  page: Page,
  tenantId: string,
  amount = 4800,
  description = 'September 2026 rent — QA',
): Promise<{ id: string; invoiceNumber: string }> {
  const created = await page.request.post('/api/invoices', {
    data: {
      tenantId,
      dueDate: plusDaysIso(7),
      description,
      items: [{ description: 'Monthly rent', quantity: 1, unitPrice: amount }],
    },
  });
  if (!created.ok()) {
    throw new Error(`Failed to create QA invoice: ${created.status()} ${await created.text()}`);
  }
  const json = (await created.json()) as {
    data?: {
      invoice?: { id?: string; invoiceId?: string; invoiceNumber?: string; invoice_number?: string };
    };
  };
  const invoice = json.data?.invoice || {};
  const id = String(invoice.id || invoice.invoiceId || '');
  const invoiceNumber = String(invoice.invoiceNumber || invoice.invoice_number || '');
  if (!id) throw new Error('QA invoice created without an id');
  return { id, invoiceNumber };
}

export async function createQaPayment(
  page: Page,
  opts: { tenantId: string; amount: number; invoiceId?: string },
): Promise<{ id: string }> {
  const created = await page.request.post('/api/payments', {
    data: {
      tenantId: opts.tenantId,
      amount: opts.amount,
      paymentType: 'rent',
      paymentMethod: 'gcash',
      paymentDate: todayIso(),
      paymentStatus: 'completed',
      autoAllocate: true,
      invoiceId: opts.invoiceId,
    },
  });
  if (!created.ok()) {
    throw new Error(`Failed to create QA payment: ${created.status()} ${await created.text()}`);
  }
  const json = (await created.json()) as {
    data?: { id?: string; payment?: { id?: string } };
  };
  const id = String(json.data?.payment?.id || json.data?.id || '');
  if (!id) throw new Error('QA payment created without an id');
  return { id };
}

export async function preferBalibagoBuilding(page: Page): Promise<BuildingRow> {
  const buildings = await listBuildings(page);
  const match =
    buildings.find((row) => /BALIBAGO/i.test(row.name)) ||
    buildings.find((row) => /VILLASOL/i.test(row.name)) ||
    buildings[0];
  if (!match) throw new Error('No buildings found');
  return match;
}

export async function openAddBuilding(page: Page): Promise<void> {
  await page.goto('/admin/properties');
  await pause(page, 500);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create building' })).toBeVisible();
  await pause(page, 450);
}

export async function fillBuildingLocation(page: Page): Promise<void> {
  const regionsLoaded = page.waitForResponse(
    (response) => response.url().includes('/api/addresses/regions') && response.ok(),
    { timeout: 20_000 },
  );
  await page.getByRole('button', { name: 'Location', exact: true }).click();
  await regionsLoaded;
  await pause(page, 450);
  await selectFirstRealOption(labeled(page, 'Region'), {
    prefer: /Central Luzon|Pampanga|III/i,
  });
  await pause(page, 500);
  await selectFirstRealOption(labeled(page, 'City'));
  await pause(page, 450);
}
