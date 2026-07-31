import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const TENANT_PREVIEW_COOKIE = 'parenta_tenant_preview';
const PREVIEW_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface TenantPreviewPayload {
  tenantId: string;
  tenantUserId: string | null;
  adminUserId: string;
  tenantLabel: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for tenant preview');
  }
  return secret;
}

function sign(body: string): string {
  return createHmac('sha256', getSecret()).update(body).digest('base64url');
}

export function encodePreviewCookie(payload: Omit<TenantPreviewPayload, 'exp'>): string {
  const full: TenantPreviewPayload = {
    ...payload,
    exp: Date.now() + PREVIEW_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

export function decodePreviewCookie(token: string | undefined | null): TenantPreviewPayload | null {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = sign(body);
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8')
    ) as TenantPreviewPayload;

    if (!payload.tenantId || !payload.adminUserId || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function readPreviewCookie(): Promise<TenantPreviewPayload | null> {
  const jar = await cookies();
  return decodePreviewCookie(jar.get(TENANT_PREVIEW_COOKIE)?.value);
}

export function previewCookieOptions(maxAgeSeconds = Math.floor(PREVIEW_TTL_MS / 1000)) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
