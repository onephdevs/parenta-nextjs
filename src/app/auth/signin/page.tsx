import { Suspense } from 'react';
import { AuthForm } from '@/components/features/AuthForm';
import type { UserRole } from '@/types/auth.types';

interface SignInPageProps {
  searchParams: Promise<{ role?: string }>;
}

async function SignInContent({ searchParams }: SignInPageProps) {
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )}
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {isAdmin ? 'Admin Portal' : 'Tenant Portal'}
          </h2>
          <p className="mt-2 text-sm text-gray-900">
            Sign in to your {isAdmin ? 'admin' : 'tenant'} account
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <AuthForm mode="signin" defaultRole={role} />
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-900">
            Secure login powered by NextAuth.js
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
} 