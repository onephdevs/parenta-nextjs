'use client';

import { useState } from 'react';
import { getSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';
import { homePathForRole } from '@/lib/auth/home-path';
import type { UserRole } from '@/types/auth.types';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  defaultRole?: UserRole;
}

export function AuthForm({ mode, defaultRole = 'tenant' }: AuthFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const normalizedRole = (defaultRole?.toLowerCase() === 'admin' ? 'admin' : 'tenant') as UserRole;
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: normalizedRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'signup') {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (data.success) {
          setSuccess('Account created successfully! Signing you in...');

          const signInResult = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false,
          });

          if (signInResult?.ok) {
            const session = await getSession();
            router.push(homePathForRole(session?.user?.role || formData.role));
            router.refresh();
          } else {
            setSuccess('Account created successfully! Please sign in.');
            setTimeout(() => {
              router.push('/auth/signin');
            }, 2000);
          }
        } else {
          setError(data.message || 'Failed to create account');
        }
      } else {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError('Invalid credentials. Please check your email and password.');
        } else if (result?.ok) {
          const session = await getSession();
          router.push(homePathForRole(session?.user?.role));
          router.refresh();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'signup' && (
          <>
            <FormField label="First Name" htmlFor="firstName" required>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter your first name"
                isDisabled={isLoading}
              />
            </FormField>

            <FormField label="Last Name" htmlFor="lastName" required>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter your last name"
                isDisabled={isLoading}
              />
            </FormField>
          </>
        )}

        <FormField label="Email" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
            isDisabled={isLoading}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          required
          hint={mode === 'signup' ? 'Password must be at least 6 characters long' : undefined}
        >
          <Input
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            isDisabled={isLoading}
            minLength={6}
          />
        </FormField>

        {error && (
          <Alert variant="danger">{error}</Alert>
        )}

        {success && (
          <Alert variant="success">{success}</Alert>
        )}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                if (mode === 'signin') {
                  router.push(`/auth/signup?role=${formData.role}`);
                  return;
                }
                const signInPath =
                  formData.role === 'admin'
                    ? '/auth/signin'
                    : '/auth/signin';
                router.push(signInPath);
              }}
              className="text-purple-600 hover:text-purple-500 font-medium"
              disabled={isLoading}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
