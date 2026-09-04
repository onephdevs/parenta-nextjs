import { test as base, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

export { expect };

const TRAINING_POINTER_SOURCE = `(() => {
  const mount = () => {
    if (document.getElementById('training-pointer')) return;

    if (!document.getElementById('training-pointer-style')) {
      const style = document.createElement('style');
      style.id = 'training-pointer-style';
      style.textContent = \`
        html.training-rec, html.training-rec * { cursor: none !important; }
        #training-pointer {
          position: fixed !important;
          top: 0;
          left: 0;
          width: 52px;
          height: 52px;
          z-index: 2147483647 !important;
          pointer-events: none !important;
          transform: translate(-4px, -2px);
          transition: transform 80ms ease-out;
          filter: drop-shadow(0 0 2px #fff) drop-shadow(0 3px 6px rgba(0,0,0,.6));
        }
        #training-pointer.is-down { transform: translate(-4px, -2px) scale(0.86); }
        .training-click-ring {
          position: fixed !important;
          z-index: 2147483646 !important;
          pointer-events: none !important;
          border: 3px solid #ff5a1f;
          border-radius: 999px;
          width: 28px;
          height: 28px;
          margin: -14px 0 0 -14px;
          animation: training-click 420ms ease-out forwards;
        }
        @keyframes training-click {
          from { opacity: 0.9; transform: scale(0.35); }
          to { opacity: 0; transform: scale(2.4); }
        }
      \`;
      document.documentElement.appendChild(style);
      document.documentElement.classList.add('training-rec');
    }

    const pointer = document.createElement('div');
    pointer.id = 'training-pointer';
    pointer.setAttribute('aria-hidden', 'true');
    pointer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24"><path fill="#ff5a1f" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" d="M5.5 3.2v17.6c0 .7 1.2 1 1.9.4l4-4 2.3 5.5a1 1 0 0 0 1.3.6l2.2-.9a1 1 0 0 0 .5-1.3l-2.3-5.5 4.5-.4c.9-.1 1.2-1.2.5-1.7L5.5 3.2z"/></svg>';
    document.documentElement.appendChild(pointer);
  };

  mount();
  document.addEventListener('DOMContentLoaded', mount);
  if (!window.__trainingPointerListeners) {
    window.__trainingPointerListeners = true;
    new MutationObserver(mount).observe(document.documentElement, { childList: true });
    document.addEventListener('mousemove', (event) => {
      mount();
      const pointer = document.getElementById('training-pointer');
      if (!pointer) return;
      pointer.style.left = event.clientX + 'px';
      pointer.style.top = event.clientY + 'px';
    }, true);
    document.addEventListener('mousedown', (event) => {
      const pointer = document.getElementById('training-pointer');
      pointer && pointer.classList.add('is-down');
      const ring = document.createElement('div');
      ring.className = 'training-click-ring';
      ring.style.left = event.clientX + 'px';
      ring.style.top = event.clientY + 'px';
      document.documentElement.appendChild(ring);
      setTimeout(() => ring.remove(), 400);
    }, true);
    document.addEventListener('mouseup', () => {
      const pointer = document.getElementById('training-pointer');
      pointer && pointer.classList.remove('is-down');
    }, true);
  }
})()`;

/** Travel frames for the overlay; dwell so the pointer sits on the target before the click. */
const POINTER_MOVE_STEPS = 28;
const POINTER_DWELL_MS = 700;

async function syncPointerToLocator(
  locator: Locator,
  position?: { x: number; y: number },
): Promise<void> {
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 8_000 });
  } catch {
    /* click/fill will surface the real error */
  }
  let box: { x: number; y: number; width: number; height: number } | null = null;
  try {
    box = await locator.boundingBox();
  } catch {
    return;
  }
  if (!box || box.width < 1 || box.height < 1) return;
  const x = box.x + (position?.x ?? Math.max(6, Math.min(box.width / 2, box.width - 4)));
  const y = box.y + (position?.y ?? Math.max(6, Math.min(box.height / 2, box.height - 4)));
  await locator.page().mouse.move(x, y, { steps: POINTER_MOVE_STEPS });
  await locator.page().evaluate(({ x, y }) => {
    const pointer = document.getElementById('training-pointer');
    if (!pointer) return;
    pointer.style.left = `${x}px`;
    pointer.style.top = `${y}px`;
  }, { x, y });
  await locator.page().waitForTimeout(POINTER_DWELL_MS);
}

let locatorPointerPatched = false;

function patchLocatorPointerSync(page: Page): void {
  if (locatorPointerPatched) return;
  const proto = Object.getPrototypeOf(page.locator('html')) as Locator;
  locatorPointerPatched = true;

  const origClick = proto.click;
  proto.click = async function (this: Locator, options) {
    if (options?.trial) return origClick.call(this, options);
    await syncPointerToLocator(this, options?.position);
    return origClick.call(this, { ...options, force: true, noWaitAfter: true });
  };

  const origDblclick = proto.dblclick;
  proto.dblclick = async function (this: Locator, options) {
    if (options?.trial) return origDblclick.call(this, options);
    await syncPointerToLocator(this, options?.position);
    return origDblclick.call(this, { ...options, force: true });
  };

  const origHover = proto.hover;
  proto.hover = async function (this: Locator, options) {
    if (options?.trial) return origHover.call(this, options);
    await syncPointerToLocator(this, options?.position);
    return origHover.call(this, { ...options, force: true });
  };

  const origSelect = proto.selectOption;
  proto.selectOption = async function (this: Locator, values, options) {
    await syncPointerToLocator(this);
    return origSelect.call(this, values, options);
  };

  const origCheck = proto.check;
  proto.check = async function (this: Locator, options) {
    if (options?.trial) return origCheck.call(this, options);
    await syncPointerToLocator(this, options?.position);
    return origCheck.call(this, options);
  };

  const origUncheck = proto.uncheck;
  proto.uncheck = async function (this: Locator, options) {
    if (options?.trial) return origUncheck.call(this, options);
    await syncPointerToLocator(this, options?.position);
    return origUncheck.call(this, options);
  };
}

export async function installTrainingPointer(page: Page): Promise<void> {
  await page.addInitScript({ content: TRAINING_POINTER_SOURCE });
  page.on('load', () => {
    void page.evaluate(TRAINING_POINTER_SOURCE).catch(() => undefined);
  });
  await page.evaluate(TRAINING_POINTER_SOURCE).catch(() => {
    /* no document yet */
  });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    patchLocatorPointerSync(page);
    await installTrainingPointer(page);
    const origGoto = page.goto.bind(page);
    page.goto = (async (url, options) => {
      const result = await origGoto(url, options);
      await page.mouse.move(360, 240, { steps: 16 }).catch(() => undefined);
      await page.waitForTimeout(400);
      return result;
    }) as typeof page.goto;
    await use(page);
  },
});

/** Pause so the recording is watchable. Longer on purpose so the pointer can settle. */
export async function pause(page: Page, ms = 700): Promise<void> {
  await page.waitForTimeout(ms);
}

export async function gotoSettled(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await pause(page, 700);
  await waitForAppIdle(page);
  await page.mouse.move(360, 240, { steps: 16 });
  await pause(page, 500);
}

export async function waitForAppIdle(page: Page): Promise<void> {
  const loading = page.getByRole('status', { name: /Loading/i });
  await loading
    .first()
    .waitFor({ state: 'hidden', timeout: 20_000 })
    .catch(() => undefined);
}

/** Sidebar parent, then optional child (e.g. Payments → Invoices). */
export async function openNav(page: Page, parent: string, child?: string): Promise<void> {
  const nav = page.getByRole('navigation');
  const parentLink = nav.getByRole('link', { name: parent, exact: true }).first();
  const parentButton = nav.getByRole('button', { name: parent, exact: true }).first();
  if (await parentLink.isVisible().catch(() => false)) {
    await parentLink.click();
  } else if (await parentButton.isVisible().catch(() => false)) {
    await parentButton.click();
  } else {
    await page.getByRole('link', { name: parent }).first().click();
  }
  await pause(page, 800);
  if (!child) return;
  const childLink = nav.getByRole('link', { name: child, exact: true }).first();
  await childLink.waitFor({ state: 'visible', timeout: 8_000 });
  await childLink.click();
  await pause(page, 900);
  await waitForAppIdle(page);
}

export async function clickIfVisible(locator: Locator): Promise<boolean> {
  const target = locator.first();
  if (!(await target.isVisible().catch(() => false))) return false;
  await target.click();
  await pause(target.page(), 700);
  return true;
}

export async function clickByName(page: Page, name: string | RegExp): Promise<boolean> {
  const candidates = [
    page.getByRole('tab', { name }).first(),
    page.getByRole('button', { name }).first(),
    page.getByRole('link', { name }).first(),
  ];
  for (const target of candidates) {
    if (await target.isVisible().catch(() => false)) {
      await target.click();
      await pause(page, 800);
      return true;
    }
  }
  return false;
}

export async function hoverIfVisible(locator: Locator): Promise<boolean> {
  const target = locator.first();
  if (!(await target.isVisible().catch(() => false))) return false;
  await target.hover();
  return true;
}

export function adminCredentials(): { email: string; password: string } {
  return {
    email: process.env.E2E_ADMIN_EMAIL || process.env.TEST_ADMIN_EMAIL || 'admin@parenta.com',
    password:
      process.env.E2E_ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || 'admin123',
  };
}

export function tenantCredentials(): { email: string; password: string } {
  return {
    email: process.env.E2E_TENANT_EMAIL || process.env.TEST_TENANT_EMAIL || 'tenant@parenta.com',
    password:
      process.env.E2E_TENANT_PASSWORD || process.env.TEST_TENANT_PASSWORD || 'tenant123',
  };
}

/** Sign-in: Password label also matches the “Show password” button. */
export async function fillSignIn(page: Page, email: string, password: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Email or username' }).fill(email);
  await pause(page, 400);
  await page.locator('#password').fill(password);
  await pause(page);
  await page.getByRole('button', { name: 'Login' }).click();
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await installTrainingPointer(page);
  const { email, password } = adminCredentials();
  await page.goto('/auth/signin');
  await page.mouse.move(240, 200, { steps: 12 });
  await pause(page);
  await pause(page);
  await fillSignIn(page, email, password);
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/auth\//);
  await pause(page, 600);
}

export async function loginAsTenant(page: Page, creds?: { email: string; password: string }): Promise<void> {
  await installTrainingPointer(page);
  const { email, password } = creds || tenantCredentials();
  await page.goto('/auth/signin');
  await page.mouse.move(240, 200, { steps: 12 });
  await pause(page);
  await pause(page);
  await fillSignIn(page, email, password);
  await page.waitForURL((url) => url.pathname.startsWith('/tenant') || url.pathname === '/tenant', {
    timeout: 30_000,
  });
  await pause(page, 600);
}

export async function openSidebar(page: Page, name: string | RegExp): Promise<void> {
  if (typeof name === 'string') {
    await openNav(page, name);
    return;
  }
  await page.getByRole('link', { name }).first().click();
  await pause(page, 800);
}

async function realSelectOptions(
  locator: Locator,
): Promise<Array<{ value: string; text: string }>> {
  const options = await locator.locator('option').all();
  const parsed: Array<{ value: string; text: string }> = [];
  for (const option of options) {
    const value = (await option.getAttribute('value')) || '';
    const text = ((await option.textContent()) || '').trim();
    if (!value) continue;
    if (/^(select |loading|choose |all )/i.test(text)) continue;
    parsed.push({ value, text });
  }
  return parsed;
}

/** First <option> with a real value (skips placeholders like “Select…”). */
export async function selectFirstRealOption(
  locator: Locator,
  opts?: { prefer?: RegExp; skip?: RegExp }
): Promise<string> {
  await locator.waitFor({ state: 'visible' });
  await expect(locator).toBeEnabled({ timeout: 20_000 });
  await expect
    .poll(async () => (await realSelectOptions(locator)).length, { timeout: 20_000 })
    .toBeGreaterThan(0);

  const parsed = await realSelectOptions(locator);
  const usable = opts?.skip
    ? parsed.filter((row) => !opts.skip!.test(row.text))
    : parsed;
  const pool = usable.length ? usable : parsed;
  const preferred = opts?.prefer
    ? pool.find((row) => opts.prefer!.test(row.text))
    : undefined;
  const pick = preferred || pool[0];
  if (!pick) {
    throw new Error('No selectable option found');
  }
  await locator.selectOption(pick.value);
  return pick.text;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function labeled(page: Page, label: string): Locator {
  return page.getByLabel(new RegExp(`^${escapeRegExp(label)}\\s*\\*?$`));
}

export async function fillLabeled(page: Page, label: string, value: string): Promise<void> {
  const field = labeled(page, label).first();
  await field.click();
  await field.fill(value);
  await pause(page, 500);
}

export async function selectIfVisible(
  locator: Locator,
  opts?: { prefer?: RegExp; skip?: RegExp },
): Promise<string | null> {
  const target = locator.first();
  if (!(await target.isVisible().catch(() => false))) return null;
  return selectFirstRealOption(target, opts);
}

export async function clickNamed(page: Page, name: string | RegExp): Promise<void> {
  await page.getByRole('button', { name }).first().click();
  await pause(page, 550);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function stamp(): string {
  return Date.now().toString().slice(-6);
}

/** Copy Playwright’s webm to /recordings/[job-name].webm */
export async function saveJobVideo(page: Page, testInfo: TestInfo, jobName: string): Promise<void> {
  const video = page.video();
  try {
    await page.context().close();
  } catch {
    /* already closed */
  }
  if (!video) return;
  const src = await video.path();
  const destDir = path.join(process.cwd(), 'recordings');
  await fs.mkdir(destDir, { recursive: true });
  const dest = path.join(destDir, `${jobName}.webm`);
  await fs.copyFile(src, dest);
  const publicDir = path.join(process.cwd(), 'public', 'knowledge-base', 'videos');
  await fs.mkdir(publicDir, { recursive: true });
  await fs.copyFile(src, path.join(publicDir, `${jobName}.webm`));
  testInfo.annotations.push({ type: 'recording', description: `recordings/${jobName}.webm` });
}

export async function runRecording(
  page: Page,
  testInfo: TestInfo,
  jobName: string,
  run: () => Promise<void>,
): Promise<void> {
  try {
    await run();
    await pause(page, 1400);
  } finally {
    await saveJobVideo(page, testInfo, jobName);
  }
}

export async function dismissDialog(page: Page): Promise<void> {
  const cancel = page.getByRole('button', { name: /^Cancel$/i });
  if (await cancel.isVisible().catch(() => false)) {
    await cancel.click();
    await pause(page);
  }
}

export async function maybeClickFilters(page: Page): Promise<void> {
  const filters = page.getByRole('button', { name: /^Filters$/i }).first();
  if (!(await filters.isVisible().catch(() => false))) return;
  const expanded = await filters.getAttribute('aria-expanded');
  if (expanded !== 'true') {
    await filters.click();
    await pause(page);
  }
}

/** Remove a leftover walkthrough building so Create building can run again. Not shown in the UI. */
export async function deleteBuildingNamed(page: Page, name: string): Promise<void> {
  const response = await page.request.get('/api/buildings');
  if (!response.ok()) return;
  const json = (await response.json()) as {
    data?: { buildings?: Array<{ id: string; name: string }> };
  };
  const match = json.data?.buildings?.find((building) => building.name === name);
  if (!match) return;
  await page.request.delete(`/api/buildings/${match.id}`);
}

/** Sign in through NextAuth without showing the login page (off-camera setup). */
export async function loginViaCredentialsApi(
  page: Page,
  email: string,
  password: string,
  role?: string,
): Promise<void> {
  const csrfRes = await page.request.get('/api/auth/csrf');
  const csrfJson = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfJson.csrfToken) {
    throw new Error('Could not read CSRF token for API login');
  }
  await page.request.post('/api/auth/callback/credentials', {
    form: {
      csrfToken: csrfJson.csrfToken,
      email,
      password,
      ...(role ? { role } : {}),
      callbackUrl: '/',
      json: 'true',
    },
  });
  const sessionRes = await page.request.get('/api/auth/session');
  const session = (await sessionRes.json()) as { user?: { id?: string } };
  if (!session?.user?.id) {
    throw new Error(`API login failed for ${email}`);
  }
}

/** Create a throwaway occupied tenant with a known portal password. Not shown in the UI. */
export async function seedRecordingPortalTenant(
  page: Page,
  person: { firstName: string; lastName: string; email: string; password: string },
): Promise<{ tenantId: string; roomId: string }> {
  const admin = adminCredentials();
  await loginViaCredentialsApi(page, admin.email, admin.password, 'admin');
  const vacantRoom = await ensureVacantRecordingRoom(page, { forceCreate: true });
  const created = await page.request.post('/api/tenants', {
    data: {
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      password: person.password,
      createUserAccount: true,
      profileCompleted: false,
      sendInvitation: false,
    },
  });
  if (!created.ok()) {
    throw new Error(`Failed to seed portal tenant: ${created.status()} ${await created.text()}`);
  }
  const createdJson = (await created.json()) as { data?: { tenantId?: string; id?: string } };
  const tenantId = String(createdJson.data?.tenantId || createdJson.data?.id || '');
  if (!tenantId) {
    throw new Error('Portal tenant was created without an id');
  }
  const templatesRes = await page.request.get('/api/lease-package-templates');
  const templatesJson = (await templatesRes.json()) as {
    data?: Array<{ id: string; depositMonths?: number | null; advanceMonths?: number }>;
  };
  const templates = templatesJson.data || [];
  const template =
    templates.find((row) => row.depositMonths == null || row.depositMonths === 0) || templates[0];
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
    throw new Error(`Failed to assign portal tenant: ${assigned.status()} ${await assigned.text()}`);
  }
  await page.context().clearCookies();
  return { tenantId, roomId: vacantRoom.roomId };
}

export async function seedThrowawayOccupiedTenant(
  page: Page,
  person: { firstName: string; lastName: string; email: string },
): Promise<{ tenantId: string; roomId: string; buildingId: string; buildingName: string; roomNumber: string }> {
  const vacantRoom = await ensureVacantRecordingRoom(page, { forceCreate: true });
  const created = await page.request.post('/api/tenants', {
    data: {
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      buildingId: vacantRoom.buildingId,
      roomId: vacantRoom.roomId,
      monthlyRent: 4800,
      leaseStartDate: todayIso(),
      moveInDate: todayIso(),
      createUserAccount: false,
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
    templates.find((row) => row.depositMonths == null || row.depositMonths === 0) || templates[0];
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
  return {
    tenantId,
    roomId: vacantRoom.roomId,
    buildingId: vacantRoom.buildingId,
    buildingName: vacantRoom.buildingName,
    roomNumber: vacantRoom.roomNumber,
  };
}

export async function seedUnassignedRecordingTenant(
  page: Page,
  person: { firstName: string; lastName: string; email: string },
): Promise<{ tenantId: string }> {
  const created = await page.request.post('/api/tenants', {
    data: {
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      createUserAccount: false,
    },
  });
  if (!created.ok()) {
    throw new Error(`Failed to create unassigned tenant: ${created.status()} ${await created.text()}`);
  }
  const createdJson = (await created.json()) as { data?: { tenantId?: string; id?: string } };
  const tenantId = String(createdJson.data?.tenantId || createdJson.data?.id || '');
  if (!tenantId) {
    throw new Error('Unassigned tenant was created without an id');
  }
  return { tenantId };
}

/** Ensure a vacant rentable room exists for throwaway move-out occupancy. Not shown in the UI. */
export async function ensureVacantRecordingRoom(
  page: Page,
  opts?: { forceCreate?: boolean },
): Promise<{ buildingId: string; buildingName: string; roomId: string; roomNumber: string }> {
  const buildingsRes = await page.request.get('/api/buildings');
  const buildingsJson = (await buildingsRes.json()) as {
    data?: { buildings?: Array<{ id: string; name: string }> };
    buildings?: Array<{ id: string; name: string }>;
  };
  const buildings =
    buildingsJson.data?.buildings || buildingsJson.buildings || [];
  const ordered = [
    ...buildings.filter((row) => /BALIBAGO|VILLASOL|Recording Annex/i.test(row.name)),
    ...buildings.filter((row) => !/BALIBAGO|VILLASOL|Recording Annex/i.test(row.name)),
  ];

  for (const building of opts?.forceCreate ? [] : ordered) {
    const roomsRes = await page.request.get(
      `/api/rooms?buildingId=${encodeURIComponent(building.id)}&roomStatus=vacant&limit=500`,
    );
    if (!roomsRes.ok()) continue;
    const json = (await roomsRes.json()) as {
      data?: Array<{
        id?: string;
        roomNumber?: string;
        room_number?: string;
        monthlyRate?: number;
        monthly_rate?: number;
      }>;
    };
    const match = (json.data || []).find((room) => {
      const rate = Number(room.monthlyRate ?? room.monthly_rate ?? 0);
      const number = String(room.roomNumber || room.room_number || '');
      return Boolean(room.id) && rate > 0 && !/Admin|Store/i.test(number);
    });
    if (match?.id) {
      return {
        buildingId: building.id,
        buildingName: building.name,
        roomId: String(match.id),
        roomNumber: String(match.roomNumber || match.room_number || ''),
      };
    }
  }

  const building = ordered[0];
  if (!building) {
    throw new Error('No building available to create a move-out recording room');
  }
  const roomNumber = `MO-${Date.now().toString().slice(-6)}`;
  const create = await page.request.post('/api/rooms', {
    data: {
      buildingId: building.id,
      roomNumber,
      roomType: 'Studio',
      monthlyRate: 4800,
      roomStatus: 'vacant',
    },
  });
  if (!create.ok()) {
    throw new Error(`Failed to create recording room: ${create.status()}`);
  }
  const created = (await create.json()) as { data?: { id?: string; roomNumber?: string } };
  const roomId = String(created.data?.id || '');
  if (!roomId) {
    throw new Error('Recording room was created without an id');
  }
  return {
    buildingId: building.id,
    buildingName: building.name,
    roomId,
    roomNumber: created.data?.roomNumber || roomNumber,
  };
}
