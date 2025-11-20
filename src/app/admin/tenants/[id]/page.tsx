import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getTenantById } from '@/lib/api/tenants';
import TenantFinancialDetails from '@/components/features/TenantFinancialDetails';

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const { id } = await params;
  
  try {
    const tenant = await getTenantById(id);
    
    if (!tenant) {
      notFound();
    }

    const formatCurrency = (amount?: number) => {
      if (!amount) return 'Not specified';
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(amount);
    };

    const formatDate = (date?: Date) => {
      if (!date) return 'Not set';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const getStatusBadgeClass = (status: string) => {
      switch (status) {
        case 'active':
          return 'bg-green-100 text-green-800';
        case 'pending':
          return 'bg-yellow-100 text-yellow-800';
        case 'inactive':
          return 'bg-gray-100 text-gray-800';
        case 'terminated':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center">
                <Link 
                  href="/admin/tenants" 
                  className="flex items-center text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Tenants
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {tenant.firstName} {tenant.lastName}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(tenant.tenantStatus)}`}>
                  {tenant.tenantStatus}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  href={`/admin/financial/payments/new?tenantId=${tenant.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Record Payment
                </Link>
                <Link
                  href={`/admin/tenants/${tenant.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Edit Tenant
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Personal Information</h3>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenant.firstName} {tenant.lastName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={`mailto:${tenant.email}`} className="text-purple-600 hover:text-purple-500">
                          {tenant.email}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {tenant.phone || 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(tenant.dateOfBirth)}</dd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Room Assignment */}
              {tenant.currentAssignment && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Current Room Assignment</h3>
                    
                    <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            Room {tenant.currentAssignment.roomNumber}
                          </h4>
                          <p className="text-sm text-gray-600">{tenant.currentAssignment.buildingName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(tenant.currentAssignment.monthlyRate)}/month
                          </p>
                          <p className="text-sm text-gray-600">
                            Since {formatDate(tenant.currentAssignment.startDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Assignment History */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Room Assignment History</h3>
                  
                  {tenant.assignmentHistory && tenant.assignmentHistory.length > 0 ? (
                    <div className="space-y-4">
                      {tenant.assignmentHistory.map((assignment) => (
                        <div key={assignment.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                Room {assignment.roomNumber}
                              </h4>
                              <p className="text-sm text-gray-600">{assignment.buildingName}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(assignment.monthlyRate)}/month
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatDate(assignment.startDate)} 
                                {assignment.endDate && ` - ${formatDate(assignment.endDate)}`}
                              </p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                assignment.assignmentStatus === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {assignment.assignmentStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No room assignments found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Details: Invoices, Payments, Credits, Deposits */}
              <TenantFinancialDetails tenantId={tenant.id} />
            </div>

            {/* Sidebar Information */}
            <div className="space-y-6">
              {/* Emergency Contact */}
              {tenant.emergencyContactName && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Emergency Contact</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{tenant.emergencyContactName}</dd>
                      </div>
                      {tenant.emergencyContactPhone && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Phone</dt>
                          <dd className="mt-1 text-sm text-gray-900">{tenant.emergencyContactPhone}</dd>
                        </div>
                      )}
                      {tenant.emergencyContactRelationship && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Relationship</dt>
                          <dd className="mt-1 text-sm text-gray-900">{tenant.emergencyContactRelationship}</dd>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Information */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Financial Information</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Monthly Income</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatCurrency(tenant.monthlyIncome)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Security Deposit</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatCurrency(tenant.securityDeposit)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Employment Status</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenant.employmentStatus || 'Not specified'}</dd>
                    </div>
                    {tenant.employerName && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Employer</dt>
                        <dd className="mt-1 text-sm text-gray-900">{tenant.employerName}</dd>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading tenant:', error);
    notFound();
  }
} 