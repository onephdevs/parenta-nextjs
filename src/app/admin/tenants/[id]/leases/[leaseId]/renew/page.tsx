import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getLeaseById } from '@/lib/api/leases';
import { getTenantById } from '@/lib/api/tenants';
import RenewLeaseForm from '@/components/features/tenants/profile/RenewLeaseForm';

interface PageProps {
  params: Promise<{ id: string; leaseId: string }>;
}

export default async function RenewTenantLeasePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const { id: tenantId, leaseId } = await params;
  const [lease, tenant] = await Promise.all([
    getLeaseById(leaseId),
    getTenantById(tenantId),
  ]);

  if (!lease || !tenant || lease.tenantId !== tenantId) {
    notFound();
  }

  const hasActive =
    Boolean(tenant.currentAssignment) ||
    (lease.assignmentStatus === 'active' &&
      (!lease.endDate || new Date(lease.endDate) >= new Date()));
  const personBadge = hasActive
    ? 'active'
    : (tenant.assignmentHistory?.length || 0) > 0
      ? 'past'
      : tenant.tenantStatus === 'pending'
        ? 'pending'
        : 'inactive';

  return (
    <RenewLeaseForm
      tenantId={tenantId}
      lease={lease}
      tenantName={`${tenant.firstName} ${tenant.lastName}`.trim()}
      profilePictureUrl={tenant.profilePictureUrl}
      personBadge={personBadge}
    />
  );
}
