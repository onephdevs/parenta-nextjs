'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Alert } from '@/components/ui/Alert';
import { AuthSplitShell, AuthHeroPanel } from '@/components/features/auth/AuthSplitShell';
import {
  AuthField,
  AuthPrimaryButton,
} from '@/components/features/auth/AuthFields';

type Role = 'admin' | 'tenant' | 'staff';

const signInPaths: Record<Role, string> = {
  admin: '/auth/admin/signin',
  tenant: '/auth/tenant/signin',
  staff: '/auth/staff/signin',
};

const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  tenant: 'Tenant',
  staff: 'Staff',
};

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const role: Role =
    roleParam === 'admin' || roleParam === 'tenant' || roleParam === 'staff'
      ? roleParam
      : 'tenant';
  const signInHref = signInPaths[role];
  const label = roleLabels[role];

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setWarning(null);
    setDevResetUrl(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role: role === 'staff' ? undefined : role,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to send reset email');
        return;
      }

      setMessage(data.message);
      if (data.warning) setWarning(data.warning);
      if (data.resetUrl) setDevResetUrl(data.resetUrl);
    } catch {
      setError('Unable to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitShell left={<AuthHeroPanel />}>
      <div>
        <div className="mb-6 flex justify-center sm:justify-start">
          <BrandLogo variant="full" height={44} priority />
        </div>
        <div className="mb-8 border-t border-gray-200 pt-8">
          <h2 className="text-3xl font-bold text-gray-900">Forgot password?</h2>
          <p className="mt-2 text-sm text-gray-500">
            Enter the email for your {label.toLowerCase()} account and we&apos;ll send a reset
            link.
          </p>
        </div>

        {message && (
          <Alert variant="success" title="Check your email" className="mb-5">
            {message}
          </Alert>
        )}
        {warning && (
          <Alert variant="warning" title="Email not sent" className="mb-5">
            {warning}
            {devResetUrl && (
              <p className="mt-2 break-all">
                Dev reset link:{' '}
                <Link href={devResetUrl} className="underline font-medium">
                  Open reset page
                </Link>
              </p>
            )}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" title="Request failed" className="mb-5">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            aria-label="Email"
          />

          <div className="pt-2">
            <AuthPrimaryButton isLoading={loading}>Send reset link</AuthPrimaryButton>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link
            href={signInHref}
            className="font-semibold text-[#3B82F6] hover:text-blue-600"
          >
            Back to Login
          </Link>
        </p>
        <div className="mt-6 border-t border-gray-200" />
      </div>
    </AuthSplitShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthSplitShell left={<AuthHeroPanel />}>
          <div className="animate-pulse text-gray-500">Loading...</div>
        </AuthSplitShell>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
