'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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
            <div className="bg-purple-100 p-3 rounded-xl">
              <Mail className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Forgot password?
          </h1>
          <p className="text-gray-600 text-center mb-6">
            To reset your {label.toLowerCase()} account password, please contact your administrator or support.
          </p>

          <div className="space-y-4 text-sm text-gray-700">
            <p>
              <strong className="text-gray-900">Option 1:</strong> Contact your property administrator to request a password reset.
            </p>
            <p>
              <strong className="text-gray-900">Option 2:</strong> Email support at{' '}
              <a
                href="mailto:support@parenta.com"
                className="text-purple-600 hover:underline font-medium"
              >
                support@parenta.com
              </a>{' '}
              with your registered email and account type ({label}).
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link href={signInHref} className="block">
              <Button className="w-full" leftIcon={<ArrowLeft className="h-4 w-4" />}>
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
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
