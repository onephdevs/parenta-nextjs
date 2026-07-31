'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AuthSplitShell, AuthHeroPanel } from '@/components/features/auth/AuthSplitShell';
import {
  AuthField,
  AuthPasswordField,
  AuthPrimaryButton,
} from '@/components/features/auth/AuthFields';
import { RegistrationSuccessModal } from '@/components/features/auth/RegistrationSuccessModal';

interface SignUpFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export default function SignUpPage() {
  const [form, setForm] = useState<SignUpFormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const updateField = (key: keyof SignUpFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          username: form.username.trim() || undefined,
          role: 'tenant',
          pendingActivation: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Failed to create account');
        return;
      }

      setShowSuccess(true);
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthSplitShell left={<AuthHeroPanel />}>
        <div>
          <div className="mb-6 flex justify-center lg:hidden">
            <BrandLogo variant="full" height={40} priority />
          </div>
          <h2 className="mb-8 text-3xl font-bold text-gray-900">Create your account</h2>

          {error && (
            <Alert variant="danger" className="mb-5">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <AuthField
                id="firstName"
                name="firstName"
                required
                value={form.firstName}
                onChange={updateField('firstName')}
                placeholder="First Name"
                autoComplete="given-name"
              />
              <AuthField
                id="lastName"
                name="lastName"
                required
                value={form.lastName}
                onChange={updateField('lastName')}
                placeholder="Last Name"
                autoComplete="family-name"
              />
            </div>

            <AuthField
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={updateField('email')}
              placeholder="Email"
              autoComplete="email"
            />

            <AuthField
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={updateField('phone')}
              placeholder="Phone / Mobile Number"
              autoComplete="tel"
            />

            <div className="border-t border-gray-200 pt-3.5">
              <AuthField
                id="username"
                name="username"
                required
                value={form.username}
                onChange={updateField('username')}
                placeholder="Username"
                autoComplete="username"
              />
            </div>

            <AuthPasswordField
              id="password"
              name="password"
              required
              value={form.password}
              onChange={updateField('password')}
              placeholder="Password"
              autoComplete="new-password"
              minLength={6}
            />

            <AuthPasswordField
              id="confirmPassword"
              name="confirmPassword"
              required
              value={form.confirmPassword}
              onChange={updateField('confirmPassword')}
              placeholder="Confirm Password"
              autoComplete="new-password"
              minLength={6}
            />

            <p className="pt-1 text-xs leading-relaxed text-gray-500">
              By submitting this form, you agree to share your information with the administrator
              for account activation.
            </p>

            <div className="pt-1">
              <AuthPrimaryButton isLoading={isLoading}>Sign up</AuthPrimaryButton>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/auth/tenant/signin"
              className="font-semibold text-[#3B82F6] hover:text-blue-600"
            >
              Login here
            </Link>
          </p>
        </div>
      </AuthSplitShell>

      <RegistrationSuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        loginHref="/auth/tenant/signin"
      />
    </>
  );
}
