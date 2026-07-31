'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Mail, Lock, AlertCircle, Home, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

export default function TenantSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        role: 'tenant',
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Back to Home */}
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-gray-900 dark:text-gray-100 hover:text-green-600 dark:hover:text-green-400 mb-8 transition"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="bg-green-600 p-3 rounded-xl">
                <User className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Tenant Portal</h2>
            <p className="mt-2 text-gray-900 dark:text-gray-300">
              Access your account and manage your rental
            </p>
          </div>

          {error && (
            <Alert variant="danger" className="mb-6">
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField label="Email Address" htmlFor="email" required>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </FormField>

            <FormField label="Password" htmlFor="password" required>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </FormField>

            <div className="flex items-center justify-between">
              <Checkbox id="remember-me" name="remember-me" label="Remember me" />

              <div className="text-sm">
                <Link href="/auth/forgot-password?role=tenant" className="font-medium text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" variant="success" className="w-full" size="lg" isLoading={isLoading}>
              Sign In to My Account
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-medium text-green-900 dark:text-green-200 mb-2">Demo Tenant Credentials:</p>
            <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
              <p><strong>Email:</strong> tenant@parenta.com</p>
              <p><strong>Password:</strong> tenant123</p>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">Need Help?</p>
            <div className="text-xs text-gray-900 dark:text-gray-300 space-y-1">
              <p>• Contact your property manager for account access</p>
              <p>• Call our support: +63 (2) 1234-5678</p>
              <p>• Email: support@parenta.com</p>
            </div>
          </div>

          {/* Back to Properties */}
          <div className="mt-6 text-center">
            <Link href="/#properties" className="text-sm text-gray-900 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400">
              ← Browse Available Properties
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-green-600 to-green-800 text-white items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center space-x-3 mb-8">
            <Building2 className="h-12 w-12" />
            <span className="text-2xl font-bold leading-tight">Alfonso Property Management System</span>
          </div>
          <h3 className="text-3xl font-bold mb-4">
            Your Home, Your Portal
          </h3>
          <p className="text-green-100 text-lg mb-8">
            Everything you need to manage your rental property in one convenient place.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-green-500 rounded-lg p-2">
                <Home className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h4 className="font-semibold">Your Dashboard</h4>
                <p className="text-green-100 text-sm">View your unit details and lease information</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-green-500 rounded-lg p-2">
                <Mail className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h4 className="font-semibold">Easy Payments</h4>
                <p className="text-green-100 text-sm">Pay rent and view payment history online</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-green-500 rounded-lg p-2">
                <User className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h4 className="font-semibold">Request Maintenance</h4>
                <p className="text-green-100 text-sm">Submit and track maintenance requests 24/7</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

