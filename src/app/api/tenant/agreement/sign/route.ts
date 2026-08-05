import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';
import { getDocumentById } from '@/lib/api/documents';
import pool from '@/lib/db';
import {
  clientIpFromRequest,
  getAgreementSigningState,
  recordLeaseSignature,
  typedNameMatchesLegal,
} from '@/lib/services/lease-signature-service';

async function getTenantAgreementContext(tenantId: string) {
  const result = await pool.query<{
    tenant_agreement_document_id: string | null;
    first_name: string;
    last_name: string;
    email: string | null;
    building_id: string | null;
  }>(
    `SELECT
       t.tenant_agreement_document_id,
       t.first_name,
       t.last_name,
       t.email,
       r.building_id
     FROM tenants t
     LEFT JOIN tenant_room_assignments ra
       ON ra.tenant_id = t.id
      AND ra.assignment_status = 'active'
     LEFT JOIN rooms r ON r.id = ra.room_id
     WHERE t.id = $1
     LIMIT 1`,
    [tenantId]
  );
  return result.rows[0] || null;
}

/**
 * GET /api/tenant/agreement/sign
 * Signing state for the current tenant's lease agreement.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'tenant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getTenantByUserId(session.user.id);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    const ctx = await getTenantAgreementContext(tenant.id);
    if (!ctx?.tenant_agreement_document_id) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No lease agreement on file yet',
      });
    }

    const document = await getDocumentById(ctx.tenant_agreement_document_id);
    const signing = await getAgreementSigningState(
      ctx.tenant_agreement_document_id,
      ctx.building_id
    );

    return NextResponse.json({
      success: true,
      data: {
        documentId: ctx.tenant_agreement_document_id,
        documentName: document?.documentName || document?.fileName || 'Lease agreement',
        downloadUrl: `/api/tenant/documents/${ctx.tenant_agreement_document_id}/download`,
        legalName: `${ctx.first_name || ''} ${ctx.last_name || ''}`.trim(),
        ...signing,
      },
    });
  } catch (error) {
    console.error('Error loading tenant agreement signing state:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load signing state' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/agreement/sign
 * Clickwrap: typed name (or drawn/upload payload) with IP + user-agent audit.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'tenant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getTenantByUserId(session.user.id);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    const ctx = await getTenantAgreementContext(tenant.id);
    if (!ctx?.tenant_agreement_document_id) {
      return NextResponse.json(
        { success: false, error: 'No lease agreement available to sign' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const typedName = String(body.typedName || '').trim();
    const accepted = body.acceptTerms === true;
    const signaturePayload = body.signaturePayload
      ? String(body.signaturePayload)
      : null;

    if (!accepted) {
      return NextResponse.json(
        { success: false, error: 'You must accept the lease terms to sign' },
        { status: 400 }
      );
    }

    const legalName = `${ctx.first_name || ''} ${ctx.last_name || ''}`.trim();
    if (typedName && !typedNameMatchesLegal(typedName, legalName)) {
      return NextResponse.json(
        {
          success: false,
          error: `Typed name should match your legal name (${legalName})`,
        },
        { status: 400 }
      );
    }

    const event = await recordLeaseSignature({
      documentId: ctx.tenant_agreement_document_id,
      signerRole: 'tenant',
      signerName: legalName || typedName,
      signerEmail: ctx.email,
      signatureMethod: body.signatureMethod || 'typed_name',
      typedName: typedName || legalName,
      signaturePayload,
      ipAddress: clientIpFromRequest(request),
      userAgent: request.headers.get('user-agent'),
      buildingId: ctx.building_id,
    });

    const signing = await getAgreementSigningState(
      ctx.tenant_agreement_document_id,
      ctx.building_id
    );

    return NextResponse.json({
      success: true,
      data: { event, ...signing },
      message: 'Lease signed successfully',
    });
  } catch (error) {
    console.error('Error signing tenant agreement:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign agreement',
      },
      { status: 500 }
    );
  }
}
