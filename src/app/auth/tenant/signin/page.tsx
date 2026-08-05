'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Alert } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';
import { AuthSplitShell, AuthHeroPanel } from '@/components/features/auth/AuthSplitShell';
import {
  AuthField,
  AuthPasswordField,
  AuthPrimaryButton,
} from '@/components/features/auth/AuthFields';

export default function TenantSignIn() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: username.trim(),
        password,
        role: 'tenant',
      });

      if (result?.error) {
        setError('Invalid username or password');
      } else {
        if (rememberMe) {
          // Session cookie persistence is handled by NextAuth JWT maxAge defaults.
        }
        router.push('/tenant');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitShell left={<AuthHeroPanel />}>
      <div>
        <div className="mb-6 flex justify-center sm:justify-start">
          <BrandLogo variant="full" height={44} priority />
        </div>
        <div className="mb-8 border-t border-gray-200 pt-8">
          <h2 className="text-3xl font-bold text-gray-900">Log in</h2>
        </div>

        {error && (
          <Alert variant="danger" className="mb-5">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username or email"
            aria-label="Username or email"
          />

          <AuthPasswordField
            id="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
          />

          <div className="flex items-center justify-between pt-1">
            <Checkbox
              id="remember-me"
              name="remember-me"
              label="Remember me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="text-gray-700"
            />
            <Link
              href="/auth/forgot-password?role=tenant"
              className="text-sm font-medium text-[#3B82F6] hover:text-blue-600"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="pt-2">
            <AuthPrimaryButton isLoading={isLoading}>Login</AuthPrimaryButton>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            className="font-semibold text-[#3B82F6] hover:text-blue-600"
          >
            Register here
          </Link>
        </p>
        <div className="mt-6 border-t border-gray-200" />
      </div>
    </AuthSplitShell>
  );
}
