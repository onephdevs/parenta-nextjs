import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDocumentById } from '@/lib/api/documents';
import pool from '@/lib/db';
import {
  clientIpFromRequest,
  getAgreementSigningState,
  recordLeaseSignature,
} from '@/lib/services/lease-signature-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
 * GET /api/tenants/[id]/agreement/sign — admin: signing status
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId } = await params;
    const ctx = await getTenantAgreementContext(tenantId);
    if (!ctx?.tenant_agreement_document_id) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No lease agreement on file',
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
        documentName: document?.documentName || 'Lease agreement',
        downloadUrl: `/api/documents/${ctx.tenant_agreement_document_id}/download`,
        tenantName: `${ctx.first_name || ''} ${ctx.last_name || ''}`.trim(),
        ...signing,
      },
    });
  } catch (error) {
    console.error('Error loading agreement signing state:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load signing state' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[id]/agreement/sign — admin landlord (or witness) sign
 * body: { role?: 'landlord' | 'witness', typedName, acceptTerms }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId } = await params;
    const ctx = await getTenantAgreementContext(tenantId);
    if (!ctx?.tenant_agreement_document_id) {
      return NextResponse.json(
        { success: false, error: 'No lease agreement available to sign' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const role = body.role === 'witness' ? 'witness' : 'landlord';
    const typedName = String(body.typedName || '').trim();
    if (body.acceptTerms !== true) {
      return NextResponse.json(
        { success: false, error: 'You must confirm to sign' },
        { status: 400 }
      );
    }

    const signerName =
      typedName ||
      [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') ||
      session.user.email ||
      'Landlord';

    const event = await recordLeaseSignature({
      documentId: ctx.tenant_agreement_document_id,
      signerRole: role,
      signerName,
      signerEmail: session.user.email || null,
      signatureMethod: body.signatureMethod || 'typed_name',
      typedName: typedName || signerName,
      signaturePayload: body.signaturePayload || null,
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
      message: `${role === 'witness' ? 'Witness' : 'Landlord'} signature recorded`,
    });
  } catch (error) {
    console.error('Error recording landlord signature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign',
      },
      { status: 500 }
    );
  }
}
