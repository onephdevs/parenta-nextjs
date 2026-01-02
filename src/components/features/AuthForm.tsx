'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

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
  // Normalize defaultRole to lowercase to match option values
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
        // Handle signup
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
          
          // Automatically sign in the user after successful signup
          const signInResult = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            role: formData.role,
            redirect: false,
          });

          if (signInResult?.ok) {
            // Redirect based on role
            const redirectUrl = formData.role === 'admin' ? '/admin' : '/tenant';
            router.push(redirectUrl);
            router.refresh();
          } else {
            // If auto-signin fails, redirect to signin page
            setSuccess('Account created successfully! Please sign in.');
            setTimeout(() => {
              router.push(`/auth/signin?role=${formData.role}`);
            }, 2000);
          }
        } else {
          setError(data.message || 'Failed to create account');
        }
      } else {
        // Handle signin
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          role: formData.role,
          redirect: false,
        });

        if (result?.error) {
          setError('Invalid credentials. Please check your email, password, and role.');
        } else if (result?.ok) {
          // Redirect based on role
          const redirectUrl = formData.role === 'admin' ? '/admin' : '/tenant';
          router.push(redirectUrl);
          router.refresh();
        }
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Selection */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-900 mb-2">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="tenant">Tenant</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* First Name (signup only) */}
        {mode === 'signup' && (
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 mb-2">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your first name"
              disabled={isLoading}
            />
          </div>
        )}

        {/* Last Name (signup only) */}
        {mode === 'signup' && (
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 mb-2">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your last name"
              disabled={isLoading}
            />
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email"
            disabled={isLoading}
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your password"
            disabled={isLoading}
            minLength={6}
          />
          {mode === 'signup' && (
            <p className="text-sm text-gray-900 mt-1">
              Password must be at least 6 characters long
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 rounded-md bg-green-50 border border-green-200">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          disabled={isLoading}
        >
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </Button>

        {/* Toggle Mode Link */}
        <div className="text-center">
          <p className="text-sm text-gray-900">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button
              type="button"
              onClick={() => {
                const newPath = mode === 'signin' 
                  ? `/auth/signup?role=${formData.role}` 
                  : `/auth/signin?role=${formData.role}`;
                router.push(newPath);
              }}
              className="text-blue-600 hover:text-blue-500 font-medium"
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