/**
 * Create a simple lease agreement document for a tenant when none exists yet
 * (e.g. after Generate lease from onboarding with no "Lease agreement" upload).
 */

import fs from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';
import pool from '@/lib/db';
import { createDocument } from '@/lib/api/documents';

export interface LeaseAgreementInput {
  tenantId: string;
  pipelineCardId?: string | null;
  buildingId?: string | null;
  roomId?: string | null;
  tenantName: string;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  buildingName: string;
  roomNumber: string;
  monthlyRent: number;
  depositPaid: number;
  advancePaid: number;
  leaseStartDate: string;
  leaseEndDate?: string | null;
  moveInDate?: string | null;
  uploadedBy?: string | null;
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

function buildLeaseHtml(input: LeaseAgreementInput): string {
  const endLabel = input.leaseEndDate
    ? formatDisplayDate(input.leaseEndDate)
    : 'Open-ended';
  const moveIn = input.moveInDate
    ? formatDisplayDate(input.moveInDate)
    : formatDisplayDate(input.leaseStartDate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Lease Agreement — ${input.tenantName}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.5; }
    h1 { font-size: 1.5rem; text-align: center; margin-bottom: 1.5rem; }
    h2 { font-size: 1.05rem; margin-top: 1.5rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
    td { padding: 0.35rem 0; vertical-align: top; }
    td:first-child { width: 42%; color: #444; }
    .muted { color: #666; font-size: 0.9rem; }
    .sign { display: flex; justify-content: space-between; gap: 2rem; margin-top: 3rem; }
    .sign div { flex: 1; border-top: 1px solid #333; padding-top: 0.5rem; margin-top: 3rem; }
  </style>
</head>
<body>
  <h1>Residential Lease Agreement</h1>
  <p class="muted">Generated on lease creation. Replace with a signed PDF when available.</p>

  <h2>Parties</h2>
  <table>
    <tr><td>Tenant</td><td><strong>${input.tenantName}</strong></td></tr>
    <tr><td>Email</td><td>${input.tenantEmail || '—'}</td></tr>
    <tr><td>Phone</td><td>${input.tenantPhone || '—'}</td></tr>
    <tr><td>Landlord / Manager</td><td>Parenta Property Management</td></tr>
  </table>

  <h2>Property</h2>
  <table>
    <tr><td>Building</td><td>${input.buildingName}</td></tr>
    <tr><td>Unit</td><td>${input.roomNumber}</td></tr>
  </table>

  <h2>Lease terms</h2>
  <table>
    <tr><td>Lease start</td><td>${formatDisplayDate(input.leaseStartDate)}</td></tr>
    <tr><td>Lease end</td><td>${endLabel}</td></tr>
    <tr><td>Move-in</td><td>${moveIn}</td></tr>
    <tr><td>Monthly rent</td><td>${formatPhp(input.monthlyRent)}</td></tr>
    <tr><td>Security deposit</td><td>${formatPhp(input.depositPaid)}</td></tr>
    <tr><td>Advance rent</td><td>${formatPhp(input.advancePaid)}</td></tr>
  </table>

  <h2>Payment</h2>
  <p>Monthly rent is due on the 5th of each month. Deposit is refundable per house rules at move-out. Advance is applied to the first full month of rent.</p>

  <div class="sign">
    <div>Landlord signature / date</div>
    <div>Tenant signature / date</div>
  </div>
</body>
</html>`;
}

async function storeHtmlFile(
  html: string,
  fileName: string
): Promise<{ filePath: string; fileSize: number }> {
  const buffer = Buffer.from(html, 'utf8');
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

/**
 * Link an existing lease-type opportunity document, or generate a new agreement file.
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
  if (existing.rows[0].tenant_agreement_document_id) {
    return existing.rows[0].tenant_agreement_document_id;
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

  const html = buildLeaseHtml(input);
  const displayName = `Lease Agreement — ${input.tenantName}.html`;
  const stored = await storeHtmlFile(html, displayName);

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
    description: 'Auto-generated on lease creation from onboarding',
    accessLevel: 'tenant',
    uploadedBy: input.uploadedBy || undefined,
  });

  await pool.query(
    `UPDATE tenants
     SET tenant_agreement_document_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [doc.id, input.tenantId]
  );

  return doc.id;
}
