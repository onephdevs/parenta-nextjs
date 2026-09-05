/**
 * Lease clickwrap / e-signature events and document stamping.
 */

import pool from '@/lib/db';
import { getPublishedLeaseTemplate } from '@/lib/api/lease-templates';
import type { LeaseSignatureMethod } from '@/lib/lease-templates/types';

export type LeaseSignerRole = 'tenant' | 'landlord' | 'witness' | 'guarantor';

export interface LeaseSignatureEvent {
  id: string;
  documentId: string;
  signerRole: LeaseSignerRole;
  signerName: string;
  signerEmail: string | null;
  signatureMethod: LeaseSignatureMethod;
  signaturePayload: string | null;
  typedName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  signedAt: string;
}

function mapEvent(row: Record<string, unknown>): LeaseSignatureEvent {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    signerRole: row.signer_role as LeaseSignerRole,
    signerName: String(row.signer_name),
    signerEmail: row.signer_email ? String(row.signer_email) : null,
    signatureMethod: row.signature_method as LeaseSignatureMethod,
    signaturePayload: row.signature_payload ? String(row.signature_payload) : null,
    typedName: row.typed_name ? String(row.typed_name) : null,
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
    signedAt: String(row.signed_at),
  };
}

export async function listLeaseSignatureEvents(
  documentId: string
): Promise<LeaseSignatureEvent[]> {
  const result = await pool.query(
    `SELECT * FROM lease_signature_events
     WHERE document_id = $1
     ORDER BY signed_at ASC`,
    [documentId]
  );
  return result.rows.map(mapEvent);
}

export async function getSignatureForRole(
  documentId: string,
  role: LeaseSignerRole
): Promise<LeaseSignatureEvent | null> {
  const result = await pool.query(
    `SELECT * FROM lease_signature_events
     WHERE document_id = $1 AND signer_role = $2
     ORDER BY signed_at DESC
     LIMIT 1`,
    [documentId, role]
  );
  return result.rows[0] ? mapEvent(result.rows[0]) : null;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Soft check: typed name should contain the same tokens as the legal name. */
export function typedNameMatchesLegal(
  typedName: string,
  legalName: string
): boolean {
  const typed = normalizeName(typedName);
  const legal = normalizeName(legalName);
  if (!typed || !legal) return false;
  if (typed === legal) return true;
  const legalParts = legal.split(' ').filter((p) => p.length > 1);
  return legalParts.every((p) => typed.includes(p));
}

export async function recordLeaseSignature(input: {
  documentId: string;
  signerRole: LeaseSignerRole;
  signerName: string;
  signerEmail?: string | null;
  signatureMethod: LeaseSignatureMethod;
  typedName?: string | null;
  signaturePayload?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  buildingId?: string | null;
}): Promise<LeaseSignatureEvent> {
  const existing = await getSignatureForRole(input.documentId, input.signerRole);
  if (existing) {
    throw new Error(
      `${input.signerRole === 'tenant' ? 'Tenant' : 'Signer'} has already signed this agreement`
    );
  }

  // Prefer template-configured method when available
  let method = input.signatureMethod;
  const template = await getPublishedLeaseTemplate(input.buildingId);
  if (template) {
    method = template.signatureMethod;
    if (method === 'typed_name' && !input.typedName?.trim()) {
      throw new Error('Typed full legal name is required');
    }
    if (!template.auditIp) {
      input.ipAddress = null;
    }
    if (!template.auditUserAgent) {
      input.userAgent = null;
    }
  }

  if (method === 'typed_name') {
    const name = (input.typedName || input.signerName || '').trim();
    if (name.length < 3) {
      throw new Error('Please type your full legal name to sign');
    }
  }

  const result = await pool.query(
    `INSERT INTO lease_signature_events (
       document_id, signer_role, signer_name, signer_email,
       signature_method, signature_payload, typed_name,
       ip_address, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.documentId,
      input.signerRole,
      input.signerName.trim(),
      input.signerEmail || null,
      method,
      input.signaturePayload || input.typedName || null,
      input.typedName?.trim() || null,
      input.ipAddress || null,
      input.userAgent || null,
    ]
  );

  await markDocumentSignedIfComplete(input.documentId);
  await stampSignaturesOntoHtml(input.documentId).catch((err) =>
    console.warn('Signature HTML stamp skipped:', err)
  );

  return mapEvent(result.rows[0]);
}

async function markDocumentSignedIfComplete(documentId: string): Promise<void> {
  const events = await listLeaseSignatureEvents(documentId);
  const hasTenant = events.some((e) => e.signerRole === 'tenant');
  if (!hasTenant) return;

  await pool.query(
    `UPDATE documents
     SET tags = (
           SELECT ARRAY(
             SELECT DISTINCT t FROM unnest(
               array_append(
                 array_remove(COALESCE(tags, ARRAY[]::text[]), 'draft'),
                 'signed'
               )
             ) AS t
           )
         ),
         description = CASE
           WHEN description ILIKE '%draft%' OR description ILIKE '%auto-generated%'
             THEN 'Lease agreement — signed (clickwrap)'
           ELSE description
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [documentId]
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function signatureBlockHtml(event: LeaseSignatureEvent): string {
  const when = new Date(event.signedAt).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const display =
    event.signatureMethod === 'typed_name'
      ? `<div style="font-family:'Segoe Script','Bradley Hand',cursive;font-size:1.75rem;color:#111;margin:0.25rem 0;">${escapeHtml(event.typedName || event.signerName)}</div>`
      : event.signaturePayload?.startsWith('data:image')
        ? `<img src="${event.signaturePayload}" alt="Signature" style="max-height:64px;margin:0.25rem 0;" />`
        : `<div style="font-weight:600;">${escapeHtml(event.signerName)}</div>`;

  const audit: string[] = [`Signed ${escapeHtml(when)}`];
  if (event.ipAddress) audit.push(`IP ${escapeHtml(event.ipAddress)}`);
  if (event.userAgent) {
    const shortUa = event.userAgent.length > 80
      ? `${event.userAgent.slice(0, 80)}…`
      : event.userAgent;
    audit.push(escapeHtml(shortUa));
  }

  return `<div class="esign-block" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #e5e2dc;">
    <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:#5c5c5c;">${escapeHtml(event.signerRole)} signature</div>
    ${display}
    <div style="font-size:0.72rem;color:#5c5c5c;font-family:system-ui,sans-serif;">${audit.join(' · ')}</div>
  </div>`;
}

/**
 * Remove DRAFT banner from stored HTML and append executed signature blocks.
 */
export async function stampSignaturesOntoHtml(documentId: string): Promise<void> {
  const doc = await pool.query<{ file_path: string | null; mime_type: string | null }>(
    `SELECT file_path, mime_type FROM documents WHERE id = $1`,
    [documentId]
  );
  const row = doc.rows[0];
  if (!row?.file_path || !(row.mime_type || '').includes('html')) return;

  const events = await listLeaseSignatureEvents(documentId);
  if (events.length === 0) return;

  let html: string | null = null;
  const filePath = row.file_path;

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    const remote = await fetch(filePath);
    if (!remote.ok) return;
    html = await remote.text();
  } else {
    const fs = await import('fs/promises');
    const path = await import('path');
    const relative = filePath.replace(/^\//, '');
    const full = path.join(process.cwd(), 'public', relative);
    html = await fs.readFile(full, 'utf8');
  }

  if (!html) return;

  // Strip draft banner / watermark
  html = html
    .replace(/<div class="draft-banner"[\s\S]*?<\/div>\s*<div class="watermark"[\s\S]*?<\/div>/i, '')
    .replace(/DRAFT — not binding until signed/gi, 'Executed copy on file')
    .replace(/Not valid until signed/gi, 'Electronically signed');

  const stamp = `
  <div class="esign-audit" style="margin-top:2rem;">
    <h2>Electronic signatures</h2>
    ${events.map(signatureBlockHtml).join('\n')}
  </div>`;

  if (html.includes('<!-- esign-stamp -->')) {
    html = html.replace(/<!-- esign-stamp -->[\s\S]*?<!-- \/esign-stamp -->/, `<!-- esign-stamp -->${stamp}<!-- /esign-stamp -->`);
  } else if (html.includes('<footer class="footer">')) {
    html = html.replace(
      '<footer class="footer">',
      `<!-- esign-stamp -->${stamp}<!-- /esign-stamp -->\n  <footer class="footer">`
    );
  } else {
    html = html.replace('</body>', `${stamp}</body>`);
  }

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    // Remote blob — leave stamp in snapshot only; uploading new blob is out of scope here
    await pool.query(
      `UPDATE lease_agreement_snapshots
       SET resolved_html = $1, created_at = CURRENT_TIMESTAMP
       WHERE document_id = $2`,
      [html, documentId]
    );
    return;
  }

  const fs = await import('fs/promises');
  const path = await import('path');
  const relative = filePath.replace(/^\//, '');
  const full = path.join(process.cwd(), 'public', relative);
  await fs.writeFile(full, html, 'utf8');

  await pool.query(
    `UPDATE documents SET file_size = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [Buffer.byteLength(html, 'utf8'), documentId]
  ).catch(() => undefined);

  await pool.query(
    `UPDATE lease_agreement_snapshots
     SET resolved_html = $1, created_at = CURRENT_TIMESTAMP
     WHERE document_id = $2`,
    [html, documentId]
  ).catch(() => undefined);
}

export async function getAgreementSigningState(documentId: string, buildingId?: string | null) {
  const events = await listLeaseSignatureEvents(documentId);
  let signatureMethod: LeaseSignatureMethod = 'typed_name';
  let requireWitness = true;
  let auditIp = true;
  let auditTimestamp = true;
  let auditUserAgent = true;

  const template = await getPublishedLeaseTemplate(buildingId);
  if (template) {
    signatureMethod = template.signatureMethod;
    requireWitness = template.requireWitness;
    auditIp = template.auditIp;
    auditTimestamp = template.auditTimestamp;
    auditUserAgent = template.auditUserAgent;
  }

  return {
    signatureMethod,
    requireWitness,
    auditIp,
    auditTimestamp,
    auditUserAgent,
    signatures: events,
    tenantSigned: events.some((e) => e.signerRole === 'tenant'),
    landlordSigned: events.some((e) => e.signerRole === 'landlord'),
    witnessSigned: events.some((e) => e.signerRole === 'witness'),
  };
}

export function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip');
}
