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

/**
 * Public homepage contact / inquiry → Onboarding pipeline (New inquiry).
 * Fields map 1:1 to Add Opportunity Contact: firstName, lastName, email, phone, message→notes.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ip = getClientIp(request);

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

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    // Prefer obscure honeypot name; still accept legacy "website"/"company" from old clients/bots
    const honeypot =
      typeof body.hp_confirm === 'string'
        ? body.hp_confirm
        : typeof body.website === 'string'
          ? body.website
          : typeof body.company === 'string'
            ? body.company
            : '';

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

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const spam = checkInquirySpam({
      honeypot,
      formStartedAt: body.formStartedAt,
      firstName,
      lastName,
      email,
      phone,
      message,
      ip,
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

    // Extra DB cooldown: same email already opened an inquiry in the last hour
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

    const fullName = `${firstName} ${lastName}`.trim();

    let card;
    try {
      card = await createPipelineCard({
        boardSlug: 'onboarding',
        stageSlug: 'new_inquiry',
        title: fullName,
        contactFirstName: firstName,
        contactLastName: lastName,
        contactEmail: email,
        contactPhone: phone || undefined,
        source: 'Website',
        tags: ['Website inquiry'],
        notes: message || undefined,
      });
    } catch (err) {
      releaseInquiryAttempt(ip, email);
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
        email,
        phone: phone || null,
        hasMessage: Boolean(message),
        source: 'website_contact',
        ip,
      },
      link: '/admin/tasks',
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
