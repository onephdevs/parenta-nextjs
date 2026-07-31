'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Alert } from '@/components/ui/Alert';
import { AuthSplitShell, AuthHeroPanel } from '@/components/features/auth/AuthSplitShell';
import {
  AuthPasswordField,
  AuthPrimaryButton,
} from '@/components/features/auth/AuthFields';

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
      : 'tenant';
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
      <AuthSplitShell left={<AuthHeroPanel />}>
        <div>
          <div className="mb-6 flex justify-center sm:justify-start">
            <BrandLogo variant="full" height={44} priority />
          </div>
          <div className="mb-8 border-t border-gray-200 pt-8">
            <h2 className="text-3xl font-bold text-gray-900">Invalid link</h2>
            <p className="mt-2 text-sm text-gray-500">
              This password reset link is missing a token. Request a new link from the forgot
              password page.
            </p>
          </div>
          <Link href={`/auth/forgot-password?role=${role}`}>
            <AuthPrimaryButton type="button">Request a new reset link</AuthPrimaryButton>
          </Link>
        </div>
      </AuthSplitShell>
    );
  }

  return (
    <AuthSplitShell left={<AuthHeroPanel />}>
      <div>
        <div className="mb-6 flex justify-center sm:justify-start">
          <BrandLogo variant="full" height={44} priority />
        </div>
        <div className="mb-8 border-t border-gray-200 pt-8">
          <h2 className="text-3xl font-bold text-gray-900">Set a new password</h2>
          <p className="mt-2 text-sm text-gray-500">
            Choose a password with at least 8 characters.
          </p>
        </div>

        {success && (
          <Alert variant="success" title="Password updated" className="mb-5">
            {success}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" title="Reset failed" className="mb-5">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthPasswordField
            id="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            minLength={8}
            required
            aria-label="New password"
          />
          <AuthPasswordField
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            minLength={8}
            required
            aria-label="Confirm password"
          />

          <div className="pt-2">
            <AuthPrimaryButton isLoading={loading} disabled={!!success}>
              Update password
            </AuthPrimaryButton>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthSplitShell left={<AuthHeroPanel />}>
          <div className="animate-pulse text-gray-500">Loading...</div>
        </AuthSplitShell>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
