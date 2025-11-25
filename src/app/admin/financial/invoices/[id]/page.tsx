import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const { id } = await params;
  
  try {
    // Fetch invoice details
    const invoiceResult = await pool.query(
      `SELECT 
        i.*,
        t.first_name,
        t.last_name,
        t.email,
        r.room_number,
        b.name as building_name
      FROM invoices i
      LEFT JOIN tenants t ON i.tenant_id = t.id
      LEFT JOIN rooms r ON i.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE i.id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      notFound();
    }

    const invoice = invoiceResult.rows[0];

    // Fetch payment allocations for this invoice
    const allocationsResult = await pool.query(
      `SELECT 
        pa.*,
        p.amount as payment_amount,
        p.payment_date,
        p.payment_method,
        p.description as payment_description
      FROM payment_allocations pa
      LEFT JOIN payments p ON pa.payment_id = p.id
      WHERE pa.invoice_id = $1
      ORDER BY pa.created_at DESC`,
      [id]
    );

    const allocations = allocationsResult.rows;

    const formatCurrency = (amount: string | number) => {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(Number(amount));
    };

    const formatDate = (date: Date | string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed':
          return 'bg-green-100 text-green-800';
        case 'partial':
          return 'bg-yellow-100 text-yellow-800';
        case 'overdue':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const paidAmount = Number(invoice.amount) - Number(invoice.remaining_amount);
    const progressPercentage = (paidAmount / Number(invoice.amount)) * 100;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/admin/financial/invoices" 
                  className="flex items-center text-gray-900 hover:text-gray-900"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Invoices
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Invoice {invoice.invoice_number}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Invoice Details */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Invoice Details</h3>
                </div>
                <div className="px-6 py-5">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Invoice Number</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">{invoice.invoice_number}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Tenant</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <Link 
                          href={`/admin/tenants/${invoice.tenant_id}`}
                          className="text-purple-600 hover:text-purple-900 font-medium"
                        >
                          {invoice.first_name} {invoice.last_name}
                        </Link>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Room</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {invoice.building_name} - Room {invoice.room_number}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Issue Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(invoice.issue_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Due Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(invoice.due_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Period</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                      </dd>
                    </div>
                  </div>

                  {invoice.description && (
                    <div className="mt-6">
                      <dt className="text-sm font-medium text-gray-900">Description</dt>
                      <dd className="mt-1 text-sm text-gray-900">{invoice.description}</dd>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Allocations */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Payment History</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    All payments that have been allocated to this invoice
                  </p>
                </div>
                <div className="px-6 py-5">
                  {allocations.length > 0 ? (
                    <div className="space-y-4">
                      {allocations.map((allocation) => (
                        <div key={allocation.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900">
                                      Payment allocated: {formatCurrency(allocation.allocated_amount)}
                                    </p>
                                    <Link
                                      href={`/admin/financial/payments/${allocation.payment_id}`}
                                      className="text-sm text-purple-600 hover:text-purple-900"
                                    >
                                      View Payment →
                                    </Link>
                                  </div>
                                  <div className="mt-1 flex items-center space-x-4 text-xs text-gray-900">
                                    <span>Date: {formatDate(allocation.payment_date)}</span>
                                    <span>•</span>
                                    <span className="capitalize">Method: {allocation.payment_method.replace('_', ' ')}</span>
                                    <span>•</span>
                                    <span>Total Payment: {formatCurrency(allocation.payment_amount)}</span>
                                  </div>
                                  {allocation.payment_description && (
                                    <p className="mt-1 text-xs text-gray-900">{allocation.payment_description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-900">No payments allocated yet</p>
                      <p className="text-xs text-gray-400">Payments will be automatically allocated when recorded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Amount Summary */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Amount Summary</h3>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(invoice.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Amount Paid</span>
                    <span className="text-lg font-semibold text-green-600">{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-900">Remaining</span>
                    <span className="text-xl font-bold text-purple-600">{formatCurrency(invoice.remaining_amount)}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-900">Payment Progress</span>
                      <span className="text-xs font-semibold text-gray-900">{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <Link
                    href={`/admin/financial/payments/new?tenantId=${invoice.tenant_id}`}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Record Payment
                  </Link>
                  <Link
                    href={`/admin/tenants/${invoice.tenant_id}`}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50"
                  >
                    View Tenant Profile
                  </Link>
                  <button
                    onClick={() => window.print()}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Invoice
                  </button>
                </div>
              </div>

              {/* Invoice Stats */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 shadow rounded-lg border border-gray-200">
                <div className="px-6 py-5">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Invoice Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-900">Payments Received</span>
                      <span className="text-sm font-semibold text-gray-900">{allocations.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-900">Days Since Issue</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.floor((new Date().getTime() - new Date(invoice.issue_date).getTime()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-900">Days Until Due</span>
                      <span className={`text-sm font-semibold ${
                        new Date(invoice.due_date) < new Date() ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {Math.floor((new Date(invoice.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading invoice:', error);
    notFound();
  }
}

