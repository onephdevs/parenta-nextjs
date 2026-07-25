'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Mail, Lock, AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

export default function AdminSignIn() {
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
        role: 'admin',
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/admin');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Back to Home */}
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 mb-8 transition"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Portal</h2>
            <p className="mt-2 text-gray-900 dark:text-gray-300">
              Sign in to manage your properties
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
                <Link href="/auth/forgot-password?role=admin" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full" size="lg" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Demo Admin Credentials:</p>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p><strong>Email:</strong> admin@parenta.com</p>
              <p><strong>Password:</strong> admin123</p>
            </div>
          </div>

          {/* Staff Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-900 dark:text-gray-300">
              Looking for staff portal?{' '}
              <Link href="/auth/staff/signin" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                Staff Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 to-blue-800 text-white items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center space-x-3 mb-8">
            <Building2 className="h-12 w-12" />
            <span className="text-4xl font-bold">Parenta</span>
          </div>
          <h3 className="text-3xl font-bold mb-4">
            Property Management Made Simple
          </h3>
          <p className="text-blue-100 text-lg mb-8">
            Manage your properties, tenants, and operations all in one powerful platform.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-500 rounded-lg p-2">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h4 className="font-semibold">Complete Property Control</h4>
                <p className="text-blue-100 text-sm">Manage multiple buildings and units efficiently</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-500 rounded-lg p-2">
                <Shield className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h4 className="font-semibold">Secure & Reliable</h4>
                <p className="text-blue-100 text-sm">Enterprise-grade security for your data</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-500 rounded-lg p-2">
                <Mail className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <h4 className="font-semibold">Real-time Updates</h4>
                <p className="text-blue-100 text-sm">Stay informed with instant notifications</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

