import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getLeaseTemplateById } from '@/lib/api/lease-templates';
import {
  previewSectionHtml,
  previewSectionPlain,
  renderTemplateSections,
} from '@/lib/lease-templates/render';
import { SAMPLE_LEASE_CONTEXT } from '@/lib/lease-templates/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/lease-templates/[id]/preview
 * Live-preview a section body or the full template against sample (or provided) context.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const context = { ...SAMPLE_LEASE_CONTEXT, ...(body.context || {}) };

    if (body.sectionBody != null) {
      return NextResponse.json({
        success: true,
        data: {
          plain: previewSectionPlain(String(body.sectionBody), context),
          html: previewSectionHtml(String(body.sectionBody), context),
        },
      });
    }

    const template = await getLeaseTemplateById(id);
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const sections = body.sections || template.sections;
    const rendered = renderTemplateSections(sections, context, { highlight: true });

    return NextResponse.json({
      success: true,
      data: {
        sections: rendered,
        context,
      },
    });
  } catch (error) {
    console.error('Error previewing lease template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preview template' },
      { status: 500 }
    );
  }
}
