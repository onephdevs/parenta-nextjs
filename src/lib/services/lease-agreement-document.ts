/**
 * Templated residential lease agreement.
 *
 * Generates branded HTML with dynamic data binding and conditional sections.
 * While DRAFT (auto-generated HTML), content regenerates when lease data changes.
 * Once a signed PDF/upload replaces it, the generated snapshot locks.
 */

import fs from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';
import pool from '@/lib/db';
import { createDocument } from '@/lib/api/documents';
import { getBuildingDepositConfig } from '@/lib/api/building-deposit-config';
import { getAllLateFeeSettings } from '@/lib/services/late-fee-service';
import { LANDLORD_COMPANY_NAME } from '@/lib/brand';

export const AUTO_GENERATED_LEASE_TAG = 'auto-generated-lease';
export const AUTO_GENERATED_LEASE_DESC =
  'Auto-generated lease draft — regenerate until a signed PDF is uploaded';

export interface LeaseOccupant {
  name: string;
  role: 'Primary' | 'Co-signer' | 'Occupant';
  relationship?: string | null;
  email?: string | null;
}

export interface LeaseAgreementInput {
  tenantId: string;
  pipelineCardId?: string | null;
  buildingId?: string | null;
  roomId?: string | null;
  tenantName: string;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  buildingName: string;
  buildingAddress?: string | null;
  roomNumber: string;
  monthlyRent: number;
  depositPaid: number;
  advancePaid: number;
  leaseStartDate: string;
  leaseEndDate?: string | null;
  moveInDate?: string | null;
  uploadedBy?: string | null;
  /** Day of month rent is due (default 5). */
  rentDueDay?: number;
  /** From building deposit config — shared source of truth with Edit Building. */
  depositValidityDays?: number;
  depositRefundableAfterDays?: number;
  /** From late_fee_settings for the building. */
  lateFeeGracePeriodDays?: number;
  lateFeeLabel?: string | null;
  /** Optional building policies — omit section when empty. */
  petPolicy?: string | null;
  houseRules?: string | null;
  customClauses?: string[];
  occupants?: LeaseOccupant[];
  documentId?: string | null;
  companyName?: string;
  /** When false, omit draft banner (locked historical snapshot). */
  isDraft?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDisplayDate(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ordinalDay(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}

function brandBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3030'
  ).replace(/\/$/, '');
}

function formatLateFeeSentence(
  graceDays: number,
  feeLabel: string | null | undefined
): string {
  const grace = `${graceDays} day${graceDays === 1 ? '' : 's'}`;
  if (feeLabel) {
    return `Payments received after a ${grace} grace period may incur late fees (${escapeHtml(feeLabel)}), as configured for this property.`;
  }
  return `Payments received after a ${grace} grace period may incur late fees as configured for this property.`;
}

function formatDepositSentence(
  validityDays: number,
  refundableAfterDays: number
): string {
  const validity = `${validityDays} day${validityDays === 1 ? '' : 's'}`;
  const refund = `${refundableAfterDays} day${refundableAfterDays === 1 ? '' : 's'}`;
  return `The security deposit remains refundable for ${validity} from lease start (Deposit Validity Rules). After ${refund}, the deposit may become non-refundable per building policy. Remaining refundable balance is settled at move-out after lawful deductions for unpaid rent, utilities, and damage beyond normal wear and tear.`;
}

/**
 * Build branded lease HTML from bound data + conditional sections.
 * Tokens are resolved in code (not left as {{placeholders}} in output).
 */
export function buildLeaseHtml(input: LeaseAgreementInput): string {
  const company = escapeHtml(input.companyName || LANDLORD_COMPANY_NAME);
  const tenantName = escapeHtml(input.tenantName);
  const buildingName = escapeHtml(input.buildingName);
  const roomNumber = escapeHtml(input.roomNumber);
  const endLabel = input.leaseEndDate
    ? formatDisplayDate(input.leaseEndDate)
    : 'Open-ended';
  const moveIn = input.moveInDate
    ? formatDisplayDate(input.moveInDate)
    : formatDisplayDate(input.leaseStartDate);
  const rentDueDay = input.rentDueDay ?? 5;
  const depositValidityDays = input.depositValidityDays ?? 5;
  const depositRefundableAfterDays =
    input.depositRefundableAfterDays ?? depositValidityDays;
  const lateFeeGrace = input.lateFeeGracePeriodDays ?? 5;
  const isDraft = input.isDraft !== false;
  const docId = input.documentId
    ? escapeHtml(input.documentId)
    : 'Pending assignment';
  const logoUrl = `${brandBaseUrl()}/brand/widelogo.png`;
  const generatedAt = new Date().toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const addressBlock = input.buildingAddress
    ? `<tr><td>Address</td><td>${escapeHtml(input.buildingAddress)}</td></tr>`
    : '';

  const coOccupants = (input.occupants || []).filter(
    (o) => o.role !== 'Primary'
  );
  const occupantsSection =
    coOccupants.length > 0
      ? `
  <h2>Occupants</h2>
  <p class="muted">Additional persons authorized to occupy the premises.</p>
  <table class="occupants">
    <thead>
      <tr><th>Name</th><th>Role</th><th>Relationship</th></tr>
    </thead>
    <tbody>
      ${coOccupants
        .map(
          (o) => `<tr>
        <td>${escapeHtml(o.name)}</td>
        <td><span class="badge">${escapeHtml(o.role)}</span></td>
        <td>${escapeHtml(o.relationship || '—')}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>`
      : '';

  const petSection = input.petPolicy?.trim()
    ? `
  <h2>Pet policy</h2>
  <p>${escapeHtml(input.petPolicy.trim())}</p>`
    : '';

  const houseRulesSection = input.houseRules?.trim()
    ? `
  <h2>House rules</h2>
  <p>${escapeHtml(input.houseRules.trim())}</p>`
    : '';

  const customClauses = (input.customClauses || []).filter((c) => c.trim());
  const customSection =
    customClauses.length > 0
      ? `
  <h2>Additional clauses</h2>
  <ol class="clauses">
    ${customClauses.map((c) => `<li>${escapeHtml(c.trim())}</li>`).join('')}
  </ol>`
      : '';

  const draftBanner = isDraft
    ? `
  <div class="draft-banner" role="status">
    <div class="draft-icon" aria-hidden="true">⚠</div>
    <div>
      <strong>DRAFT — Not valid until signed</strong>
      <p>This is a system-generated preview of lease terms. It is not a binding contract until both parties sign, or a signed PDF is uploaded.</p>
    </div>
  </div>
  <div class="watermark" aria-hidden="true">DRAFT</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lease Agreement — ${tenantName}</title>
  <style>
    :root {
      --ink: #1a1a1a;
      --muted: #5c5c5c;
      --line: #e5e2dc;
      --accent: #1e3a5f;
      --accent-soft: #eef3f8;
      --draft: #92400e;
      --draft-bg: #fffbeb;
      --draft-border: #f59e0b;
      --key-bg: #f0f7f4;
      --key-border: #0d6e4f;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 28px 64px;
      color: var(--ink);
      line-height: 1.55;
      background: #fff;
      position: relative;
    }
    .letterhead {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 2px solid var(--accent);
      margin-bottom: 1.5rem;
    }
    .brand img {
      height: 36px;
      width: auto;
      display: block;
    }
    .brand .fallback {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.02em;
    }
    .doc-meta {
      text-align: right;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.75rem;
      color: var(--muted);
      line-height: 1.45;
    }
    .doc-meta strong { color: var(--ink); font-weight: 600; }
    h1 {
      font-size: 1.65rem;
      text-align: center;
      margin: 0.5rem 0 0.35rem;
      letter-spacing: 0.04em;
      font-weight: 700;
      color: var(--accent);
    }
    .subtitle {
      text-align: center;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.85rem;
      color: var(--muted);
      margin: 0 0 1.5rem;
    }
    .draft-banner {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
      background: var(--draft-bg);
      border: 2px solid var(--draft-border);
      border-radius: 8px;
      padding: 0.9rem 1rem;
      margin-bottom: 1.75rem;
      font-family: system-ui, -apple-system, sans-serif;
      color: var(--draft);
    }
    .draft-banner strong {
      display: block;
      font-size: 0.95rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 0.2rem;
    }
    .draft-banner p { margin: 0; font-size: 0.85rem; line-height: 1.4; }
    .draft-icon { font-size: 1.35rem; line-height: 1; }
    .watermark {
      position: fixed;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-size: 7rem;
      font-weight: 800;
      font-family: system-ui, sans-serif;
      color: rgba(245, 158, 11, 0.08);
      letter-spacing: 0.2em;
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }
    .content { position: relative; z-index: 1; }
    h2 {
      font-size: 0.95rem;
      font-family: system-ui, -apple-system, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      margin: 1.75rem 0 0.65rem;
      padding-bottom: 0.35rem;
      border-bottom: 1px solid var(--line);
    }
    table { width: 100%; border-collapse: collapse; margin: 0.4rem 0; }
    td { padding: 0.4rem 0; vertical-align: top; font-size: 0.95rem; }
    td:first-child {
      width: 38%;
      color: var(--muted);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.82rem;
    }
    .key-terms {
      background: var(--key-bg);
      border: 1px solid #b8d9cc;
      border-left: 4px solid var(--key-border);
      border-radius: 8px;
      padding: 1.1rem 1.25rem;
      margin: 1rem 0 0.5rem;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .key-terms .item { text-align: center; }
    .key-terms .label {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--muted);
      margin-bottom: 0.25rem;
    }
    .key-terms .value {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--key-border);
      letter-spacing: -0.01em;
    }
    .dates-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin: 0.75rem 0 0.25rem;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.82rem;
    }
    .dates-row .box {
      background: var(--accent-soft);
      border-radius: 6px;
      padding: 0.65rem 0.75rem;
    }
    .dates-row .box span {
      display: block;
      color: var(--muted);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.15rem;
    }
    .dates-row .box strong { color: var(--ink); font-size: 0.9rem; }
    .muted { color: var(--muted); font-size: 0.88rem; }
    p { margin: 0.5rem 0; }
    .occupants th {
      text-align: left;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--line);
    }
    .occupants td {
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--line);
      font-size: 0.92rem;
    }
    .occupants td:first-child { width: auto; color: var(--ink); font-family: inherit; font-size: inherit; }
    .badge {
      display: inline-block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--accent-soft);
      color: var(--accent);
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .clauses { padding-left: 1.25rem; margin: 0.5rem 0; }
    .clauses li { margin: 0.4rem 0; }
    .sign {
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      margin-top: 2.5rem;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.82rem;
    }
    .sign div {
      flex: 1;
      border-top: 1px solid var(--ink);
      padding-top: 0.5rem;
      margin-top: 3.25rem;
      color: var(--muted);
    }
    .footer {
      margin-top: 2.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.72rem;
      color: var(--muted);
      text-align: center;
    }
    @media print {
      body { padding: 16px; }
      .watermark { display: none; }
      .draft-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    @media (max-width: 640px) {
      .key-terms, .dates-row, .sign { grid-template-columns: 1fr; display: grid; }
      .letterhead { flex-direction: column; }
      .doc-meta { text-align: left; }
    }
  </style>
</head>
<body>
  ${draftBanner}
  <div class="content">
  <header class="letterhead">
    <div class="brand">
      <img src="${logoUrl}" alt="${company}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'" />
      <div class="fallback" style="display:none">${company}</div>
    </div>
    <div class="doc-meta">
      <div><strong>Doc ID</strong><br />${docId}</div>
      <div style="margin-top:0.5rem">Generated ${escapeHtml(generatedAt)}</div>
    </div>
  </header>

  <h1>Residential Lease Agreement</h1>
  <p class="subtitle">${company}</p>

  <h2>Parties</h2>
  <table>
    <tr><td>Tenant (Primary)</td><td><strong>${tenantName}</strong></td></tr>
    <tr><td>Email</td><td>${escapeHtml(input.tenantEmail || '—')}</td></tr>
    <tr><td>Phone</td><td>${escapeHtml(input.tenantPhone || '—')}</td></tr>
    <tr><td>Landlord / Manager</td><td>${company}</td></tr>
  </table>

  <h2>Property</h2>
  <table>
    <tr><td>Building</td><td><strong>${buildingName}</strong></td></tr>
    <tr><td>Unit</td><td>${roomNumber}</td></tr>
    ${addressBlock}
  </table>

  <h2>Key financial terms</h2>
  <div class="key-terms">
    <div class="item">
      <div class="label">Monthly rent</div>
      <div class="value">${formatPhp(input.monthlyRent)}</div>
    </div>
    <div class="item">
      <div class="label">Security deposit</div>
      <div class="value">${formatPhp(input.depositPaid)}</div>
    </div>
    <div class="item">
      <div class="label">Advance rent</div>
      <div class="value">${formatPhp(input.advancePaid)}</div>
    </div>
  </div>

  <div class="dates-row">
    <div class="box"><span>Lease start</span><strong>${formatDisplayDate(input.leaseStartDate)}</strong></div>
    <div class="box"><span>Lease end</span><strong>${endLabel}</strong></div>
    <div class="box"><span>Move-in</span><strong>${moveIn}</strong></div>
  </div>

  ${occupantsSection}

  <h2>Payment &amp; deposit policy</h2>
  <p>Monthly rent is due on the <strong>${ordinalDay(rentDueDay)}</strong> of each month. Advance rent is applied to the first full month of occupancy.</p>
  <p>${formatLateFeeSentence(lateFeeGrace, input.lateFeeLabel)}</p>
  <p>${formatDepositSentence(depositValidityDays, depositRefundableAfterDays)}</p>

  <h2>Term, renewal &amp; termination</h2>
  <p>${
    input.leaseEndDate
      ? `This lease runs from ${formatDisplayDate(input.leaseStartDate)} through ${formatDisplayDate(input.leaseEndDate)}. Either party may propose renewal in writing before the end date. Early termination requires written notice and remains subject to applicable fees and deposit deductions.`
      : `This lease begins on ${formatDisplayDate(input.leaseStartDate)} and continues on a month-to-month basis until terminated by either party with written notice of at least thirty (30) days, unless a longer notice period is required by law or building policy.`
  }</p>

  ${petSection}
  ${houseRulesSection}
  ${customSection}

  <h2>Signatures</h2>
  <p class="muted">By signing, the parties acknowledge they have read and agree to the terms above.</p>
  <div class="sign">
    <div>Landlord / authorized representative<br />Signature &amp; date</div>
    <div>Tenant (Primary)<br />Signature &amp; date</div>
    <div>Witness<br />Signature &amp; date</div>
  </div>

  <footer class="footer">
    ${company} · Document ID ${docId}
    ${isDraft ? ' · DRAFT — not binding until signed' : ' · Executed copy on file'}
  </footer>
  </div>
</body>
</html>`;
}

async function storeHtmlFile(
  html: string,
  existingRelativePath?: string | null
): Promise<{ filePath: string; fileSize: number }> {
  const buffer = Buffer.from(html, 'utf8');

  // Overwrite existing local draft when regenerating
  if (
    existingRelativePath &&
    !existingRelativePath.startsWith('http://') &&
    !existingRelativePath.startsWith('https://')
  ) {
    const relative = existingRelativePath.replace(/^\//, '');
    const fullPath = path.join(process.cwd(), 'public', relative);
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, buffer);
      return { filePath: existingRelativePath.startsWith('/') ? existingRelativePath : `/${existingRelativePath}`, fileSize: buffer.length };
    } catch (err) {
      console.warn('Could not overwrite existing lease draft file:', err);
    }
  }

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const storageFileName = `${timestamp}-${randomSuffix}.html`;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    try {
      const blob = await put(`documents/${storageFileName}`, buffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'text/html; charset=utf-8',
        token: blobToken,
      });
      return { filePath: blob.url, fileSize: buffer.length };
    } catch (err) {
      console.warn('Lease agreement blob upload failed, using local file:', err);
    }
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, storageFileName), buffer);
  return {
    filePath: `/uploads/documents/${storageFileName}`,
    fileSize: buffer.length,
  };
}

async function enrichLeaseInput(
  input: LeaseAgreementInput
): Promise<LeaseAgreementInput> {
  const enriched: LeaseAgreementInput = {
    ...input,
    rentDueDay: input.rentDueDay ?? 5,
    isDraft: input.isDraft !== false,
    occupants: input.occupants ? [...input.occupants] : [],
  };

  // Always include primary tenant in occupants list for consistency
  const hasPrimary = enriched.occupants!.some((o) => o.role === 'Primary');
  if (!hasPrimary) {
    enriched.occupants!.unshift({
      name: input.tenantName,
      role: 'Primary',
      email: input.tenantEmail,
    });
  }

  if (input.buildingId) {
    try {
      const [depositConfig, lateFees, buildingRow] = await Promise.all([
        getBuildingDepositConfig(input.buildingId).catch(() => null),
        getAllLateFeeSettings(input.buildingId).catch(() => []),
        pool
          .query<{
            name: string;
            address_line1: string;
            address_line2: string | null;
            city: string;
            state: string;
            postal_code: string;
            description: string | null;
          }>(
            `SELECT name, address_line1, address_line2, city, state, postal_code, description
             FROM buildings WHERE id = $1`,
            [input.buildingId]
          )
          .catch(() => null),
      ]);

      if (depositConfig) {
        enriched.depositValidityDays =
          input.depositValidityDays ?? depositConfig.depositValidityDays;
        enriched.depositRefundableAfterDays =
          input.depositRefundableAfterDays ??
          depositConfig.depositRefundableAfterDays;
      }

      const activeLateFee = lateFees.find((s) => s.is_active) || lateFees[0];
      if (activeLateFee) {
        enriched.lateFeeGracePeriodDays =
          input.lateFeeGracePeriodDays ?? activeLateFee.grace_period_days;
        if (!input.lateFeeLabel) {
          const parts: string[] = [];
          if (activeLateFee.fee_type === 'flat_rate' && activeLateFee.flat_rate_amount != null) {
            parts.push(formatPhp(Number(activeLateFee.flat_rate_amount)));
          } else if (
            activeLateFee.fee_type === 'percentage' &&
            activeLateFee.percentage_amount != null
          ) {
            parts.push(`${activeLateFee.percentage_amount}% of outstanding rent`);
          } else if (activeLateFee.fee_type === 'tiered') {
            parts.push('tiered schedule');
          }
          enriched.lateFeeLabel =
            parts.length > 0
              ? `${activeLateFee.name}: ${parts.join(', ')}`
              : activeLateFee.name;
        }
      }

      const b = buildingRow?.rows[0];
      if (b) {
        if (!input.buildingAddress) {
          enriched.buildingAddress = [
            b.address_line1,
            b.address_line2,
            `${b.city}, ${b.state} ${b.postal_code}`,
          ]
            .filter(Boolean)
            .join(', ');
        }
        // Use building description as house rules when caller didn't supply any
        if (!input.houseRules && b.description?.trim()) {
          enriched.houseRules = b.description.trim();
        }
      }
    } catch (err) {
      console.warn('Lease enrich from building settings failed:', err);
    }
  }

  // Load co-occupants from DB when not provided
  if (
    input.tenantId &&
    input.roomId &&
    !(input.occupants && input.occupants.some((o) => o.role !== 'Primary'))
  ) {
    try {
      const occ = await pool.query<{
        first_name: string;
        last_name: string;
        email: string | null;
        relationship_to_tenant: string | null;
      }>(
        `SELECT first_name, last_name, email, relationship_to_tenant
         FROM occupants
         WHERE tenant_id = $1 AND room_id = $2 AND COALESCE(is_active, true) = true
         ORDER BY created_at ASC`,
        [input.tenantId, input.roomId]
      );
      for (const row of occ.rows) {
        const name = `${row.first_name || ''} ${row.last_name || ''}`.trim();
        if (!name) continue;
        enriched.occupants!.push({
          name,
          role: 'Occupant',
          relationship: row.relationship_to_tenant,
          email: row.email,
        });
      }
    } catch (err) {
      console.warn('Lease occupants load failed:', err);
    }
  }

  return enriched;
}

function isAutoGeneratedLeaseDoc(doc: {
  mime_type?: string | null;
  mimeType?: string | null;
  description?: string | null;
  tags?: string[] | null;
}): boolean {
  const mime = (doc.mime_type || doc.mimeType || '').toLowerCase();
  const tags = doc.tags || [];
  const desc = doc.description || '';
  const tagged =
    tags.includes(AUTO_GENERATED_LEASE_TAG) ||
    desc.includes('Auto-generated') ||
    desc.includes('Auto-generated on lease creation');
  return tagged && mime.includes('html');
}

function toTemplateContext(input: LeaseAgreementInput): import('@/lib/lease-templates/types').LeaseTemplateContext {
  return {
    lease: {
      rentAmount: input.monthlyRent,
      securityDeposit: input.depositPaid,
      advanceRent: input.advancePaid,
      dueDay: input.rentDueDay ?? 5,
      lateFeeGraceDays: input.lateFeeGracePeriodDays ?? 5,
      lateFeeLabel: input.lateFeeLabel,
      startDate: input.leaseStartDate,
      endDate: input.leaseEndDate || null,
      moveInDate: input.moveInDate || input.leaseStartDate,
    },
    building: {
      name: input.buildingName,
      address: input.buildingAddress,
      depositValidityDays: input.depositValidityDays ?? 5,
      nonRefundableAfterDays:
        input.depositRefundableAfterDays ?? input.depositValidityDays ?? 5,
      petPolicy: input.petPolicy,
      houseRules: input.houseRules,
    },
    tenant: {
      name: input.tenantName,
      email: input.tenantEmail,
      phone: input.tenantPhone,
    },
    landlord: {
      companyName: input.companyName || LANDLORD_COMPANY_NAME,
    },
    unit: {
      number: input.roomNumber,
    },
    occupants: (input.occupants || []).map((o) => ({
      name: o.name,
      role: o.role,
      relationship: o.relationship,
    })),
    customClauses: input.customClauses,
    documentId: input.documentId,
    isDraft: input.isDraft !== false,
  };
}

/**
 * Prefer published CMS template sections; fall back to hardcoded buildLeaseHtml.
 * Returns html + optional template meta for snapshotting.
 */
async function composeLeaseHtml(input: LeaseAgreementInput): Promise<{
  html: string;
  templateId: string | null;
  templateVersion: number | null;
  templateName: string | null;
  sectionsJson: unknown;
  contextJson: unknown;
}> {
  const context = toTemplateContext(input);

  try {
    const { leaseTemplatesTableExists, getPublishedLeaseTemplate } = await import(
      '@/lib/api/lease-templates'
    );
    if (await leaseTemplatesTableExists()) {
      const template = await getPublishedLeaseTemplate(input.buildingId);
      if (template && template.sections.length > 0) {
        const { renderTemplateSections } = await import('@/lib/lease-templates/render');
        const rendered = renderTemplateSections(template.sections, context);
        // Shell still owns letterhead / key terms box / signature lines
        const contentSections = rendered.filter(
          (s) => s.sectionKey !== 'key_terms' && s.sectionKey !== 'signatures'
        );
        const html = buildLeaseHtmlFromCms(input, contentSections, {
          requireWitness: template.requireWitness,
        });
        return {
          html,
          templateId: template.id,
          templateVersion: template.version,
          templateName: template.name,
          sectionsJson: rendered,
          contextJson: context,
        };
      }
    }
  } catch (err) {
    console.warn('CMS lease template unavailable, using built-in template:', err);
  }

  return {
    html: buildLeaseHtml(input),
    templateId: null,
    templateVersion: null,
    templateName: null,
    sectionsJson: [],
    contextJson: context,
  };
}

function buildLeaseHtmlFromCms(
  input: LeaseAgreementInput,
  sections: Array<{ sectionKey: string; title: string; html: string }>,
  options?: { requireWitness?: boolean }
): string {
  const base = buildLeaseHtml(input);
  const requireWitness = options?.requireWitness !== false;

  const cmsBody = sections
    .map(
      (s) => `
  <h2>${escapeHtml(s.title)}</h2>
  ${s.html}`
    )
    .join('\n');

  const signBlock = `
  <h2>Signatures</h2>
  <p class="muted">By signing, the parties acknowledge they have read and agree to the terms above.</p>
  <div class="sign">
    <div>Landlord / authorized representative<br />Signature &amp; date</div>
    <div>Tenant (Primary)<br />Signature &amp; date</div>
    ${requireWitness ? '<div>Witness<br />Signature &amp; date</div>' : ''}
  </div>`;

  const partiesIdx = base.indexOf('<h2>Parties</h2>');
  const keyTermsStart = base.indexOf('<h2>Key financial terms</h2>');
  const footerIdx = base.indexOf('<footer class="footer">');

  const endOfDatesRow = (): number => {
    const datesStart = base.indexOf('<div class="dates-row">');
    if (datesStart < 0) return partiesIdx;
    let depth = 0;
    for (let i = datesStart; i < base.length; i++) {
      if (base.startsWith('<div', i)) depth++;
      if (base.startsWith('</div>', i)) {
        depth--;
        if (depth === 0) return i + 6;
      }
    }
    return partiesIdx;
  };

  if (partiesIdx > -1 && footerIdx > -1) {
    const header = base.slice(0, partiesIdx);
    const keepThrough = endOfDatesRow();
    const keyBlock =
      keyTermsStart > -1 && keepThrough > keyTermsStart
        ? base.slice(keyTermsStart, keepThrough)
        : '';
    const footer = base.slice(footerIdx);
    return `${header}${keyBlock}\n${cmsBody}\n${signBlock}\n${footer}`;
  }

  const signIdx = base.indexOf('<h2>Signatures</h2>');
  if (signIdx > -1 && footerIdx > -1) {
    return `${base.slice(0, signIdx)}${cmsBody}\n${signBlock}\n${base.slice(footerIdx)}`;
  }

  return base.replace('</body>', `${cmsBody}${signBlock}</body>`);
}

async function persistGeneratedLease(
  input: LeaseAgreementInput,
  existingDocId?: string | null,
  existingFilePath?: string | null
): Promise<string> {
  const enriched = await enrichLeaseInput({
    ...input,
    documentId: existingDocId || input.documentId,
    isDraft: true,
  });

  const displayName = `Lease Agreement — ${input.tenantName}.html`;

  const saveSnapshot = async (documentId: string, composed: Awaited<ReturnType<typeof composeLeaseHtml>>) => {
    try {
      const { leaseTemplatesTableExists, saveLeaseAgreementSnapshot } = await import(
        '@/lib/api/lease-templates'
      );
      if (!(await leaseTemplatesTableExists())) return;
      await saveLeaseAgreementSnapshot({
        documentId,
        templateId: composed.templateId,
        templateVersion: composed.templateVersion,
        templateName: composed.templateName,
        resolvedHtml: composed.html,
        contextJson: composed.contextJson,
        sectionsJson: composed.sectionsJson,
      });
    } catch (err) {
      console.warn('Lease snapshot save skipped:', err);
    }
  };

  if (existingDocId) {
    const composed = await composeLeaseHtml({ ...enriched, documentId: existingDocId });
    const stored = await storeHtmlFile(composed.html, existingFilePath);
    await pool.query(
      `UPDATE documents
       SET document_name = $1,
           file_name = $1,
           file_path = $2,
           file_size = $3,
           mime_type = 'text/html',
           document_type = 'tenant_agreement',
           description = $4,
           tags = CASE
             WHEN $5 = ANY(COALESCE(tags, ARRAY[]::text[])) THEN tags
             ELSE array_append(COALESCE(tags, ARRAY[]::text[]), $5)
           END,
           access_level = 'tenant',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        displayName,
        stored.filePath,
        stored.fileSize,
        AUTO_GENERATED_LEASE_DESC,
        AUTO_GENERATED_LEASE_TAG,
        existingDocId,
      ]
    );
    await saveSnapshot(existingDocId, composed);
    return existingDocId;
  }

  // Create with placeholder Doc ID, then rewrite with real UUID
  const composedPlaceholder = await composeLeaseHtml(enriched);
  const stored = await storeHtmlFile(composedPlaceholder.html);

  const doc = await createDocument({
    buildingId: input.buildingId || undefined,
    roomId: input.roomId || undefined,
    tenantId: input.tenantId,
    pipelineCardId: input.pipelineCardId || undefined,
    documentName: displayName,
    fileName: displayName,
    filePath: stored.filePath,
    fileSize: stored.fileSize,
    mimeType: 'text/html',
    documentType: 'tenant_agreement',
    description: AUTO_GENERATED_LEASE_DESC,
    tags: [AUTO_GENERATED_LEASE_TAG, 'draft'],
    accessLevel: 'tenant',
    uploadedBy: input.uploadedBy || undefined,
  });

  const composedFinal = await composeLeaseHtml({ ...enriched, documentId: doc.id });
  const rewritten = await storeHtmlFile(composedFinal.html, stored.filePath);
  if (rewritten.filePath !== stored.filePath || rewritten.fileSize !== stored.fileSize) {
    await pool.query(
      `UPDATE documents SET file_path = $1, file_size = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [rewritten.filePath, rewritten.fileSize, doc.id]
    );
  } else {
    await pool.query(
      `UPDATE documents SET file_size = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [rewritten.fileSize, doc.id]
    );
  }

  await pool.query(
    `UPDATE tenants
     SET tenant_agreement_document_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [doc.id, input.tenantId]
  );

  await saveSnapshot(doc.id, composedFinal);
  return doc.id;
}

/**
 * Link an existing lease-type opportunity document, or generate / refresh a draft agreement.
 * Returns the document id linked on the tenant, or null if unchanged/failed.
 */
export async function ensureTenantLeaseAgreementDocument(
  input: LeaseAgreementInput
): Promise<string | null> {
  const existing = await pool.query<{ tenant_agreement_document_id: string | null }>(
    `SELECT tenant_agreement_document_id FROM tenants WHERE id = $1`,
    [input.tenantId]
  );
  if (!existing.rows[0]) return null;

  const linkedId = existing.rows[0].tenant_agreement_document_id;

  if (linkedId) {
    const docResult = await pool.query<{
      id: string;
      file_path: string | null;
      mime_type: string | null;
      description: string | null;
      tags: string[] | null;
    }>(
      `SELECT id, file_path, mime_type, description, tags FROM documents WHERE id = $1`,
      [linkedId]
    );
    const doc = docResult.rows[0];

    // Signed / uploaded non-HTML agreement → lock; do not regenerate
    if (doc && !isAutoGeneratedLeaseDoc(doc)) {
      return linkedId;
    }

    // Draft auto-generated HTML → refresh with latest lease + building policy data
    if (doc && isAutoGeneratedLeaseDoc(doc)) {
      return persistGeneratedLease(input, linkedId, doc.file_path);
    }

    return linkedId;
  }

  // Prefer a lease uploaded on the opportunity
  if (input.pipelineCardId) {
    const leaseDoc = await pool.query<{ id: string }>(
      `SELECT id
       FROM documents
       WHERE pipeline_card_id = $1
         AND (
           LOWER(COALESCE(document_type, '')) IN ('lease', 'tenant_agreement', 'contract')
           OR LOWER(COALESCE(document_name, '')) LIKE '%lease%'
           OR LOWER(COALESCE(document_name, '')) LIKE '%agreement%'
         )
       ORDER BY
         CASE WHEN LOWER(COALESCE(document_type, '')) IN ('lease', 'tenant_agreement') THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 1`,
      [input.pipelineCardId]
    );
    if (leaseDoc.rows[0]) {
      await pool.query(
        `UPDATE tenants
         SET tenant_agreement_document_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_agreement_document_id IS NULL`,
        [leaseDoc.rows[0].id, input.tenantId]
      );
      await pool.query(
        `UPDATE documents
         SET tenant_id = COALESCE(tenant_id, $1),
             document_type = CASE
               WHEN document_type IN ('lease', 'tenant_agreement', 'contract') THEN document_type
               ELSE 'tenant_agreement'
             END,
             access_level = CASE
               WHEN access_level IN ('public', 'tenant') THEN access_level
               ELSE 'tenant'
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [input.tenantId, leaseDoc.rows[0].id]
      );
      return leaseDoc.rows[0].id;
    }
  }

  return persistGeneratedLease(input);
}

/**
 * Force-refresh a draft auto-generated lease when underlying lease data changes.
 * No-ops (returns existing id) if the linked document is a signed upload.
 */
export async function regenerateTenantLeaseAgreementDocument(
  input: LeaseAgreementInput
): Promise<string | null> {
  const existing = await pool.query<{ tenant_agreement_document_id: string | null }>(
    `SELECT tenant_agreement_document_id FROM tenants WHERE id = $1`,
    [input.tenantId]
  );
  const linkedId = existing.rows[0]?.tenant_agreement_document_id;
  if (!linkedId) {
    return ensureTenantLeaseAgreementDocument(input);
  }

  const docResult = await pool.query<{
    id: string;
    file_path: string | null;
    mime_type: string | null;
    description: string | null;
    tags: string[] | null;
  }>(
    `SELECT id, file_path, mime_type, description, tags FROM documents WHERE id = $1`,
    [linkedId]
  );
  const doc = docResult.rows[0];
  if (!doc || !isAutoGeneratedLeaseDoc(doc)) {
    return linkedId;
  }

  return persistGeneratedLease(input, linkedId, doc.file_path);
}

export interface GenerateLeaseForTenantResult {
  documentId: string;
  action: 'created' | 'regenerated' | 'replaced';
  locked?: boolean;
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  return s.slice(0, 10) || null;
}

/**
 * Build lease input from the tenant's active (or latest) room assignment and generate/refresh the draft.
 * When forceReplace is true, a locked signed upload is removed and a new draft is generated.
 */
export async function generateLeaseAgreementForTenant(
  tenantId: string,
  options?: { userId?: string | null; forceReplace?: boolean }
): Promise<GenerateLeaseForTenantResult> {
  const tenantResult = await pool.query<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    move_in_date: Date | string | null;
    lease_start_date: Date | string | null;
    lease_end_date: Date | string | null;
    security_deposit: string | number | null;
    tenant_agreement_document_id: string | null;
  }>(
    `SELECT id, first_name, last_name, email, phone, move_in_date,
            lease_start_date, lease_end_date, security_deposit,
            tenant_agreement_document_id
     FROM tenants WHERE id = $1`,
    [tenantId]
  );
  const tenant = tenantResult.rows[0];
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const assignmentResult = await pool.query<{
    room_id: string;
    room_number: string;
    building_id: string;
    building_name: string;
    monthly_rate: string | number;
    deposit_paid: string | number | null;
    advance_paid: string | number | null;
    start_date: Date | string;
    end_date: Date | string | null;
    pipeline_card_id: string | null;
  }>(
    `SELECT
       r.id AS room_id,
       r.room_number,
       b.id AS building_id,
       b.name AS building_name,
       ra.monthly_rate,
       ra.deposit_paid,
       ra.advance_paid,
       ra.start_date,
       ra.end_date,
       NULL::uuid AS pipeline_card_id
     FROM tenant_room_assignments ra
     JOIN rooms r ON r.id = ra.room_id
     JOIN buildings b ON b.id = r.building_id
     WHERE ra.tenant_id = $1
     ORDER BY
       CASE WHEN ra.assignment_status = 'active' THEN 0 ELSE 1 END,
       ra.start_date DESC
     LIMIT 1`,
    [tenantId]
  );

  const assignment = assignmentResult.rows[0];
  if (!assignment) {
    throw new Error(
      'Tenant has no room assignment. Assign a room before generating a lease agreement.'
    );
  }

  const linkedId = tenant.tenant_agreement_document_id;
  let action: GenerateLeaseForTenantResult['action'] = 'created';

  if (linkedId) {
    const docResult = await pool.query<{
      id: string;
      file_path: string | null;
      mime_type: string | null;
      description: string | null;
      tags: string[] | null;
    }>(
      `SELECT id, file_path, mime_type, description, tags FROM documents WHERE id = $1`,
      [linkedId]
    );
    const doc = docResult.rows[0];

    if (doc && !isAutoGeneratedLeaseDoc(doc)) {
      if (!options?.forceReplace) {
        return { documentId: linkedId, action: 'regenerated', locked: true };
      }
      // Replace signed upload with a fresh generated draft
      await pool.query(
        `UPDATE tenants
         SET tenant_agreement_document_id = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [tenantId]
      );
      try {
        const { deleteDocument } = await import('@/lib/api/documents');
        await deleteDocument(linkedId);
      } catch (err) {
        console.warn('Could not delete previous signed agreement:', err);
      }
      action = 'replaced';
    } else if (doc && isAutoGeneratedLeaseDoc(doc)) {
      action = 'regenerated';
    }
  }

  const startDate =
    toIsoDate(assignment.start_date) ||
    toIsoDate(tenant.lease_start_date) ||
    toIsoDate(tenant.move_in_date) ||
    new Date().toISOString().slice(0, 10);

  const input: LeaseAgreementInput = {
    tenantId,
    buildingId: assignment.building_id,
    roomId: assignment.room_id,
    tenantName: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Tenant',
    tenantEmail: tenant.email,
    tenantPhone: tenant.phone,
    buildingName: assignment.building_name || 'Property',
    roomNumber: assignment.room_number || '—',
    monthlyRent: Number(assignment.monthly_rate || 0),
    depositPaid: Number(
      assignment.deposit_paid ?? tenant.security_deposit ?? 0
    ),
    advancePaid: Number(assignment.advance_paid ?? 0),
    leaseStartDate: startDate,
    leaseEndDate: toIsoDate(assignment.end_date) || toIsoDate(tenant.lease_end_date),
    moveInDate: toIsoDate(tenant.move_in_date) || startDate,
    uploadedBy: options?.userId || null,
  };

  const documentId =
    action === 'regenerated'
      ? await regenerateTenantLeaseAgreementDocument(input)
      : await ensureTenantLeaseAgreementDocument(input);

  if (!documentId) {
    throw new Error('Failed to generate lease agreement');
  }

  return { documentId, action: linkedId && action === 'created' ? 'regenerated' : action };
}
