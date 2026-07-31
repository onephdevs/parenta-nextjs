/**
 * Central activity logger — single emission point for activity_log + in-app notifications.
 * Soft-fails: never throws to callers (CRUD must succeed even if logging fails).
 */

import pool from '@/lib/db';
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_DEFAULTS,
  formatActivityDescription,
  formatActorName,
  getActionTitle,
  sanitizeActivityData,
  type ActivityCategory,
  type ActorRole,
} from '@/lib/services/activity-taxonomy';

export interface LogActivityInput {
  actorUserId: string | null;
  actorRole: ActorRole;
  actionType: string;
  category: ActivityCategory;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  link?: string | null;
  /** Extra recipients (e.g. tenant user id). Admins are always considered. */
  notifyUserIds?: string[];
  skipNotifications?: boolean;
  /** When false, skip notifying the actor (default: true — actor receives too) */
  notifyActor?: boolean;
}

export interface LogActivityResult {
  activityLogId: string | null;
  notificationIds: string[];
}

async function getAdminUserIds(): Promise<string[]> {
  const result = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' AND is_active = true`
  );
  return result.rows.map((r) => String(r.id));
}

async function getPreferencesForUsers(
  userIds: string[],
  category: ActivityCategory
): Promise<Map<string, { inApp: boolean; email: boolean }>> {
  const defaults = CATEGORY_DEFAULTS[category];
  const map = new Map<string, { inApp: boolean; email: boolean }>();
  for (const id of userIds) {
    map.set(id, { inApp: defaults.inApp, email: defaults.email });
  }
  if (userIds.length === 0) return map;

  const result = await pool.query(
    `SELECT user_id, in_app_enabled, email_enabled
     FROM notification_preferences
     WHERE user_id = ANY($1::uuid[]) AND category = $2`,
    [userIds, category]
  );
  for (const row of result.rows) {
    map.set(String(row.user_id), {
      inApp: Boolean(row.in_app_enabled),
      email: Boolean(row.email_enabled),
    });
  }
  return map;
}

async function resolveActorName(actorUserId: string | null): Promise<string | null> {
  if (!actorUserId) return null;
  const result = await pool.query(
    `SELECT first_name, last_name, email FROM users WHERE id = $1 LIMIT 1`,
    [actorUserId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return formatActorName({
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
  });
}

/**
 * Insert activity_log and fan out in-app notifications per preferences.
 */
export async function logActivity(input: LogActivityInput): Promise<LogActivityResult> {
  try {
    if (!ACTIVITY_CATEGORIES.includes(input.category)) {
      console.warn('[logActivity] Unknown category:', input.category);
    }

    const beforeData = sanitizeActivityData(input.beforeData ?? null);
    const afterData = sanitizeActivityData(input.afterData ?? null);
    const metadata = sanitizeActivityData(input.metadata ?? {}) || {};

    const insert = await pool.query(
      `INSERT INTO activity_log (
         actor_user_id, actor_role, action_type, category,
         entity_type, entity_id, entity_label,
         before_data, after_data, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        input.actorUserId,
        input.actorRole,
        input.actionType,
        input.category,
        input.entityType,
        input.entityId || null,
        input.entityLabel || null,
        beforeData ? JSON.stringify(beforeData) : null,
        afterData ? JSON.stringify(afterData) : null,
        JSON.stringify(metadata),
      ]
    );

    const activityLogId = String(insert.rows[0].id);
    const notificationIds: string[] = [];

    if (input.skipNotifications) {
      return { activityLogId, notificationIds };
    }

    const actorName = await resolveActorName(input.actorUserId);
    const title = getActionTitle(input.actionType);
    const body = formatActivityDescription({
      actionType: input.actionType,
      entityLabel: input.entityLabel,
      actorName,
    });

    const adminIds = await getAdminUserIds();
    const recipientSet = new Set<string>([...adminIds, ...(input.notifyUserIds || [])]);

    if (input.notifyActor === false && input.actorUserId) {
      recipientSet.delete(input.actorUserId);
    }

    const recipients = [...recipientSet];
    const prefs = await getPreferencesForUsers(recipients, input.category);
    const inAppRecipients = recipients.filter((id) => prefs.get(id)?.inApp);

    if (inAppRecipients.length > 0) {
      const values: unknown[] = [];
      const placeholders: string[] = [];
      let p = 1;
      for (const userId of inAppRecipients) {
        placeholders.push(
          `($${p++}, $${p++}, $${p++}, $${p++}, 'normal', false, 'delivered', $${p++}, $${p++}, $${p++})`
        );
        values.push(
          userId,
          input.actionType,
          title,
          body,
          input.category,
          input.link || null,
          activityLogId
        );
      }

      const notif = await pool.query(
        `INSERT INTO notifications (
           user_id, notification_type, title, message,
           priority, is_read, notification_status,
           category, link, related_activity_log_id
         ) VALUES ${placeholders.join(', ')}
         RETURNING id`,
        values
      );
      notificationIds.push(...notif.rows.map((r) => String(r.id)));
    }

    for (const userId of recipients) {
      if (prefs.get(userId)?.email) {
        console.debug(
          `[logActivity] email stub skipped for user=${userId} category=${input.category} action=${input.actionType}`
        );
      }
    }

    return { activityLogId, notificationIds };
  } catch (error) {
    console.error('[logActivity] failed (soft):', error);
    return { activityLogId: null, notificationIds: [] };
  }
}

/** Fire-and-forget helper for route handlers */
export function logActivitySafe(input: LogActivityInput): void {
  void logActivity(input);
}
