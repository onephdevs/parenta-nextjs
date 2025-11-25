'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Mail, Lock, AlertCircle, Home, ArrowLeft, User } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Back to Home */}
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-gray-900 hover:text-green-600 mb-8 transition"
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
            <h2 className="text-3xl font-bold text-gray-900">Tenant Portal</h2>
            <p className="mt-2 text-gray-900">
              Access your account and manage your rental
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="tenant@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-green-600 hover:text-green-500">
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In to My Account'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900 mb-2">Demo Tenant Credentials:</p>
            <div className="text-xs text-green-700 space-y-1">
              <p><strong>Email:</strong> tenant@parenta.com</p>
              <p><strong>Password:</strong> tenant123</p>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">Need Help?</p>
            <div className="text-xs text-gray-900 space-y-1">
              <p>• Contact your property manager for account access</p>
              <p>• Call our support: +63 (2) 1234-5678</p>
              <p>• Email: support@parenta.com</p>
            </div>
          </div>

          {/* Back to Properties */}
          <div className="mt-6 text-center">
            <Link href="/#properties" className="text-sm text-gray-900 hover:text-green-600">
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
            <span className="text-4xl font-bold">Parenta</span>
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

