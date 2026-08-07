/**
 * Lightweight spam guards for the public homepage inquiry form.
 * In-memory limits work per Node process (local / single PM2 instance).
 * Email cooldown also checks recent pipeline cards in the DB.
 */

const ipBuckets = new Map<string, number[]>();
const emailBuckets = new Map<string, number[]>();
const phoneBuckets = new Map<string, number[]>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 2;
const MAX_PER_PHONE = 2;
/** Full contact form — humans need a couple seconds. */
const MIN_SUBMIT_MS = 2500;
/** Hero inquire is a single field — allow a short pause without blocking real users. */
const MIN_SUBMIT_MS_HERO = 800;
/** Allow device clocks to drift relative to the server without false rejects. */
const CLOCK_SKEW_MS = 15 * 60 * 1000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FIELD_LEN = {
  firstName: 80,
  lastName: 80,
  email: 160,
  phone: 40,
  message: 2000,
};

function prune(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

function touchBucket(map: Map<string, number[]>, key: string, now: number): number {
  const next = prune(map.get(key) || [], now);
  next.push(now);
  map.set(key, next);
  // Bound map growth in long-running processes
  if (map.size > 5_000) {
    for (const [k, times] of map) {
      const kept = prune(times, now);
      if (kept.length === 0) map.delete(k);
      else map.set(k, kept);
    }
  }
  return next.length;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);
  return 'unknown';
}

export interface InquirySpamCheckInput {
  honeypot?: string;
  /** Absolute client timestamp when the form opened (legacy). */
  formStartedAt?: number | string | null;
  /**
   * Preferred: how long the form was open on the client (ms).
   * Avoids false rejects when the device clock is skewed vs the server.
   */
  formElapsedMs?: number | string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  ip: string;
  /** Hero banner single-field inquire — shorter minimum fill time. */
  source?: string;
}

export type InquirySpamResult =
  | { ok: true }
  | { ok: false; status: number; error: string; silent?: boolean };

function parseFiniteNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}

/** Resolve how long the form was open, preferring client-reported elapsed ms. */
export function resolveFormElapsedMs(input: {
  formElapsedMs?: number | string | null;
  formStartedAt?: number | string | null;
  now?: number;
}): number | null {
  const now = input.now ?? Date.now();
  const elapsedDirect = parseFiniteNumber(input.formElapsedMs);
  if (Number.isFinite(elapsedDirect) && elapsedDirect >= 0) {
    return elapsedDirect;
  }

  const startedAt = parseFiniteNumber(input.formStartedAt);
  if (!Number.isFinite(startedAt)) return null;
  // Reject clearly impossible future timestamps (beyond skew tolerance)
  if (startedAt > now + CLOCK_SKEW_MS) return null;
  return Math.max(0, now - startedAt);
}

export function checkInquirySpam(input: InquirySpamCheckInput): InquirySpamResult {
  const honeypot = typeof input.honeypot === 'string' ? input.honeypot.trim() : '';
  // Bots that fill hidden fields — pretend success so they don't retry harder.
  if (honeypot.length > 0) {
    return { ok: false, status: 200, error: 'ok', silent: true };
  }

  const elapsed = resolveFormElapsedMs(input);
  if (elapsed == null) {
    return { ok: false, status: 400, error: 'Please reload the page and try again.' };
  }

  const minMs =
    input.source === 'hero_banner' || input.source === 'hero' ? MIN_SUBMIT_MS_HERO : MIN_SUBMIT_MS;
  if (elapsed < minMs) {
    return {
      ok: false,
      status: 429,
      error: 'Submitted too quickly. Please wait a moment and try again.',
    };
  }
  // Forms open longer than a day are likely stale / replayed
  if (elapsed > MAX_FORM_AGE_MS + CLOCK_SKEW_MS) {
    return { ok: false, status: 400, error: 'Please reload the page and try again.' };
  }

  if (input.firstName.length > MAX_FIELD_LEN.firstName) {
    return { ok: false, status: 400, error: 'First name is too long.' };
  }
  if (input.lastName.length > MAX_FIELD_LEN.lastName) {
    return { ok: false, status: 400, error: 'Last name is too long.' };
  }
  if (input.email.length > MAX_FIELD_LEN.email) {
    return { ok: false, status: 400, error: 'Email is too long.' };
  }
  if (input.phone.length > MAX_FIELD_LEN.phone) {
    return { ok: false, status: 400, error: 'Phone number is too long.' };
  }
  if (input.message.length > MAX_FIELD_LEN.message) {
    return { ok: false, status: 400, error: 'Message is too long.' };
  }

  const now = Date.now();
  const ipCount = touchBucket(ipBuckets, input.ip || 'unknown', now);
  if (ipCount > MAX_PER_IP) {
    return {
      ok: false,
      status: 429,
      error: 'Too many inquiries from this network. Please try again later.',
    };
  }

  const emailKey = input.email.trim().toLowerCase();
  if (emailKey) {
    const emailCount = touchBucket(emailBuckets, emailKey, now);
    if (emailCount > MAX_PER_EMAIL) {
      return {
        ok: false,
        status: 429,
        error:
          'An inquiry with this email was already submitted recently. Please wait and try again.',
      };
    }
  }

  const phoneKey = input.phone.replace(/\D/g, '');
  if (phoneKey.length >= 7) {
    const phoneCount = touchBucket(phoneBuckets, phoneKey, now);
    if (phoneCount > MAX_PER_PHONE) {
      return {
        ok: false,
        status: 429,
        error:
          'An inquiry with this phone was already submitted recently. Please wait and try again.',
      };
    }
  }

  return { ok: true };
}

/** Undo a successful bucket touch when creation fails after the check. */
export function releaseInquiryAttempt(ip: string, email: string, phone = ''): void {
  const now = Date.now();
  const dropLast = (map: Map<string, number[]>, key: string) => {
    const times = prune(map.get(key) || [], now);
    times.pop();
    if (times.length === 0) map.delete(key);
    else map.set(key, times);
  };
  dropLast(ipBuckets, ip || 'unknown');
  if (email.trim()) dropLast(emailBuckets, email.trim().toLowerCase());
  const phoneKey = phone.replace(/\D/g, '');
  if (phoneKey.length >= 7) dropLast(phoneBuckets, phoneKey);
}
