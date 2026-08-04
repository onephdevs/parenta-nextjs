'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

export function HomeContactForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  /** Honeypot — leave empty. Bots often autofill this. */
  const [website, setWebsite] = useState('');
  const formStartedAt = useRef<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
          message,
          website,
          formStartedAt: formStartedAt.current,
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
      setMessage('');
      setWebsite('');
      formStartedAt.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="mb-3 h-10 w-10 text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-900">Inquiry sent</h3>
          <p className="mt-2 text-sm text-gray-600">{success}</p>
          <button
            type="button"
            onClick={() => {
              setSuccess(null);
              formStartedAt.current = Date.now();
            }}
            className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700"
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
      className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h3 className="text-lg font-semibold text-gray-900">Send an inquiry</h3>
      <p className="mt-1 text-sm text-gray-500">
        We&apos;ll add you to our onboarding list and reach out shortly.
      </p>

      <div className="mt-6 space-y-4">
        {/* Honeypot: hidden from users, visible to naive bots */}
        <div
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
          aria-hidden="true"
        >
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-first-name" className="block text-sm font-medium text-gray-700">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-first-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Maria"
              autoComplete="given-name"
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="contact-last-name" className="block text-sm font-medium text-gray-700">
              Last name <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-last-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Lopez"
              autoComplete="family-name"
              maxLength={80}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="maria@email.com"
              autoComplete="email"
              maxLength={160}
            />
          </div>
          <div>
            <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700">
              Phone <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="+63…"
              autoComplete="tel"
              maxLength={40}
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700">
            Message <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="contact-message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="Which building or unit are you interested in?"
            maxLength={2000}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
