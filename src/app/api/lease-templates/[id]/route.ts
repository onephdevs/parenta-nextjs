import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  addLeaseTemplateSection,
  deleteLeaseTemplateSection,
  getLeaseTemplateById,
  publishLeaseTemplate,
  reorderLeaseTemplateSections,
  resetLeaseTemplateToCompactDefaults,
  updateLeaseTemplate,
  updateLeaseTemplateSection,
} from '@/lib/api/lease-templates';
import type { LeaseSectionConditionKey, LeaseSignatureMethod } from '@/lib/lease-templates/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const template = await getLeaseTemplateById(id);
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching lease template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lease template' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/lease-templates/[id]
 * Update template meta, sections, reorder, or publish.
 *
 * body.action:
 *  - 'update' | undefined → template fields
 *  - 'updateSection' → { sectionId, ... }
 *  - 'reorder' → { orderedSectionIds }
 *  - 'addSection' → { sectionKey, title, body?, conditionKey? }
 *  - 'deleteSection' → { sectionId }
 *  - 'resetCompact' → replace sections with compact 1-page defaults
 *  - 'publish'
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action || 'update';

    if (action === 'publish') {
      const published = await publishLeaseTemplate(id, session.user.id);
      if (!published) {
        return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: published,
        message: `Published as version ${published.version}`,
      });
    }

    if (action === 'resetCompact') {
      const reset = await resetLeaseTemplateToCompactDefaults(id, session.user.id);
      if (!reset) {
        return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: reset,
        message: 'Reset to compact 1-page Room Rental Agreement',
      });
    }

    if (action === 'deleteSection') {
      if (!body.sectionId) {
        return NextResponse.json({ success: false, error: 'sectionId required' }, { status: 400 });
      }
      const deleted = await deleteLeaseTemplateSection(id, String(body.sectionId));
      if (!deleted) {
        return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
      }
      const template = await getLeaseTemplateById(id);
      return NextResponse.json({ success: true, data: template, message: 'Clause removed' });
    }

    if (action === 'updateSection') {
      if (!body.sectionId) {
        return NextResponse.json({ success: false, error: 'sectionId required' }, { status: 400 });
      }
      const section = await updateLeaseTemplateSection(body.sectionId, {
        title: body.title,
        body: body.body,
        sortOrder: body.sortOrder,
        isEnabled: body.isEnabled,
        conditionKey: body.conditionKey as LeaseSectionConditionKey,
      });
      if (!section) {
        return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
      }
      const template = await getLeaseTemplateById(id);
      return NextResponse.json({ success: true, data: template, section });
    }

    if (action === 'reorder') {
      const ordered: string[] = body.orderedSectionIds || [];
      await reorderLeaseTemplateSections(id, ordered);
      const template = await getLeaseTemplateById(id);
      return NextResponse.json({ success: true, data: template });
    }

    if (action === 'addSection') {
      if (!body.sectionKey || !body.title) {
        return NextResponse.json(
          { success: false, error: 'sectionKey and title required' },
          { status: 400 }
        );
      }
      await addLeaseTemplateSection(id, {
        sectionKey: String(body.sectionKey)
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, '_')
          .replace(/^_|_$/g, ''),
        title: body.title,
        body: body.body || '',
        conditionKey: (body.conditionKey as LeaseSectionConditionKey) || null,
      });
      const template = await getLeaseTemplateById(id);
      return NextResponse.json({ success: true, data: template });
    }

    const updated = await updateLeaseTemplate(id, {
      name: body.name,
      description: body.description,
      signatureMethod: body.signatureMethod as LeaseSignatureMethod | undefined,
      requireWitness: body.requireWitness,
      auditIp: body.auditIp,
      auditTimestamp: body.auditTimestamp,
      auditUserAgent: body.auditUserAgent,
      updatedBy: session.user.id,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating lease template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update lease template',
      },
      { status: 500 }
    );
  }
}
