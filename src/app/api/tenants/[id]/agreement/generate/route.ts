import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateLeaseAgreementForTenant } from '@/lib/services/lease-agreement-document';
import { getDocumentById } from '@/lib/api/documents';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/tenants/[id]/agreement/generate
 * Generate (or refresh) the templated lease agreement for a tenant.
 * Body: { forceReplace?: boolean } — replace a signed upload with a new draft.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId } = await params;
    let forceReplace = false;
    try {
      const body = await request.json();
      forceReplace = body?.forceReplace === true;
    } catch {
      // empty body is fine
    }

    const result = await generateLeaseAgreementForTenant(tenantId, {
      userId: session.user.id,
      forceReplace,
    });

    if (result.locked) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A signed lease is already on file. Delete it first, or confirm replace to generate a new draft.',
          code: 'AGREEMENT_LOCKED',
          data: { documentId: result.documentId },
        },
        { status: 409 }
      );
    }

    const document = await getDocumentById(result.documentId);

    return NextResponse.json({
      success: true,
      data: {
        documentId: result.documentId,
        action: result.action,
        document,
        downloadUrl: `/api/documents/${result.documentId}/download`,
      },
      message:
        result.action === 'created'
          ? 'Lease agreement generated'
          : result.action === 'replaced'
            ? 'Signed agreement replaced with a new draft'
            : 'Lease agreement updated',
    });
  } catch (error) {
    console.error('Error generating tenant lease agreement:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to generate lease agreement',
      },
      { status: 500 }
    );
  }
}
