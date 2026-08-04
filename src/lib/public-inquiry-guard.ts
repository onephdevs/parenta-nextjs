/**
 * Lightweight spam guards for the public homepage inquiry form.
 * In-memory limits work per Node process (local / single PM2 instance).
 * Email cooldown also checks recent pipeline cards in the DB.
 */

const ipBuckets = new Map<string, number[]>();
const emailBuckets = new Map<string, number[]>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 2;
const MIN_SUBMIT_MS = 2500; // humans need a couple seconds to fill the form
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
  formStartedAt?: number | string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  ip: string;
}

export type InquirySpamResult =
  | { ok: true }
  | { ok: false; status: number; error: string; silent?: boolean };

export function checkInquirySpam(input: InquirySpamCheckInput): InquirySpamResult {
  const honeypot = typeof input.honeypot === 'string' ? input.honeypot.trim() : '';
  // Bots that fill hidden fields — pretend success so they don't retry harder.
  if (honeypot.length > 0) {
    return { ok: false, status: 200, error: 'ok', silent: true };
  }

  const startedRaw = input.formStartedAt;
  const startedAt =
    typeof startedRaw === 'number'
      ? startedRaw
      : typeof startedRaw === 'string'
        ? Number(startedRaw)
        : NaN;
  const now = Date.now();
  if (!Number.isFinite(startedAt) || startedAt > now + 5_000) {
    return { ok: false, status: 400, error: 'Please reload the page and try again.' };
  }
  if (now - startedAt < MIN_SUBMIT_MS) {
    return {
      ok: false,
      status: 429,
      error: 'Submitted too quickly. Please wait a moment and try again.',
    };
  }
  // Forms open longer than a day are likely stale / replayed
  if (now - startedAt > 24 * 60 * 60 * 1000) {
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

  const ipCount = touchBucket(ipBuckets, input.ip || 'unknown', now);
  if (ipCount > MAX_PER_IP) {
    return {
      ok: false,
      status: 429,
      error: 'Too many inquiries from this network. Please try again later.',
    };
  }

  const emailKey = input.email.trim().toLowerCase();
  const emailCount = touchBucket(emailBuckets, emailKey, now);
  if (emailCount > MAX_PER_EMAIL) {
    return {
      ok: false,
      status: 429,
      error: 'An inquiry with this email was already submitted recently. Please wait and try again.',
    };
  }

  return { ok: true };
}

/** Undo a successful bucket touch when creation fails after the check. */
export function releaseInquiryAttempt(ip: string, email: string): void {
  const now = Date.now();
  const dropLast = (map: Map<string, number[]>, key: string) => {
    const times = prune(map.get(key) || [], now);
    times.pop();
    if (times.length === 0) map.delete(key);
    else map.set(key, times);
  };
  dropLast(ipBuckets, ip || 'unknown');
  dropLast(emailBuckets, email.trim().toLowerCase());
}
