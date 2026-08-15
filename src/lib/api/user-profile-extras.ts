import pool from '@/lib/db';

export async function getUserProfileExtras(
  userId: string
): Promise<Record<string, string>> {
  const result = await pool.query(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    [`user_profile:${userId}`]
  );
  if (result.rows.length === 0) return {};
  try {
    const parsed = JSON.parse(result.rows[0].value) as Record<string, unknown>;
    const extras: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed || {})) {
      if (value == null) continue;
      extras[key] = String(value);
    }
    return extras;
  } catch {
    return {};
  }
}

export async function saveUserProfileExtras(
  userId: string,
  extras: Record<string, string>
): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [
      `user_profile:${userId}`,
      JSON.stringify(extras),
      'Optional profile fields for user',
    ]
  );
}

/** Keep tenants.profile_picture_url in sync with the portal avatar. */
export async function syncTenantPictureForUser(
  userId: string,
  pictureUrl: string | null
): Promise<void> {
  await pool.query(
    `UPDATE tenants
     SET profile_picture_url = $1, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $2
        OR (
          email IS NOT NULL
          AND lower(email) = (SELECT lower(email) FROM users WHERE id = $2)
        )`,
    [pictureUrl, userId]
  );
}

/** Keep portal avatar extras in sync when admin updates the tenant photo. */
export async function syncUserAvatarForTenant(
  tenantId: string,
  pictureUrl: string | null
): Promise<void> {
  const result = await pool.query<{ user_id: string | null }>(
    `SELECT user_id FROM tenants WHERE id = $1 LIMIT 1`,
    [tenantId]
  );
  const userId = result.rows[0]?.user_id;
  if (!userId) return;
  const extras = await getUserProfileExtras(userId);
  if (pictureUrl) extras.avatarUrl = pictureUrl;
  else delete extras.avatarUrl;
  await saveUserProfileExtras(userId, extras);
}

export async function resolveTenantAvatarUrl(input: {
  profilePictureUrl?: string | null;
  userId?: string | null;
  email?: string | null;
}): Promise<string | null> {
  const [filled] = await fillTenantAvatarUrls([
    {
      tenant_avatar_url: input.profilePictureUrl || null,
      user_id: input.userId || null,
      tenant_email: input.email || null,
    },
  ]);
  return String(filled.tenant_avatar_url || '').trim() || null;
}

/** Fill tenant_avatar_url from profile_picture_url or portal user_profile extras. */
export async function fillTenantAvatarUrls<T extends Record<string, unknown>>(
  rows: T[]
): Promise<T[]> {
  if (rows.length === 0) return rows;

  const userIds = new Set<string>();
  const emails = new Set<string>();
  for (const row of rows) {
    const existing = String(
      row.tenant_avatar_url || row.profile_picture_url || row.profilePictureUrl || ''
    ).trim();
    if (existing) continue;
    const userId = String(row.user_id || row.userId || row.tenant_user_id || '').trim();
    const email = String(row.tenant_email || row.email || '').trim().toLowerCase();
    if (userId) userIds.add(userId);
    if (email) emails.add(email);
  }

  const emailToUserId = new Map<string, string>();
  if (emails.size > 0) {
    const users = await pool.query<{ id: string; email: string | null }>(
      `SELECT id, email FROM users WHERE email IS NOT NULL AND lower(email) = ANY($1::text[])`,
      [[...emails]]
    );
    for (const user of users.rows) {
      if (!user.email) continue;
      emailToUserId.set(user.email.toLowerCase(), String(user.id));
      userIds.add(String(user.id));
    }
  }

  const avatars = new Map<string, string>();
  if (userIds.size > 0) {
    const keys = [...userIds].map((id) => `user_profile:${id}`);
    const result = await pool.query<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings WHERE key = ANY($1::text[])`,
      [keys]
    );
    for (const row of result.rows) {
      try {
        const extras = JSON.parse(row.value) as { avatarUrl?: string };
        const url = String(extras.avatarUrl || '').trim();
        if (!url) continue;
        avatars.set(row.key.replace(/^user_profile:/, ''), url);
      } catch {
        /* ignore */
      }
    }
  }

  return rows.map((row) => {
    const existing = String(
      row.tenant_avatar_url || row.profile_picture_url || row.profilePictureUrl || ''
    ).trim();
    if (existing) return { ...row, tenant_avatar_url: existing };
    const userId =
      String(row.user_id || row.userId || row.tenant_user_id || '').trim() ||
      emailToUserId.get(String(row.tenant_email || row.email || '').trim().toLowerCase());
    const fallback = userId ? avatars.get(userId) : undefined;
    return { ...row, tenant_avatar_url: fallback || null };
  });
}
