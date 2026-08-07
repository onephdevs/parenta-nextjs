import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Wallet } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getTenantById } from '@/lib/api/tenants';
import TenantFinancialDetails from '@/components/features/TenantFinancialDetails';
import TenantCreditsManager from '@/components/features/TenantCreditsManager';
import DepositLedgerManager from '@/components/features/DepositLedgerManager';
import TenantDetailClient from '@/components/features/TenantDetailClient';
import { PreviewTenantPortalButton } from '@/components/features/tenant/PreviewTenantPortalButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const { id } = await params;

  try {
    const tenant = await getTenantById(id);

    if (!tenant) {
      notFound();
    }

    const formatCurrency = (amount?: number) => {
      if (amount == null) return 'Not specified';
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
        day: 'numeric',
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

    const fullName = `${tenant.firstName} ${tenant.lastName}`.trim();

    return (
      <div className="space-y-6 p-6">
        <div>
          <Link
            href="/admin/tenants"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tenants
          </Link>

          <PageHeader
            title={fullName}
            description={tenant.email}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusBadgeClass(
                    tenant.tenantStatus
                  )}`}
                >
                  {tenant.tenantStatus}
                </span>
                <PreviewTenantPortalButton
                  tenantId={String(tenant.id)}
                  tenantName={fullName}
                />
                <Link href={`/admin/financial/payments/new?tenantId=${tenant.id}`}>
                  <Button variant="outline" size="sm" leftIcon={<Wallet className="h-4 w-4" />}>
                    Record payment
                  </Button>
                </Link>
                <Link href={`/admin/tenants/${tenant.id}/edit`}>
                  <Button size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
                    Edit
                  </Button>
                </Link>
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-gray-900">Personal information</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Full name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {tenant.firstName} {tenant.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <a
                      href={`mailto:${tenant.email}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {tenant.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Phone
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {tenant.phone || 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Date of birth
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(tenant.dateOfBirth)}
                  </dd>
                </div>
              </div>
            </section>

            {tenant.currentAssignment && (
              <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-semibold text-gray-900">Current room</h3>
                </div>
                <div className="px-4 py-4 sm:px-5">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">
                          Room {tenant.currentAssignment.roomNumber}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {tenant.currentAssignment.buildingName}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-base font-semibold text-gray-900">
                          {formatCurrency(tenant.currentAssignment.monthlyRate)}/mo
                        </p>
                        <p className="text-sm text-gray-600">
                          Since {formatDate(tenant.currentAssignment.startDate)}
                        </p>
                        {tenant.currentAssignment.endDate && (
                          <p className="text-sm text-gray-600">
                            Until {formatDate(tenant.currentAssignment.endDate)}
                          </p>
                        )}
                      </div>
                    </div>

                    {(tenant.currentAssignment.depositPaid ||
                      tenant.currentAssignment.advancePaid ||
                      tenant.currentAssignment.utilityDepositPaid) && (
                      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-emerald-200 pt-4 text-sm sm:grid-cols-3">
                        {tenant.currentAssignment.depositPaid != null && (
                          <div>
                            <p className="text-gray-600">Deposit</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(tenant.currentAssignment.depositPaid)}
                            </p>
                          </div>
                        )}
                        {tenant.currentAssignment.advancePaid != null && (
                          <div>
                            <p className="text-gray-600">Advance</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(tenant.currentAssignment.advancePaid)}
                            </p>
                          </div>
                        )}
                        {tenant.currentAssignment.utilityDepositPaid != null && (
                          <div>
                            <p className="text-gray-600">Utility deposit</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(tenant.currentAssignment.utilityDepositPaid)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-gray-900">Room assignment history</h3>
              </div>
              <div className="px-4 py-4 sm:px-5">
                {tenant.assignmentHistory && tenant.assignmentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {tenant.assignmentHistory.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Room {assignment.roomNumber}
                            </h4>
                            <p className="text-sm text-gray-600">{assignment.buildingName}</p>
                          </div>
                          <div className="sm:text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(assignment.monthlyRate)}/mo
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(assignment.startDate)}
                              {assignment.endDate && ` – ${formatDate(assignment.endDate)}`}
                            </p>
                            <span
                              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                assignment.assignmentStatus === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {assignment.assignmentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No room assignments found</p>
                )}
              </div>
            </section>

            <TenantFinancialDetails tenantId={tenant.id} />

            <DepositLedgerManager
              tenantId={tenant.id}
              tenantName={fullName}
            />

            <TenantCreditsManager
              tenantId={tenant.id}
              tenantName={fullName}
            />
          </div>

          <aside className="space-y-6">
            <TenantDetailClient
              tenantId={tenant.id}
              profilePictureUrl={(tenant as { profilePictureUrl?: string | null }).profilePictureUrl}
              agreementDocumentId={
                (tenant as { agreementDocumentId?: string | null }).agreementDocumentId
              }
              agreementDocumentUrl={
                (tenant as { agreementDocumentUrl?: string | null }).agreementDocumentUrl
              }
              agreementDocumentName={
                (tenant as { agreementDocumentName?: string | null }).agreementDocumentName
              }
            />

            {tenant.emergencyContactName && (
              <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-semibold text-gray-900">Emergency contact</h3>
                </div>
                <div className="space-y-3 px-4 py-4 sm:px-5">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Name
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{tenant.emergencyContactName}</dd>
                  </div>
                  {tenant.emergencyContactPhone && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Phone
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {tenant.emergencyContactPhone}
                      </dd>
                    </div>
                  )}
                  {tenant.emergencyContactRelationship && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Relationship
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {tenant.emergencyContactRelationship}
                      </dd>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-gray-900">Financial profile</h3>
              </div>
              <div className="space-y-3 px-4 py-4 sm:px-5">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Monthly income
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatCurrency(tenant.monthlyIncome)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Security deposit
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatCurrency(tenant.securityDeposit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Employment
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {tenant.employmentStatus || 'Not specified'}
                  </dd>
                </div>
                {tenant.employerName && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Employer
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{tenant.employerName}</dd>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading tenant:', error);
    notFound();
  }
}
