import { Suspense } from 'react';
import { AuthForm } from '@/components/features/AuthForm';
import type { UserRole } from '@/types/auth.types';

interface SignUpPageProps {
  searchParams: Promise<{ role?: string }>;
}

async function SignUpContent({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const role = (params.role as UserRole) || 'tenant';
  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center ${
            isAdmin ? 'bg-purple-100' : 'bg-blue-100'
          }`}>
            {isAdmin ? (
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            )}
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create {isAdmin ? 'Admin' : 'Tenant'} Account
          </h2>
          <p className="mt-2 text-sm text-gray-900">
            Join our platform as a {isAdmin ? 'system administrator' : 'tenant user'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <AuthForm mode="signup" defaultRole={role} />
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-900">
            By creating an account, you agree to our terms of service
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SignUpContent searchParams={searchParams} />
    </Suspense>
  );
} 