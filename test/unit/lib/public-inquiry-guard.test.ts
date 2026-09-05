import { describe, expect, it } from 'vitest';

import {
  checkInquirySpam,
  getClientIp,
  resolveFormElapsedMs,
} from '@/lib/public-inquiry-guard';

const valid = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: `ada-${Date.now()}@example.com`,
  phone: '09171234567',
  message: 'Looking for a unit',
  ip: `203.0.113.${Math.floor(Math.random() * 200)}`,
  formElapsedMs: 4000,
};

describe('public inquiry spam guard', () => {
  it('reads the first forwarded IP', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': ' 1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });

  it('prefers client-reported elapsed time over formStartedAt', () => {
    expect(resolveFormElapsedMs({ formElapsedMs: 3000, formStartedAt: Date.now() })).toBe(3000);
  });

  it('silently rejects honeypot submissions', () => {
    expect(checkInquirySpam({ ...valid, honeypot: 'bot' })).toEqual({
      ok: false,
      status: 200,
      error: 'ok',
      silent: true,
    });
  });

  it('rejects submissions that are too fast', () => {
    const result = checkInquirySpam({ ...valid, formElapsedMs: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(429);
  });

  it('accepts a human-paced form', () => {
    expect(checkInquirySpam({ ...valid, email: `ok-${Math.random()}@ex.com` }).ok).toBe(true);
  });
});
