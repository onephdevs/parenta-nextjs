import { NextResponse } from 'next/server';
import { createPipelineCard } from '@/lib/api/pipeline';
import { logActivitySafe } from '@/lib/services/activity-logger';
import pool from '@/lib/db';
import {
  checkInquirySpam,
  getClientIp,
  releaseInquiryAttempt,
} from '@/lib/public-inquiry-guard';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HERO_SOURCES = new Set(['hero_banner', 'hero']);

function digitCount(value: string): number {
  return (value.match(/\d/g) || []).length;
}

function looksLikePhone(value: string): boolean {
  const digits = digitCount(value);
  if (digits < 7) return false;
  // Prefer email when @ is present
  if (value.includes('@')) return false;
  return /^[\d\s+().\-]+$/.test(value.trim());
}

/**
 * Public homepage contact / inquiry → Onboarding pipeline (New inquiry).
 * Full form: firstName, lastName, email, phone, message→notes.
 * Hero banner: email OR phone only (source: hero_banner).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ip = getClientIp(request);
    const sourceRaw = typeof body.source === 'string' ? body.source.trim() : '';
    const isHero = HERO_SOURCES.has(sourceRaw);

    // Prefer explicit first/last; fall back to legacy single `name`
    let firstName =
      typeof body.firstName === 'string' ? body.firstName.trim() : '';
    let lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';

    if ((!firstName || !lastName) && typeof body.name === 'string') {
      const parts = body.name.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 1) {
        firstName = firstName || parts[0];
        lastName = lastName || 'Inquiry';
      } else if (parts.length >= 2) {
        firstName = firstName || parts[0];
        lastName = lastName || parts.slice(1).join(' ');
      }
    }

    let email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    let phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const contact =
      typeof body.contact === 'string' ? body.contact.trim() : '';

    // Hero: single contact field may be email or phone
    if (isHero && contact && !email && !phone) {
      if (EMAIL_RE.test(contact.toLowerCase())) {
        email = contact.toLowerCase();
      } else if (looksLikePhone(contact)) {
        phone = contact;
      } else if (contact.includes('@')) {
        email = contact.toLowerCase();
      } else if (digitCount(contact) >= 7) {
        phone = contact;
      }
    }

    const rawBuildingId =
      typeof body.buildingId === 'string' ? body.buildingId.trim() : '';
    const buildingId =
      rawBuildingId && rawBuildingId !== 'unsure' ? rawBuildingId : undefined;
    const honeypot =
      typeof body.hp_confirm === 'string'
        ? body.hp_confirm
        : typeof body.website === 'string'
          ? body.website
          : typeof body.company === 'string'
            ? body.company
            : '';

    if (!isHero) {
      if (!firstName || firstName.length < 1) {
        return NextResponse.json(
          { success: false, error: 'Please enter your first name' },
          { status: 400 }
        );
      }
      if (!lastName || lastName.length < 1) {
        return NextResponse.json(
          { success: false, error: 'Please enter your last name' },
          { status: 400 }
        );
      }
    }

    const emailOk = Boolean(email && EMAIL_RE.test(email));
    const phoneOk = Boolean(phone && digitCount(phone) >= 7);

    if (isHero) {
      if (!emailOk && !phoneOk) {
        return NextResponse.json(
          {
            success: false,
            error: 'Please enter a valid email address or phone number',
          },
          { status: 400 }
        );
      }
      if (email && !emailOk) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
      if (phone && !phoneOk && !emailOk) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid phone number' },
          { status: 400 }
        );
      }
    } else if (!emailOk) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const spam = checkInquirySpam({
      honeypot,
      formStartedAt: body.formStartedAt,
      formElapsedMs: body.formElapsedMs,
      firstName,
      lastName,
      email: emailOk ? email : '',
      phone: phoneOk ? phone : phone,
      message,
      ip,
      source: sourceRaw || undefined,
    });

    if (!spam.ok) {
      if (spam.silent) {
        return NextResponse.json({
          success: true,
          message: 'Thanks! We received your inquiry and will get back to you soon.',
        });
      }
      return NextResponse.json(
        { success: false, error: spam.error },
        { status: spam.status }
      );
    }

    // Extra DB cooldown: same email or phone already opened an inquiry in the last hour
    if (emailOk) {
      const recent = await pool.query<{ id: string }>(
        `SELECT c.id
         FROM pipeline_cards c
         INNER JOIN pipeline_boards b ON b.id = c.board_id
         WHERE b.slug = 'onboarding'
           AND LOWER(COALESCE(c.contact_email, '')) = $1
           AND c.created_at > NOW() - INTERVAL '1 hour'
         LIMIT 1`,
        [email]
      );
      if (recent.rows[0]) {
        return NextResponse.json({
          success: true,
          message:
            'Thanks! We already have your inquiry and will get back to you soon.',
          data: { id: recent.rows[0].id, duplicate: true },
        });
      }
    } else if (phoneOk) {
      const phoneDigits = phone.replace(/\D/g, '');
      const recent = await pool.query<{ id: string }>(
        `SELECT c.id
         FROM pipeline_cards c
         INNER JOIN pipeline_boards b ON b.id = c.board_id
         WHERE b.slug = 'onboarding'
           AND regexp_replace(COALESCE(c.contact_phone, ''), '\\D', '', 'g') = $1
           AND c.created_at > NOW() - INTERVAL '1 hour'
         LIMIT 1`,
        [phoneDigits]
      );
      if (recent.rows[0]) {
        return NextResponse.json({
          success: true,
          message:
            'Thanks! We already have your inquiry and will get back to you soon.',
          data: { id: recent.rows[0].id, duplicate: true },
        });
      }
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const title =
      isHero && emailOk
        ? email.split('@')[0] || fullName
        : isHero && phoneOk
          ? phone
          : fullName;

    let resolvedBuildingId: string | undefined;
    let buildingName: string | undefined;
    if (buildingId) {
      const buildingResult = await pool.query<{ id: string; name: string }>(
        `SELECT id, name FROM buildings WHERE id = $1 AND is_active = true`,
        [buildingId]
      );
      if (buildingResult.rows[0]) {
        resolvedBuildingId = buildingResult.rows[0].id;
        buildingName = buildingResult.rows[0].name;
      }
    }

    const notesParts = [
      isHero ? 'Submitted from homepage hero' : null,
      buildingName ? `Interested in: ${buildingName}` : null,
      message || null,
    ].filter(Boolean);

    let card;
    try {
      card = await createPipelineCard({
        boardSlug: 'onboarding',
        stageSlug: 'new_inquiry',
        title: isHero ? `Inquiry · ${title}` : fullName,
        contactFirstName: isHero ? '' : firstName,
        contactLastName: isHero ? '' : lastName,
        contactEmail: emailOk ? email : undefined,
        contactPhone: phoneOk ? phone : phone || undefined,
        buildingId: resolvedBuildingId,
        source: isHero ? 'Website hero' : 'Website',
        tags: isHero ? ['Website inquiry', 'Hero'] : ['Website inquiry'],
        notes: notesParts.length ? notesParts.join('\n\n') : undefined,
      });
    } catch (err) {
      releaseInquiryAttempt(ip, emailOk ? email : '', phoneOk ? phone : '');
      throw err;
    }

    logActivitySafe({
      actorUserId: null,
      actorRole: 'system',
      actionType: 'pipeline.website_inquiry',
      category: 'leases',
      entityType: 'pipeline_card',
      entityId: card.id,
      entityLabel: card.title,
      metadata: {
        email: emailOk ? email : null,
        phone: phoneOk ? phone : null,
        hasMessage: Boolean(message),
        buildingId: resolvedBuildingId || null,
        buildingName: buildingName || null,
        source: isHero ? 'website_hero' : 'website_contact',
        ip,
      },
      link: '/admin/tenants/inquiries',
      skipNotifications: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Thanks! We received your inquiry and will get back to you soon.',
      data: { id: card.id },
    });
  } catch (err) {
    console.error('Public inquiry API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to submit your inquiry right now. Please try again later.',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
