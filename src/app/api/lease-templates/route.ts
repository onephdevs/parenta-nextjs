import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  cloneLeaseTemplateForBuilding,
  ensureDefaultLeaseTemplate,
  leaseTemplatesTableExists,
  listLeaseTemplates,
} from '@/lib/api/lease-templates';
import { LEASE_TEMPLATE_VARIABLES, VARIABLE_CATEGORIES } from '@/lib/lease-templates/types';
import pool from '@/lib/db';

/**
 * GET /api/lease-templates
 * List templates (+ ensure default exists). Also returns variable catalog.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const exists = await leaseTemplatesTableExists();
    if (!exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Lease template tables are missing. Run migrations/add-lease-template-cms.sql against your database.',
          code: 'MIGRATION_REQUIRED',
          data: {
            variables: LEASE_TEMPLATE_VARIABLES,
            categories: VARIABLE_CATEGORIES,
            templates: [],
          },
        },
        { status: 503 }
      );
    }

    const buildingId = request.nextUrl.searchParams.get('buildingId');
    const status = request.nextUrl.searchParams.get('status') as
      | 'draft'
      | 'published'
      | 'archived'
      | null;
    const scope = request.nextUrl.searchParams.get('scope'); // 'all' | null

    const defaultTemplate = await ensureDefaultLeaseTemplate(session.user.id);

    let templates;
    if (scope === 'all' && !buildingId) {
      templates = await listLeaseTemplates({
        status: status || undefined,
      });
    } else {
      templates = await listLeaseTemplates({
        buildingId: buildingId || undefined,
        status: status || undefined,
      });
    }

    const list = templates.length > 0 ? templates : [defaultTemplate];

    return NextResponse.json({
      success: true,
      data: {
        templates: list,
        activeTemplateId: defaultTemplate.id,
        variables: LEASE_TEMPLATE_VARIABLES,
        categories: VARIABLE_CATEGORIES,
      },
    });
  } catch (error) {
    console.error('Error listing lease templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list lease templates',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lease-templates
 * action: cloneForBuilding — { buildingId, sourceTemplateId? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const exists = await leaseTemplatesTableExists();
    if (!exists) {
      return NextResponse.json(
        { success: false, error: 'Migration required', code: 'MIGRATION_REQUIRED' },
        { status: 503 }
      );
    }

    const body = await request.json();
    if (body.action === 'cloneForBuilding') {
      if (!body.buildingId) {
        return NextResponse.json(
          { success: false, error: 'buildingId required' },
          { status: 400 }
        );
      }

      let buildingName: string | null = null;
      try {
        const b = await pool.query<{ name: string }>(
          `SELECT name FROM buildings WHERE id = $1`,
          [body.buildingId]
        );
        buildingName = b.rows[0]?.name || null;
      } catch {
        /* ignore */
      }

      const cloned = await cloneLeaseTemplateForBuilding(body.buildingId, {
        sourceTemplateId: body.sourceTemplateId || null,
        userId: session.user.id,
        buildingName,
      });

      return NextResponse.json({
        success: true,
        data: cloned,
        message:
          cloned.status === 'draft'
            ? 'Building override ready to edit'
            : 'Existing building template loaded',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error creating lease template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      },
      { status: 500 }
    );
  }
}
