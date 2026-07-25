#!/usr/bin/env node
/**
 * Real-browser UI cross-check of the core loop (Playwright).
 * Captures: page URL, button, API method/path, status, error body.
 */
import { chromium } from 'playwright';
import { createHash, randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:3030';
const TS = Date.now();
const EMAIL = `ui.browser.${TS}@parenta.com`;
const PASS = 'tenant123';
const OUT_DIR = `/tmp/ui-browser-smoke-${TS}`;
fs.mkdirSync(OUT_DIR, { recursive: true });

const report = [];
const apiLog = [];

function add(step, pageUrl, button, api, httpStatus, ok, error, extra = '') {
  const row = { step, pageUrl, button, api, httpStatus, ok, error, extra };
  report.push(row);
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${step} | ${button} | ${api || '-'} -> ${httpStatus ?? '-'} ${error ? '| ' + error : ''}`);
}

function attachNetwork(page) {
  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/api/')) return;
    let body = '';
    try {
      body = await res.text();
    } catch {
      body = '';
    }
    const u = new URL(url);
    apiLog.push({
      method: res.request().method(),
      path: u.pathname,
      status: res.status(),
      body: body.slice(0, 8000),
      page: page.url(),
    });
  });
}

async function waitForApiResponse(page, pathMatch, method = 'POST', timeout = 30000) {
  const res = await page.waitForResponse(
    (r) => {
      try {
        const u = new URL(r.url());
        if (r.request().method() !== method) return false;
        if (typeof pathMatch === 'string') return u.pathname === pathMatch || u.pathname.includes(pathMatch);
        return pathMatch.test(u.pathname);
      } catch {
        return false;
      }
    },
    { timeout }
  );
  const body = await res.text();
  return { status: res.status(), path: new URL(res.url()).pathname, body, method };
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

function setTenantPassword(email, password) {
  // Hash with bcrypt via node if available; else use app's seed pattern via psql + known hash from bcryptjs
  const script = `
    const bcrypt = require('bcryptjs');
    const { Client } = require('pg');
    (async () => {
      const hash = await bcrypt.hash(${JSON.stringify(password)}, 10);
      const c = new Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      const r = await c.query('UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email', [hash, ${JSON.stringify(email)}]);
      console.log(JSON.stringify(r.rows[0] || null));
      await c.end();
    })().catch(e => { console.error(e); process.exit(1); });
  `;
  const env = { ...process.env };
  // Prefer .env.local DATABASE_URL if shell doesn't have it
  if (!env.DATABASE_URL) {
    try {
      const raw = fs.readFileSync('.env.local', 'utf8');
      const m = raw.match(/^DATABASE_URL=(.*)$/m);
      if (m) env.DATABASE_URL = m[1].replace(/^["']|["']$/g, '');
    } catch {}
  }
  const r = spawnSync('node', ['-e', script], { cwd: process.cwd(), env, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`password reset failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout.trim();
}

async function main() {
  console.log('======== BROWSER UI CORE LOOP ========');
  console.log('OUT_DIR', OUT_DIR);
  console.log('TENANT_EMAIL', EMAIL);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  attachNetwork(page);

  let buildingId = null;
  let roomId = null;
  let tenantId = null;
  let statsBefore = null;

  try {
    // --- Admin sign-in ---
    await page.goto(`${BASE}/auth/admin/signin`, { waitUntil: 'networkidle' });
    await page.fill('#email', 'admin@parenta.com');
    await page.fill('#password', 'admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((url) => /\/admin(\/|$|\?)/.test(url.pathname) && !url.pathname.includes('/auth/'), {
      timeout: 20000,
    });
    await page.waitForLoadState('networkidle');
    await shot(page, '01-admin-dashboard');
    const onAdmin = /\/admin(\/|$|\?)/.test(new URL(page.url()).pathname) && !page.url().includes('/auth/');
    add('1-admin-signin', `${BASE}/auth/admin/signin`, 'Sign In', 'POST /api/auth/callback/credentials (via next-auth)', onAdmin ? 200 : 0, onAdmin, onAdmin ? null : `landed on ${page.url()}`);

    // Capture dashboard visible stats text
    const dashText = await page.locator('body').innerText();
    const welcome = /welcome back/i.test(dashText);
    add('1b-admin-dashboard-ui', page.url(), '(page load)', 'GET /admin (SSR stats)', 200, welcome, welcome ? null : 'Welcome back not visible');

    // Hit stats API via page evaluate for before snapshot
    statsBefore = await page.evaluate(async () => {
      const r = await fetch('/api/dashboard/stats');
      return { status: r.status, json: await r.json() };
    });
    add('1c-stats-before', page.url(), '(page data)', 'GET /api/dashboard/stats', statsBefore.status, statsBefore.json?.success === true, statsBefore.json?.error || null, JSON.stringify(statsBefore.json?.data?.summary || {}).slice(0, 200));

    // Widget APIs (real UI mounts)
    await page.waitForTimeout(1500);
    const widgetFails = apiLog.filter(
      (a) => a.path.startsWith('/api/admin/dashboard') && (a.status >= 400 || a.path === '/api/admin/dashboard')
    );
    for (const w of widgetFails) {
      add(
        `1d-widget-${w.path}`,
        page.url(),
        '(dashboard widget mount)',
        `${w.method} ${w.path}`,
        w.status,
        false,
        w.body.slice(0, 200)
      );
    }
    if (!widgetFails.length) {
      add('1d-dashboard-widgets', page.url(), '(widget mounts)', 'GET /api/admin/dashboard/*', 200, true, null);
    }

    // --- Create building via modal ---
    await page.goto(`${BASE}/admin/buildings`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /add building/i }).click();
    await page.waitForSelector('#building-form');
    await page.fill('#name', `Browser Smoke Tower ${TS}`);
    await page.fill('#addressLine1', '300 Browser Ave');
    await page.fill('#city', 'Manila');
    await page.fill('#state', 'NCR');
    await page.fill('#postalCode', '1000');
    const [bRes] = await Promise.all([
      waitForApiResponse(page, '/api/buildings', 'POST'),
      page.getByRole('button', { name: /^create building$/i }).click(),
    ]);
    let bOk = false;
    let bErr = null;
    try {
      const j = JSON.parse(bRes.body || '{}');
      bOk = j.success === true;
      bErr = bOk ? null : j.details || j.error || null;
      buildingId = j.data?.id || null;
    } catch {
      bOk = false;
      bErr = bRes.body?.slice(0, 200) || 'no response';
    }
    add('2-create-building', `${BASE}/admin/buildings`, 'Create Building', 'POST /api/buildings', bRes.status, bOk, bOk ? null : bErr, `buildingId=${buildingId}`);
    await shot(page, '02-building-created');

    // Wait for redirect to building detail
    if (buildingId) {
      await page.waitForURL(new RegExp(`/admin/buildings/${buildingId}`), { timeout: 15000 }).catch(() => {});
    } else {
      // try extract from URL
      const m = page.url().match(/\/admin\/buildings\/([0-9a-f-]+)/i);
      if (m) buildingId = m[1];
    }

    // --- Create room ---
    if (!buildingId) throw new Error('No buildingId — cannot continue room create');
    await page.goto(`${BASE}/admin/buildings/${buildingId}/rooms/new`, { waitUntil: 'networkidle' });
    await page.fill('#roomNumber', `BR-${String(TS).slice(-4)}`);
    await page.fill('#floorNumber', '2');
    await page.fill('#monthlyRate', '15000');
    await page.fill('#squareFootage', '30');
    const [rRes] = await Promise.all([
      waitForApiResponse(page, '/api/rooms', 'POST'),
      page.getByRole('button', { name: /create room/i }).click(),
    ]);
    let rOk = false;
    let rErr = null;
    try {
      const j = JSON.parse(rRes.body || '{}');
      rOk = j.success === true;
      rErr = rOk ? null : j.details || j.error || null;
      roomId = j.data?.id || null;
    } catch {
      rErr = rRes.body?.slice(0, 200) || 'no response';
    }
    add('3-create-room', page.url(), 'Create Room', 'POST /api/rooms', rRes.status, rOk, rOk ? null : rErr, `roomId=${roomId}`);
    await shot(page, '03-room-created');

    // --- Create tenant + assign ---
    await page.goto(`${BASE}/admin/tenants/new`, { waitUntil: 'networkidle' });
    await page.fill('#firstName', 'Browser');
    await page.fill('#lastName', 'Smoke');
    await page.fill('#email', EMAIL);
    await page.fill('#phone', '+639171112233');

    // Wait for buildings/rooms selects populated
    await page.waitForFunction(() => {
      const b = document.querySelector('#buildingId');
      return b && b.options && b.options.length > 1;
    }, { timeout: 15000 });

    await page.selectOption('#buildingId', buildingId);
    await page.waitForFunction(
      (rid) => {
        const r = document.querySelector('#roomId');
        if (!r) return false;
        return [...r.options].some((o) => o.value === rid);
      },
      roomId,
      { timeout: 15000 }
    );
    await page.selectOption('#roomId', roomId);

    // lease dates if present
    if (await page.locator('#leaseStartDate').count()) {
      await page.fill('#leaseStartDate', '2026-07-26');
    }
    if (await page.locator('#leaseEndDate').count()) {
      await page.fill('#leaseEndDate', '2027-07-26');
    }

    // Clear api log marker length for assign pairing
    const beforeLen = apiLog.length;
    await page.getByRole('button', { name: /create tenant/i }).click();

    // Wait for tenants POST and optional assign POST
    await page.waitForTimeout(500);
    let tApi = null;
    let aApi = null;
    for (let i = 0; i < 100; i++) {
      const recent = apiLog.slice(beforeLen);
      tApi = recent.find((a) => a.method === 'POST' && a.path === '/api/tenants') || tApi;
      aApi = recent.find((a) => a.method === 'POST' && a.path.includes('/assign')) || aApi;
      if (tApi && (aApi || i > 40)) break;
      await page.waitForTimeout(100);
    }

    let tOk = false;
    let tErr = null;
    try {
      const j = JSON.parse(tApi?.body || '{}');
      tOk = j.success === true;
      tErr = j.details || j.error || null;
      tenantId = j.data?.id || j.data?.tenantId || null;
    } catch {
      tErr = tApi?.body?.slice(0, 200) || 'no tenant POST response';
    }
    add('4-create-tenant', `${BASE}/admin/tenants/new`, 'Create Tenant', 'POST /api/tenants', tApi?.status ?? 0, tOk, tOk ? null : tErr, `tenantId=${tenantId}`);

    let aOk = false;
    let aErr = null;
    if (aApi) {
      try {
        const j = JSON.parse(aApi.body || '{}');
        aOk = j.success === true;
        aErr = j.details || j.error || null;
      } catch {
        aErr = aApi.body?.slice(0, 200);
      }
      add('5-assign-room', `${BASE}/admin/tenants/new`, 'Create Tenant (assign step)', `POST ${aApi.path}`, aApi.status, aOk, aOk ? null : aErr);
    } else {
      add('5-assign-room', `${BASE}/admin/tenants/new`, 'Create Tenant (assign step)', 'POST /api/rooms/{id}/assign', 0, false, 'assign API never called (tenant create may have failed, or no room selected)');
    }
    await shot(page, '04-tenant-created');

    // UI gap: no password field — random password generated server-side
    add(
      '4b-tenant-password-ui-gap',
      `${BASE}/admin/tenants/new`,
      'Create Tenant',
      'POST /api/tenants',
      tApi?.status ?? 0,
      false,
      'UI does not collect/show tenant password; API generates random password and does not return it — new tenant cannot log in via UI alone'
    );

    // Reset password so we can continue tenant portal check
    if (tOk) {
      try {
        const reset = setTenantPassword(EMAIL, PASS);
        add('4c-password-reset-db', '(ops workaround)', '(DB password_hash update)', 'SQL UPDATE users', 200, true, null, reset.slice(0, 120));
      } catch (e) {
        add('4c-password-reset-db', '(ops workaround)', '(DB password_hash update)', 'SQL UPDATE users', 0, false, String(e));
      }
    }

    // --- Manual invoice ---
    await page.goto(`${BASE}/admin/financial/invoices/new`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#tenantId');
    await page.waitForFunction(() => document.querySelector('#tenantId')?.options?.length > 1, { timeout: 15000 });
    if (tenantId) {
      await page.selectOption('#tenantId', tenantId);
    } else {
      // select by email text
      await page.selectOption('#tenantId', { label: new RegExp('Browser Smoke') });
    }
    await page.waitForTimeout(800);
    // room may auto-populate
    if (roomId && (await page.locator('#roomId option').count()) > 1) {
      const has = await page.locator(`#roomId option[value="${roomId}"]`).count();
      if (has) await page.selectOption('#roomId', roomId);
      else await page.selectOption('#roomId', { index: 1 });
    }
    await page.fill('#dueDate', '2026-08-15');
    // Invoice line items use unlabeled controlled inputs (no htmlFor) — target by placeholder / adjacent label
    await page.getByPlaceholder('Item description').fill('Monthly rent');
    const unitPriceInput = page.locator('label:has-text("Unit Price")').locator('..').locator('input');
    await unitPriceInput.fill('15000');
    const qtyInput = page.locator('label:has-text("Quantity")').locator('..').locator('input');
    if (await qtyInput.count()) await qtyInput.fill('1');

    const invBefore = apiLog.length;
    await page.getByRole('button', { name: /create invoice/i }).click();
    await page.waitForTimeout(2000);
    const invApi = apiLog.slice(invBefore).find((a) => a.method === 'POST' && a.path === '/api/invoices');
    let invOk = false;
    let invErr = null;
    try {
      const j = JSON.parse(invApi?.body || '{}');
      invOk = j.success === true;
      invErr = j.details || j.error || null;
    } catch {
      invErr = invApi?.body?.slice(0, 200) || 'no invoice POST — check validation UI';
    }
    // Also capture visible form errors
    const invPageErr = await page.locator('.text-red-600, .bg-red-50, [role="alert"]').allTextContents().catch(() => []);
    if (!invOk && invPageErr.length) invErr = (invErr || '') + ' | UI: ' + invPageErr.join(' | ').slice(0, 200);
    add('6-create-invoice', `${BASE}/admin/financial/invoices/new`, 'Create Invoice', 'POST /api/invoices', invApi?.status ?? 0, invOk, invOk ? null : invErr);
    await shot(page, '05-invoice');

    // --- Record payment ---
    await page.goto(`${BASE}/admin/financial/payments/new`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#tenantId');
    await page.waitForFunction(() => document.querySelector('#tenantId')?.options?.length > 1, { timeout: 15000 });
    if (tenantId) await page.selectOption('#tenantId', tenantId);
    await page.fill('#amount', '15000');
    if (await page.locator('#paymentMethod').count()) await page.selectOption('#paymentMethod', 'cash');
    if (await page.locator('#type').count()) await page.selectOption('#type', 'rent');
    else if (await page.locator('#paymentType').count()) await page.selectOption('#paymentType', 'rent');
    const payBefore = apiLog.length;
    await page.getByRole('button', { name: /record payment/i }).click();
    await page.waitForTimeout(2500);
    const payApi = apiLog.slice(payBefore).find((a) => a.method === 'POST' && a.path === '/api/payments');
    let payOk = false;
    let payErr = null;
    try {
      const j = JSON.parse(payApi?.body || '{}');
      payOk = j.success === true;
      payErr = j.details || j.error || null;
    } catch {
      payErr = payApi?.body?.slice(0, 200) || 'no payment POST';
    }
    const payUiErr = await page.locator('.text-red-600, .bg-red-50').allTextContents().catch(() => []);
    if (!payOk && payUiErr.length) payErr = (payErr || '') + ' | UI: ' + payUiErr.join(' ').slice(0, 200);
    add('7-record-payment', `${BASE}/admin/financial/payments/new`, 'Record Payment', 'POST /api/payments', payApi?.status ?? 0, payOk, payOk ? null : payErr);
    await shot(page, '06-payment');

    // --- Dashboard stats after ---
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    const statsAfter = await page.evaluate(async () => {
      const r = await fetch('/api/dashboard/stats');
      return { status: r.status, json: await r.json() };
    });
    const before = statsBefore?.json?.data || {};
    const after = statsAfter?.json?.data || {};
    const delta = {
      buildings: [before.buildings?.total, after.buildings?.total],
      tenants: [before.tenants?.total, after.tenants?.total],
      paidPayments: [before.financial?.paidPayments, after.financial?.paidPayments],
      totalRevenue: [before.financial?.totalRevenue, after.financial?.totalRevenue],
      occupied: [before.rooms?.occupied, after.rooms?.occupied],
    };
    const statsOk =
      (delta.buildings[1] ?? 0) > (delta.buildings[0] ?? 0) &&
      (delta.tenants[1] ?? 0) > (delta.tenants[0] ?? 0);
    add('8-stats-delta', `${BASE}/admin`, '(verify dashboard)', 'GET /api/dashboard/stats', statsAfter.status, statsOk, statsOk ? null : `stats did not increase: ${JSON.stringify(delta)}`, JSON.stringify(delta));
    await shot(page, '07-dashboard-after');

    // --- Tenant portal ---
    await context.clearCookies();
    const tenantPage = await context.newPage();
    attachNetwork(tenantPage);

    await tenantPage.goto(`${BASE}/auth/tenant/signin`, { waitUntil: 'networkidle' });
    await tenantPage.fill('#email', EMAIL);
    await tenantPage.fill('#password', PASS);
    await tenantPage.getByRole('button', { name: /sign in/i }).click();
    await tenantPage
      .waitForURL((url) => url.pathname.startsWith('/tenant') && !url.pathname.includes('/auth/'), {
        timeout: 20000,
      })
      .catch(() => {});
    await tenantPage.waitForTimeout(1500);
    const tenantLanded = /\/tenant/.test(tenantPage.url()) && !/signin/.test(tenantPage.url());
    const tenantErr = await tenantPage.locator('.text-red-800, .text-red-600, .bg-red-50').allTextContents().catch(() => []);
    add(
      '9-tenant-signin',
      `${BASE}/auth/tenant/signin`,
      'Sign In',
      'POST /api/auth/callback/credentials (via next-auth)',
      tenantLanded ? 200 : 0,
      tenantLanded,
      tenantLanded ? null : `landed=${tenantPage.url()} ui=${tenantErr.join(' ').slice(0, 200)}`
    );
    await shot(tenantPage, '08-tenant-home');

    if (tenantLanded) {
      // Home data APIs
      await tenantPage.waitForTimeout(1500);
      const prof = apiLog.filter((a) => a.path === '/api/tenant/profile').slice(-1)[0];
      const pays = apiLog.filter((a) => a.path === '/api/tenant/payments').slice(-1)[0];
      add('9b-tenant-home-profile-api', tenantPage.url(), '(page data)', 'GET /api/tenant/profile', prof?.status ?? 0, (prof?.status ?? 0) < 400 && !/success":false/.test(prof?.body || ''), prof?.body?.slice(0, 150));
      add('9c-tenant-home-payments-api', tenantPage.url(), '(page data)', 'GET /api/tenant/payments', pays?.status ?? 0, (pays?.status ?? 0) < 400, pays?.body?.slice(0, 150));

      const homeText = await tenantPage.locator('body').innerText();
      const homeOk = /welcome|payment|maintenance|browser/i.test(homeText) && !/this page could not be found/i.test(homeText);
      add('9d-tenant-home-ui', tenantPage.url(), '(page load)', 'GET /tenant', 200, homeOk, homeOk ? null : `sparse/error UI: ${homeText.slice(0, 200)}`);

      // Profile
      await tenantPage.goto(`${BASE}/tenant/profile`, { waitUntil: 'networkidle' });
      await tenantPage.waitForTimeout(1500);
      const profileText = await tenantPage.locator('body').innerText();
      const profileOk = /profile|browser|smoke|email/i.test(profileText);
      const pApi = apiLog.filter((a) => a.path === '/api/tenant/profile').slice(-1)[0];
      add('10-tenant-profile-ui', tenantPage.url(), '(page load)', 'GET /tenant/profile', 200, profileOk, profileOk ? null : profileText.slice(0, 200));
      add('10b-tenant-profile-api', tenantPage.url(), '(page data)', 'GET /api/tenant/profile', pApi?.status ?? 0, (pApi?.status ?? 0) < 400, null);
      await shot(tenantPage, '09-tenant-profile');

      // Payments
      await tenantPage.goto(`${BASE}/tenant/payments`, { waitUntil: 'networkidle' });
      await tenantPage.waitForTimeout(1500);
      const payText = await tenantPage.locator('body').innerText();
      const payUiOk = /payment|invoice|balance|₱|php/i.test(payText);
      const tpApi = apiLog.filter((a) => a.path === '/api/tenant/payments').slice(-1)[0];
      add('11-tenant-payments-ui', tenantPage.url(), '(page load)', 'GET /tenant/payments', 200, payUiOk, payUiOk ? null : payText.slice(0, 200));
      add('11b-tenant-payments-api', tenantPage.url(), '(page data)', 'GET /api/tenant/payments', tpApi?.status ?? 0, (tpApi?.status ?? 0) < 400, null);
      await shot(tenantPage, '10-tenant-payments');

      // Maintenance
      await tenantPage.goto(`${BASE}/tenant/maintenance`, { waitUntil: 'networkidle' });
      await tenantPage.waitForTimeout(1000);
      await tenantPage.getByRole('button', { name: /new request/i }).click();
      await tenantPage.fill('#title', 'Browser UI leak');
      await tenantPage.selectOption('#category', 'plumbing');
      await tenantPage.selectOption('#priority', 'medium');
      await tenantPage.fill('#description', 'Faucet dripping — browser UI core loop');
      const mBefore = apiLog.length;
      await tenantPage.getByRole('button', { name: /submit request/i }).click();
      await tenantPage.waitForTimeout(2000);
      const mApi = apiLog.slice(mBefore).find((a) => a.method === 'POST' && a.path === '/api/tenant/maintenance');
      let mOk = false;
      let mErr = null;
      try {
        const j = JSON.parse(mApi?.body || '{}');
        mOk = j.success === true;
        mErr = j.details || j.error || null;
      } catch {
        mErr = mApi?.body?.slice(0, 200) || 'no maintenance POST';
      }
      add('12-submit-maintenance', `${BASE}/tenant/maintenance`, 'Submit Request', 'POST /api/tenant/maintenance', mApi?.status ?? 0, mOk, mOk ? null : mErr);
      await shot(tenantPage, '11-tenant-maintenance');
    }
  } catch (e) {
    add('FATAL', page.url(), '(uncaught)', '-', 0, false, String(e));
    await shot(page, 'fatal').catch(() => {});
  }

  await browser.close();

  const fails = report.filter((r) => !r.ok);
  const out = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(out, JSON.stringify({ EMAIL, PASS, buildingId, roomId, tenantId, report, apiLog }, null, 2));

  console.log('\n======== BROWSER UI REPORT ========');
  console.log(`TOTAL ${report.length} | PASS ${report.length - fails.length} | FAIL ${fails.length}`);
  console.log(`${'STEP'.padEnd(28)} ${'HTTP'.padEnd(5)} ${'OK'.padEnd(5)} ${'BUTTON'.padEnd(32)} ${'API'.padEnd(42)} ERROR`);
  console.log('-'.repeat(180));
  for (const r of report) {
    console.log(
      `${r.step.slice(0, 27).padEnd(28)} ${String(r.httpStatus ?? '').padEnd(5)} ${String(r.ok).padEnd(5)} ${r.button.slice(0, 31).padEnd(32)} ${(r.api || '').slice(0, 41).padEnd(42)} ${(r.error || '').slice(0, 80)}`
    );
  }
  if (fails.length) {
    console.log('\nFAILURES:');
    for (const f of fails) console.log(JSON.stringify(f, null, 2));
  }
  console.log(`\nWrote ${out}`);
  console.log(`Screenshots: ${OUT_DIR}`);
  const blocking = fails.filter((f) => f.step !== '4b-tenant-password-ui-gap');
  process.exit(blocking.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
