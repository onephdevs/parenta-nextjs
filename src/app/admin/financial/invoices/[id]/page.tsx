import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import PrintInvoiceButton from '@/components/features/PrintInvoiceButton';

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const { id } = await params;

  try {
    // invoices has no room_id — resolve room via tenant's active assignment
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
      LEFT JOIN tenant_room_assignments tra
        ON tra.tenant_id = i.tenant_id AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE i.id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      notFound();
    }

    const invoice = invoiceResult.rows[0];

    // Line items
    const itemsResult = await pool.query(
      `SELECT *
       FROM invoice_line_items
       WHERE invoice_id = $1
       ORDER BY created_at ASC, id ASC`,
      [id]
    );
    const lineItems = itemsResult.rows;

    // Payment allocations (payments.notes, not description)
    const allocationsResult = await pool.query(
      `SELECT
        pa.*,
        p.amount as payment_amount,
        p.payment_date,
        p.payment_method,
        p.notes as payment_description
      FROM payment_allocations pa
      LEFT JOIN payments p ON pa.payment_id = p.id
      WHERE pa.invoice_id = $1
      ORDER BY pa.created_at DESC`,
      [id]
    );

    const allocations = allocationsResult.rows;

    const formatCurrency = (amount: string | number | null | undefined) => {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(Number(amount || 0));
    };

    const formatDate = (date: Date | string | null | undefined) => {
      if (!date) return '—';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'paid':
        case 'completed':
          return 'bg-green-100 text-green-800';
        case 'partial':
        case 'sent':
          return 'bg-yellow-100 text-yellow-800';
        case 'overdue':
          return 'bg-red-100 text-red-800';
        case 'cancelled':
          return 'bg-gray-100 text-gray-500';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const totalAmount = Number(invoice.total_amount || 0);
    const amountPaid = Number(invoice.amount_paid || 0);
    const balanceDue = Number(invoice.balance_due ?? totalAmount - amountPaid);
    const progressPercentage = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;
    const status = invoice.invoice_status || 'draft';

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
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(status)}`}
                >
                  {status}
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
                        {invoice.building_name && invoice.room_number
                          ? `${invoice.building_name} - Room ${invoice.room_number}`
                          : 'No active room assignment'}
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
                        {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                      </dd>
                    </div>
                  </div>

                  {invoice.notes && (
                    <div className="mt-6">
                      <dt className="text-sm font-medium text-gray-900">Notes</dt>
                      <dd className="mt-1 text-sm text-gray-900">{invoice.notes}</dd>
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Line Items</h3>
                </div>
                <div className="px-6 py-5">
                  {lineItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineItems.map((item) => (
                            <tr key={item.id}>
                              <td className="px-2 py-3 text-sm text-gray-900">{item.description}</td>
                              <td className="px-2 py-3 text-sm text-gray-900 capitalize">{item.item_type}</td>
                              <td className="px-2 py-3 text-sm text-gray-900 text-right">{Number(item.quantity)}</td>
                              <td className="px-2 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.unit_price)}</td>
                              <td className="px-2 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">No line items on this invoice.</p>
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
                                    <span>Date: {formatDate(allocation.payment_date || allocation.allocation_date)}</span>
                                    <span>•</span>
                                    <span className="capitalize">
                                      Method: {(allocation.payment_method || 'unknown').replace(/_/g, ' ')}
                                    </span>
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
                    <span className="text-sm font-medium text-gray-900">Subtotal</span>
                    <span className="text-sm text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {Number(invoice.tax_amount) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">Tax</span>
                      <span className="text-sm text-gray-900">{formatCurrency(invoice.tax_amount)}</span>
                    </div>
                  )}
                  {Number(invoice.discount_amount) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">Discount</span>
                      <span className="text-sm text-gray-900">-{formatCurrency(invoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-900">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Amount Paid</span>
                    <span className="text-lg font-semibold text-green-600">{formatCurrency(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-900">Remaining</span>
                    <span className="text-xl font-bold text-purple-600">{formatCurrency(balanceDue)}</span>
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
                        style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
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
                  <PrintInvoiceButton />
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
                        {Math.floor(
                          (new Date().getTime() - new Date(invoice.issue_date).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        days
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-900">Days Until Due</span>
                      <span
                        className={`text-sm font-semibold ${
                          new Date(invoice.due_date) < new Date() ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {Math.floor(
                          (new Date(invoice.due_date).getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        days
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
