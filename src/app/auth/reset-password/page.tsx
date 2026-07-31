'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, KeyRound } from 'lucide-react';
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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const roleParam = searchParams.get('role');
  const role: Role =
    roleParam === 'admin' || roleParam === 'tenant' || roleParam === 'staff'
      ? roleParam
      : 'admin';
  const signInHref = signInPaths[role];

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to reset password');
        return;
      }

      setSuccess(data.message);
      const nextRole: Role =
        data.role === 'admin' || data.role === 'tenant' || data.role === 'staff'
          ? data.role
          : role;
      setTimeout(() => {
        router.push(signInPaths[nextRole]);
      }, 1500);
    } catch {
      setError('Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Card className="p-8 max-w-md w-full">
          <Alert variant="danger" title="Invalid link">
            This password reset link is missing a token. Request a new link from the forgot
            password page.
          </Alert>
          <Link href={`/auth/forgot-password?role=${role}`} className="block mt-6">
            <Button className="w-full">Request a new reset link</Button>
          </Link>
        </Card>
      </div>
    );
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
              <KeyRound className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Set a new password
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Choose a password with at least 8 characters.
          </p>

          {success && (
            <Alert variant="success" title="Password updated" className="mb-4">
              {success}
            </Alert>
          )}
          {error && (
            <Alert variant="danger" title="Reset failed" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="New password" htmlFor="newPassword" required>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </FormField>
            <FormField label="Confirm password" htmlFor="confirmPassword" required>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </FormField>

            <Button type="submit" className="w-full" isLoading={loading} disabled={!!success}>
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
