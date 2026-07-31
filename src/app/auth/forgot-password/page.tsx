'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

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
      : 'admin';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Link
          href={signInHref}
          className="inline-flex items-center text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 mb-8 transition"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to sign in
        </Link>

        <Card className="p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Forgot password?
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Enter the email for your {label.toLowerCase()} account and we&apos;ll send a reset
            link.
          </p>

          {message && (
            <Alert variant="success" title="Check your email" className="mb-4">
              {message}
            </Alert>
          )}
          {warning && (
            <Alert variant="warning" title="Email not sent" className="mb-4">
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
            <Alert variant="danger" title="Request failed" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </FormField>

            <Button type="submit" className="w-full" isLoading={loading}>
              Send reset link
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link href={signInHref} className="block">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Return to {label} sign in
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
