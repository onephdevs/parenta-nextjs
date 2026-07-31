/**
 * GET/PUT /api/notification-preferences — per-category in-app / email toggles
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import pool from '@/lib/db';
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_DEFAULTS,
  isActivityCategory,
  type ActivityCategory,
} from '@/lib/services/activity-taxonomy';

export async function GET() {
  try {
    const { session, error } = await requireRole(['admin', 'tenant']);
    if (error || !session?.user?.id) return error;

    const result = await pool.query(
      `SELECT category, in_app_enabled, email_enabled, updated_at
       FROM notification_preferences
       WHERE user_id = $1`,
      [session.user.id]
    );

    const byCategory = new Map(
      result.rows.map((r) => [
        r.category as string,
        {
          inAppEnabled: Boolean(r.in_app_enabled),
          emailEnabled: Boolean(r.email_enabled),
          updatedAt: r.updated_at,
        },
      ])
    );

    const preferences = ACTIVITY_CATEGORIES.map((category) => {
      const saved = byCategory.get(category);
      const defaults = CATEGORY_DEFAULTS[category];
      return {
        category,
        label: defaults.label,
        description: defaults.description,
        inAppEnabled: saved?.inAppEnabled ?? defaults.inApp,
        emailEnabled: saved?.emailEnabled ?? defaults.email,
        isDefault: !saved,
        updatedAt: saved?.updatedAt || null,
      };
    });

    return NextResponse.json({ success: true, data: { preferences } });
  } catch (error) {
    console.error('GET /api/notification-preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requireRole(['admin', 'tenant']);
    if (error || !session?.user?.id) return error;

    const body = await request.json();
    const category = String(body.category || '');
    if (!isActivityCategory(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      );
    }

    const inAppEnabled =
      typeof body.inAppEnabled === 'boolean'
        ? body.inAppEnabled
        : CATEGORY_DEFAULTS[category as ActivityCategory].inApp;
    const emailEnabled =
      typeof body.emailEnabled === 'boolean'
        ? body.emailEnabled
        : CATEGORY_DEFAULTS[category as ActivityCategory].email;

    const result = await pool.query(
      `INSERT INTO notification_preferences (user_id, category, in_app_enabled, email_enabled, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, category)
       DO UPDATE SET
         in_app_enabled = EXCLUDED.in_app_enabled,
         email_enabled = EXCLUDED.email_enabled,
         updated_at = CURRENT_TIMESTAMP
       RETURNING category, in_app_enabled, email_enabled, updated_at`,
      [session.user.id, category, inAppEnabled, emailEnabled]
    );

    const row = result.rows[0];
    const defaults = CATEGORY_DEFAULTS[category as ActivityCategory];

    return NextResponse.json({
      success: true,
      data: {
        category: row.category,
        label: defaults.label,
        description: defaults.description,
        inAppEnabled: Boolean(row.in_app_enabled),
        emailEnabled: Boolean(row.email_enabled),
        updatedAt: row.updated_at,
      },
      message: 'Preference updated',
    });
  } catch (error) {
    console.error('PUT /api/notification-preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
