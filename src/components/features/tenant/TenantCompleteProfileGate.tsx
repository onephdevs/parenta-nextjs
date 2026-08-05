'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';

interface ProfileDraft {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone: string;
}

/**
 * Blocking modal shown until the tenant finishes first-login profile setup.
 */
export default function TenantCompleteProfileGate() {
  const { data: session, update } = useSession();
  const [needed, setNeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileDraft>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
  });

  useEffect(() => {
    if (!session?.user?.id || session.user.role !== 'tenant') {
      setLoading(false);
      setNeeded(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/tenant/complete-profile');
        const json = await res.json();
        if (cancelled) return;
        if (!json.success) {
          setNeeded(session.user.profileCompleted === false);
          setLoading(false);
          return;
        }
        const data = json.data;
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          username: data.username || '',
          phone: data.phone || '',
        });
        setNeeded(data.profileCompleted === false);
      } catch {
        if (!cancelled) setNeeded(session.user.profileCompleted === false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.user?.role, session?.user?.profileCompleted]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/tenant/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to save profile');
      }

      await update({
        firstName: json.data.firstName,
        lastName: json.data.lastName,
        email: json.data.email,
        username: json.data.username,
        profileCompleted: true,
      });

      setNeeded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !needed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-profile-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="complete-profile-title" className="text-xl font-semibold text-gray-900">
          Complete your account
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Before you continue, please add your email and update your name, username, and phone
          number.
        </p>

        {error && <FormErrorBanner message={error} className="mt-4" />}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="First name" htmlFor="firstName" required>
              <Input
                id="firstName"
                name="firstName"
                required
                value={form.firstName}
                onChange={handleChange}
                autoComplete="given-name"
              />
            </FormField>
            <FormField label="Last name" htmlFor="lastName" required>
              <Input
                id="lastName"
                name="lastName"
                required
                value={form.lastName}
                onChange={handleChange}
                autoComplete="family-name"
              />
            </FormField>
          </div>

          <FormField label="Email" htmlFor="email" required hint="Used for notices and account recovery.">
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </FormField>

          <FormField
            label="Username"
            htmlFor="username"
            required
            hint="You can keep the current username or choose a new one."
          >
            <Input
              id="username"
              name="username"
              required
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </FormField>

          <FormField label="Phone number" htmlFor="phone" required>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              placeholder="09XXXXXXXXX"
            />
          </FormField>

          <Button type="submit" variant="primary" className="w-full" isLoading={saving}>
            Save and continue
          </Button>
        </form>
      </div>
    </div>
  );
}
