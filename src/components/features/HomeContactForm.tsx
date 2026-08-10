'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  User,
} from 'lucide-react';

interface AvailableBuilding {
  id: string;
  name: string;
  availableUnits: number;
}

interface HomeContactFormProps {
  availableBuildings?: AvailableBuilding[];
  /** Match landing page palette */
  variant?: 'light' | 'dark';
  /** When false, parent supplies the card chrome (landing already wraps it) */
  framed?: boolean;
}

export function HomeContactForm({
  availableBuildings = [],
  variant = 'light',
  framed = true,
}: HomeContactFormProps) {
  const dark = variant === 'dark';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [buildingId, setBuildingId] = useState('unsure');
  const [message, setMessage] = useState('');
  /**
   * Honeypot — must stay empty.
   * Avoid names like "website" / "url" / "company": password managers autofill them
   * and the API then returns a fake success without creating the opportunity.
   */
  const [honeypot, setHoneypot] = useState('');
  const formStartedAt = useRef<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const labelClass = dark
    ? 'mb-1.5 block text-sm font-medium text-white/75'
    : 'mb-1.5 block text-sm font-medium text-[#374151]';
  const inputClass = dark
    ? 'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30 focus:ring-2 focus:ring-white/15'
    : 'w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] hover:border-slate-300 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15';
  const fieldShell = 'space-y-1.5';

  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
    });
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          buildingId: buildingId || undefined,
          message,
          hp_confirm: honeypot,
          formStartedAt: formStartedAt.current,
          formElapsedMs: Date.now() - formStartedAt.current,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Submission failed');
      }
      setSuccess(json.message || 'Thanks! We received your inquiry.');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setBuildingId('unsure');
      setMessage('');
      setHoneypot('');
      setTouched({});
      formStartedAt.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const markTouched = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const showInvalid = (name: string, value: string, required = true) =>
    required && touched[name] && !value.trim();

  const frameClass = framed
    ? dark
      ? 'relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8'
      : 'relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'
    : 'relative';

  if (success) {
    return (
      <div
        className={
          dark
            ? 'rounded-2xl border border-white/10 bg-white/5 p-8'
            : 'rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-8 shadow-sm'
        }
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={
              dark
                ? 'mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-black/25'
                : 'mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700'
            }
          >
            <CheckCircle2 className={`h-6 w-6 ${dark ? 'text-white' : ''}`} />
          </div>
          <h3 className={`text-xl font-semibold ${dark ? 'text-white' : 'text-[#111827]'}`}>
            Inquiry sent
          </h3>
          <p className={`mt-2 max-w-sm text-sm leading-relaxed ${dark ? 'text-white/65' : 'text-[#6B7280]'}`}>
            {success}
          </p>
          <button
            type="button"
            onClick={() => {
              setSuccess(null);
              formStartedAt.current = Date.now();
            }}
            className={`mt-6 inline-flex items-center gap-1.5 text-sm font-semibold ${
              dark
                ? 'text-white underline-offset-4 hover:underline'
                : 'text-[#2563EB] hover:text-[#1D4ED8]'
            }`}
          >
            Send another
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={frameClass} autoComplete="on">
      <div className="flex items-start gap-3">
        <div
          className={
            dark
              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]'
          }
        >
          <Mail className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-[#111827]'}`}>
            Send an inquiry
          </h3>
          <p className={`mt-1 text-sm leading-relaxed ${dark ? 'text-white/55' : 'text-[#6B7280]'}`}>
            Tell us how to reach you — we&apos;ll follow up about available units.
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-5">
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="contact-hp-confirm">Leave blank</label>
          <input
            id="contact-hp-confirm"
            name="hp_confirm"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div>
          <p
            className={`mb-3 text-xs font-semibold tracking-wide uppercase ${
              dark ? 'text-white/40' : 'text-[#9CA3AF]'
            }`}
          >
            Your details
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className={fieldShell}>
              <label htmlFor="contact-first-name" className={labelClass}>
                First name
              </label>
              <div className="relative">
                <User
                  className={`pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 ${
                    dark ? 'text-white/35' : 'text-[#9CA3AF]'
                  }`}
                />
                <input
                  id="contact-first-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => markTouched('firstName')}
                  className={`${inputClass} pl-9 ${
                    showInvalid('firstName', firstName)
                      ? dark
                        ? 'border-red-400/50'
                        : 'border-red-300 focus:border-red-400 focus:ring-red-200'
                      : ''
                  }`}
                  placeholder="Maria"
                  autoComplete="given-name"
                  maxLength={80}
                />
              </div>
            </div>
            <div className={fieldShell}>
              <label htmlFor="contact-last-name" className={labelClass}>
                Last name
              </label>
              <input
                id="contact-last-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => markTouched('lastName')}
                className={`${inputClass} ${
                  showInvalid('lastName', lastName)
                    ? dark
                      ? 'border-red-400/50'
                      : 'border-red-300 focus:border-red-400 focus:ring-red-200'
                    : ''
                }`}
                placeholder="Lopez"
                autoComplete="family-name"
                maxLength={80}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldShell}>
            <label htmlFor="contact-email" className={labelClass}>
              Email
            </label>
            <div className="relative">
              <Mail
                className={`pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 ${
                  dark ? 'text-white/35' : 'text-[#9CA3AF]'
                }`}
              />
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched('email')}
                className={`${inputClass} pl-9 ${
                  showInvalid('email', email)
                    ? dark
                      ? 'border-red-400/50'
                      : 'border-red-300 focus:border-red-400 focus:ring-red-200'
                    : ''
                }`}
                placeholder="maria@email.com"
                autoComplete="email"
                maxLength={160}
              />
            </div>
          </div>
          <div className={fieldShell}>
            <label htmlFor="contact-phone" className={labelClass}>
              Phone{' '}
              <span className={`font-normal ${dark ? 'text-white/35' : 'text-[#9CA3AF]'}`}>
                optional
              </span>
            </label>
            <div className="relative">
              <Phone
                className={`pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 ${
                  dark ? 'text-white/35' : 'text-[#9CA3AF]'
                }`}
              />
              <input
                id="contact-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${inputClass} pl-9`}
                placeholder="+63…"
                autoComplete="tel"
                maxLength={40}
              />
            </div>
          </div>
        </div>

        {availableBuildings.length > 0 && (
          <div>
            <p
              className={`mb-3 text-xs font-semibold tracking-wide uppercase ${
                dark ? 'text-white/40' : 'text-[#9CA3AF]'
              }`}
            >
              Interest
            </p>
            <div className={fieldShell}>
              <label htmlFor="contact-building" className={labelClass}>
                Which property are you interested in?
              </label>
              <div className="relative">
                <Building2
                  className={`pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 ${
                    dark ? 'text-white/35' : 'text-[#9CA3AF]'
                  }`}
                />
                <select
                  id="contact-building"
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  className={`${inputClass} appearance-none pl-9 pr-10 ${
                    dark ? 'bg-[#111]' : ''
                  }`}
                >
                  <option value="unsure">Not sure yet / general inquiry</option>
                  {availableBuildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.availableUnits} unit
                      {b.availableUnits === 1 ? '' : 's'} available
                    </option>
                  ))}
                </select>
                <span
                  className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs ${
                    dark ? 'text-white/40' : 'text-[#9CA3AF]'
                  }`}
                  aria-hidden
                >
                  ▾
                </span>
              </div>
              {buildingId !== 'unsure' && (
                <p className={`mt-2 text-xs ${dark ? 'text-white/45' : 'text-[#6B7280]'}`}>
                  We&apos;ll prioritize openings at this property when we follow up.
                </p>
              )}
            </div>
          </div>
        )}

        <div className={fieldShell}>
          <label htmlFor="contact-message" className={labelClass}>
            Anything else we should know?{' '}
            <span className={`font-normal ${dark ? 'text-white/35' : 'text-[#9CA3AF]'}`}>
              optional
            </span>
          </label>
          <div className="relative">
            <MessageSquare
              className={`pointer-events-none absolute top-3.5 left-3 h-4 w-4 ${
                dark ? 'text-white/35' : 'text-[#9CA3AF]'
              }`}
            />
            <textarea
              id="contact-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputClass} resize-y pl-9`}
              placeholder="Move-in timeline, preferred unit size, questions…"
              maxLength={2000}
            />
          </div>
        </div>
      </div>

      {error && (
        <div
          className={
            dark
              ? 'mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200'
              : 'mt-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700'
          }
          role="alert"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={
          dark
            ? 'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60'
            : 'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60'
        }
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            Submit inquiry
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p
        className={`mt-3 text-center text-xs ${dark ? 'text-white/40' : 'text-[#9CA3AF]'}`}
      >
        No spam — we only use this to follow up on your inquiry.
      </p>
    </form>
  );
}
