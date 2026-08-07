'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

interface AvailableBuilding {
  id: string;
  name: string;
  availableUnits: number;
}

interface HomeContactFormProps {
  availableBuildings?: AvailableBuilding[];
  /** Match landing page dark palette */
  variant?: 'light' | 'dark';
}

export function HomeContactForm({
  availableBuildings = [],
  variant = 'light',
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

  const labelClass = dark
    ? 'block text-sm font-medium text-white/70'
    : 'block text-sm font-medium text-gray-700';
  const inputClass = dark
    ? 'mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white shadow-none outline-none placeholder:text-white/35 focus:border-white/30 focus:ring-2 focus:ring-white/15'
    : 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      formStartedAt.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div
        className={
          dark
            ? 'rounded-3xl border border-white/10 bg-white/5 p-8'
            : 'rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm'
        }
      >
        <div className="flex flex-col items-center text-center">
          <CheckCircle className={`mb-3 h-10 w-10 ${dark ? 'text-white' : 'text-emerald-600'}`} />
          <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
            Inquiry sent
          </h3>
          <p className={`mt-2 text-sm ${dark ? 'text-white/65' : 'text-gray-600'}`}>{success}</p>
          <button
            type="button"
            onClick={() => {
              setSuccess(null);
              formStartedAt.current = Date.now();
            }}
            className={`mt-6 text-sm font-medium ${
              dark ? 'text-white underline-offset-4 hover:underline' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        dark
          ? 'relative rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8'
          : 'relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8'
      }
      autoComplete="on"
    >
      <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
        Send an inquiry
      </h3>
      <p className={`mt-1 text-sm ${dark ? 'text-white/55' : 'text-gray-500'}`}>
        We&apos;ll add you to our onboarding list and reach out shortly.
      </p>

      <div className="mt-6 space-y-4">
        <div
          className="sr-only"
          aria-hidden="true"
        >
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-first-name" className={labelClass}>
              First name <span className={dark ? 'text-white/40' : 'text-red-500'}>*</span>
            </label>
            <input
              id="contact-first-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              placeholder="Maria"
              autoComplete="given-name"
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="contact-last-name" className={labelClass}>
              Last name <span className={dark ? 'text-white/40' : 'text-red-500'}>*</span>
            </label>
            <input
              id="contact-last-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              placeholder="Lopez"
              autoComplete="family-name"
              maxLength={80}
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email <span className={dark ? 'text-white/40' : 'text-red-500'}>*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="maria@email.com"
            autoComplete="email"
            maxLength={160}
          />
        </div>

        <div>
          <label htmlFor="contact-phone" className={labelClass}>
            Phone <span className={dark ? 'text-white/35' : 'text-gray-400'}>(optional)</span>
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="+63…"
            autoComplete="tel"
            maxLength={40}
          />
        </div>

        {availableBuildings.length > 0 && (
          <div>
            <label htmlFor="contact-building" className={labelClass}>
              Which unit are you interested in?
            </label>
            <select
              id="contact-building"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className={
                dark
                  ? `${inputClass} bg-[#111]`
                  : 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              }
            >
              <option value="unsure">Not sure yet / general inquiry</option>
              {availableBuildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.availableUnits} unit{b.availableUnits === 1 ? '' : 's'} available
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="contact-message" className={labelClass}>
            Anything else we should know?{' '}
            <span className={dark ? 'text-white/35' : 'text-gray-400'}>(optional)</span>
          </label>
          <textarea
            id="contact-message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={inputClass}
            placeholder="Move-in timeline, preferred unit size, questions…"
            maxLength={2000}
          />
        </div>
      </div>

      {error && (
        <div
          className={
            dark
              ? 'mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200'
              : 'mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          }
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={
          dark
            ? 'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60'
            : 'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
        }
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          'Submit inquiry'
        )}
      </button>
    </form>
  );
}
