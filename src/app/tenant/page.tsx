'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  CreditCard, 
  FileText, 
  Wrench,
  DollarSign,
  Calendar,
  User,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { LogoutButton } from '@/components/features/LogoutButton';
import SkeletonCard from '@/components/ui/SkeletonCard';

export default function TenantDashboard() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} showHeader={false} lines={2} />
              ))}
            </div>
            <SkeletonCard showHeader={true} lines={5} />
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'tenant') {
    redirect('/auth/tenant/signin');
  }

  const quickActions = [
    {
      title: 'Pay Rent',
      description: 'Make a payment',
      href: '/tenant/payments',
      icon: CreditCard,
      color: 'green'
    },
    {
      title: 'Request Maintenance',
      description: 'Submit a request',
      href: '/tenant/maintenance',
      icon: Wrench,
      color: 'blue'
    },
    {
      title: 'View Documents',
      description: 'Access your files',
      href: '/tenant/documents',
      icon: FileText,
      color: 'purple'
    },
    {
      title: 'Payment History',
      description: 'View past payments',
      href: '/tenant/payments',
      icon: DollarSign,
      color: 'yellow'
    }
  ];

  // Mock data - In production, this would come from API
  const tenantInfo = {
    roomNumber: '201A',
    buildingName: 'Sunrise Residences',
    address: '123 Main Street, Manila',
    monthlyRent: 15000,
    nextDueDate: '2025-11-01',
    leaseEnd: '2026-10-31',
    securityDeposit: 30000
  };

  const recentPayments = [
    { id: 1, date: '2025-10-01', amount: 15000, status: 'Paid', type: 'Rent' },
    { id: 2, date: '2025-09-01', amount: 15000, status: 'Paid', type: 'Rent' },
    { id: 3, date: '2025-08-01', amount: 15000, status: 'Paid', type: 'Rent' }
  ];

  const maintenanceRequests = [
    { id: 1, title: 'Leaking faucet', status: 'Completed', date: '2025-10-15' },
    { id: 2, title: 'AC not cooling', status: 'In Progress', date: '2025-10-20' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-gray-50 to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="bg-green-600 p-2 rounded-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Tenant Portal</h1>
                  <p className="text-xs text-gray-900">Your Home Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-900 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="hidden md:flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {session.user.name || session.user.email}
                  </p>
                  <p className="text-xs text-gray-900">Tenant</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                </div>
              </div>
              
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Home! 🏡
          </h2>
          <p className="text-gray-900">
            Manage your rental and stay updated with your property information.
          </p>
        </div>

        {/* Property Info Card */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-4">Your Unit</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Home className="h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Unit Number</p>
                    <p className="font-semibold">{tenantInfo.roomNumber}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Building</p>
                    <p className="font-semibold">{tenantInfo.buildingName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Address</p>
                    <p className="font-semibold">{tenantInfo.address}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-4">Lease Details</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Monthly Rent</p>
                    <p className="font-semibold">₱{tenantInfo.monthlyRent.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Next Due Date</p>
                    <p className="font-semibold">{new Date(tenantInfo.nextDueDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 opacity-80" />
                  <div>
                    <p className="text-sm opacity-80">Lease Ends</p>
                    <p className="font-semibold">{new Date(tenantInfo.leaseEnd).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Next Payment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                Due Soon
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              ₱{tenantInfo.monthlyRent.toLocaleString()}
            </h3>
            <p className="text-sm text-gray-900 mb-3">Next Payment</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-900">Due: {new Date(tenantInfo.nextDueDate).toLocaleDateString()}</span>
              <Link href="/tenant/payments" className="text-green-600 hover:text-green-700 font-medium flex items-center">
                Pay <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Paid
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {recentPayments.length}
            </h3>
            <p className="text-sm text-gray-900 mb-3">Payments Made</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-900">Last 3 months</span>
              <Link href="/tenant/payments" className="text-green-600 hover:text-green-700 font-medium flex items-center">
                View <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>

          {/* Maintenance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Wrench className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                Active
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {maintenanceRequests.filter(r => r.status === 'In Progress').length}
            </h3>
            <p className="text-sm text-gray-900 mb-3">Active Requests</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-900">{maintenanceRequests.length} total</span>
              <Link href="/tenant/maintenance" className="text-green-600 hover:text-green-700 font-medium flex items-center">
                View <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <span className="text-xs font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded-full">
                Available
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              3
            </h3>
            <p className="text-sm text-gray-900 mb-3">Documents</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-900">Lease & receipts</span>
              <Link href="/tenant/documents" className="text-green-600 hover:text-green-700 font-medium flex items-center">
                View <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
            <Link href="/tenant/profile" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center">
              My Profile <User className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`bg-${action.color}-100 p-2 rounded-lg w-fit mb-3 group-hover:scale-110 transition`}>
                      <action.icon className={`h-5 w-5 text-${action.color}-600`} />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">{action.title}</h4>
                    <p className="text-sm text-gray-900">{action.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Payments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-green-600" />
              Recent Payments
            </h3>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{payment.type}</p>
                    <p className="text-xs text-gray-900">{new Date(payment.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₱{payment.amount.toLocaleString()}</p>
                    <p className="text-xs text-green-600">{payment.status}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link 
              href="/tenant/payments"
              className="mt-6 w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition font-medium text-center block"
            >
              View All Payments
            </Link>
          </div>

          {/* Maintenance Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-green-600" />
              Maintenance Requests
            </h3>
            <div className="space-y-3">
              {maintenanceRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{request.title}</p>
                    <p className="text-xs text-gray-900">{new Date(request.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      request.status === 'Completed' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link 
              href="/tenant/maintenance"
              className="mt-6 w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg hover:bg-gray-200 transition font-medium text-center block"
            >
              Submit New Request
            </Link>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Need Help?</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Call Us</p>
                <p className="text-xs text-gray-900">+63 (2) 1234-5678</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Mail className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Email Us</p>
                <p className="text-xs text-gray-900">support@parenta.com</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <AlertCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Emergency</p>
                <p className="text-xs text-gray-900">24/7 Hotline Available</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
