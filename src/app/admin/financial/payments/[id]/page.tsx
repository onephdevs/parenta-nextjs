import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getPaymentById } from '@/lib/api/payments';

interface PaymentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  // Payment IDs are UUIDs (strings), not integers
  // Basic validation: check if it looks like a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  let payment;
  try {
    payment = await getPaymentById(id);
    if (!payment) {
      notFound();
    }
  } catch (error) {
    console.error('Error fetching payment:', error);
    notFound();
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',  
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentTypeClass = (type: string) => {
    switch (type) {
      case 'rent':
        return 'bg-blue-100 text-blue-800';
      case 'deposit':
        return 'bg-purple-100 text-purple-800';
      case 'fee':
        return 'bg-orange-100 text-orange-800';
      case 'utilities':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodDisplay = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'credit_card':
        return 'Credit Card';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/financial/payments"
                className="text-gray-900 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Details</h1>
                <p className="text-sm text-gray-900">Payment #{payment.id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Payment Summary Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount)}</h2>
                      <p className="text-sm text-gray-900">Payment made on {formatDateOnly(payment.paymentDate)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(payment.paymentStatus)}`}>
                    {payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1)}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPaymentTypeClass(payment.paymentType)}`}>
                    {payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Tenant Information */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Tenant Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Name</span>
                    <span className="text-sm text-gray-900">{payment.tenantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Email</span>
                    <span className="text-sm text-gray-900">{payment.tenantEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Phone</span>
                    <span className="text-sm text-gray-900">{payment.tenantPhone || 'N/A'}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <Link
                      href={`/admin/tenants/${payment.tenantId}`}
                      className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                    >
                      View Tenant Profile →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Room Information */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Room Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Building</span>
                    <span className="text-sm text-gray-900">{payment.buildingName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Room Number</span>
                    <span className="text-sm text-gray-900">{payment.roomNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Monthly Rent</span>
                    <span className="text-sm text-gray-900">
                      {payment.monthlyRate ? formatCurrency(payment.monthlyRate) : 'N/A'}
                    </span>
                  </div>
                  {payment.roomId && (
                    <div className="pt-3 border-t">
                      <Link
                        href={`/admin/rooms/${payment.roomId}`}
                        className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                      >
                        View Room Details →
                      </Link>
                    </div>
                  )}
                  {!payment.roomId && payment.roomNumber && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-900 italic">No room assignment linked to this payment</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Payment Details</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Payment Method</span>
                    <span className="text-sm text-gray-900">{getPaymentMethodDisplay(payment.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Payment Date</span>
                    <span className="text-sm text-gray-900">{formatDateOnly(payment.paymentDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Due Date</span>
                    <span className="text-sm text-gray-900">{payment.dueDate ? formatDateOnly(payment.dueDate) : 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Transaction ID</span>
                    <span className="text-sm text-gray-900">{payment.referenceNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Created</span>
                    <span className="text-sm text-gray-900">{formatDate(payment.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Last Updated</span>
                    <span className="text-sm text-gray-900">{formatDate(payment.updatedAt)}</span>
                  </div>
                </div>
              </div>
              
              {payment.notes && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-900">{payment.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Late Fee Information (if applicable) */}
          {payment.lateFeeAmount && payment.lateFeeAmount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Late Fee Applied</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>A late fee of {formatCurrency(payment.lateFeeAmount)} was applied to this payment.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 