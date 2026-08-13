import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getLeaseDesignerPreviewContext,
  variablesFromPreviewContext,
} from '@/lib/lease-templates/preview-context';
import { VARIABLE_CATEGORIES } from '@/lib/lease-templates/types';

/**
 * GET /api/lease-templates/preview-context
 * Real assignment-backed context for designer live preview (not Sunset mock).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const buildingId = request.nextUrl.searchParams.get('buildingId');
    const assignmentId = request.nextUrl.searchParams.get('assignmentId');

    const { context, meta } = await getLeaseDesignerPreviewContext({
      buildingId,
      assignmentId,
    });

    return NextResponse.json({
      success: true,
      data: {
        context,
        meta,
        variables: variablesFromPreviewContext(context),
        categories: VARIABLE_CATEGORIES,
      },
    });
  } catch (error) {
    console.error('GET /api/lease-templates/preview-context error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load preview context',
      },
      { status: 500 }
    );
  }
}
