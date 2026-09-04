'use client';

import type { ReactNode } from 'react';
import { Building2, Mail, Phone } from 'lucide-react';
import type { PipelineCard } from '@/types/database';
import {
  inquiryContactName,
  inquirySourceLabel,
  parseInquirySubmission,
  formatInquiryTicketNumber,
} from '@/lib/inquiries';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui';

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="mt-0.5 break-words text-sm text-gray-900">{children}</div>
    </div>
  );
}

export function InquiryTicketHeader({ card }: { card: PipelineCard }) {
  const submission = parseInquirySubmission(card);
  const email = card.contactEmail?.trim() || '';
  const phone = card.contactPhone?.trim() || '';
  const interestedIn = submission.interestedIn || card.buildingName || '';
  const unit = card.roomNumber?.trim() || '';

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-xs text-gray-500">
          {formatInquiryTicketNumber(card.id)}
        </p>
        <Badge variant="dot" tone="info">
          {inquirySourceLabel(card)}
        </Badge>
        {card.createdAt ? (
          <span className="text-xs text-gray-500">{formatDateTime(card.createdAt)}</span>
        ) : null}
      </div>
      <h1
        id="inquiry-ticket-slider-title"
        className="mt-1 text-lg font-semibold text-gray-900 sm:text-xl"
      >
        {inquiryContactName(card)}
      </h1>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Detail label="Email">
          {email ? (
            <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 hover:underline">
              <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {email}
            </a>
          ) : (
            <span className="text-gray-400">Not provided</span>
          )}
        </Detail>
        <Detail label="Phone">
          {phone ? (
            <a href={telHref(phone)} className="inline-flex items-center gap-1.5 hover:underline">
              <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {phone}
            </a>
          ) : (
            <span className="text-gray-400">Not provided</span>
          )}
        </Detail>
        <Detail label="Interested in">
          {interestedIn ? (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {interestedIn}
            </span>
          ) : (
            <span className="text-gray-400">Not selected</span>
          )}
        </Detail>
        <Detail label="Unit">
          {unit || <span className="text-gray-400">Not assigned</span>}
        </Detail>
      </div>

      {submission.formMessage ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Message from the form
          </p>
          <p className="mt-1 max-h-28 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {submission.formMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}
