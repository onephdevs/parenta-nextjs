import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getTenantById } from '@/lib/api/tenants';
import TenantProfilePage from '@/components/features/tenants/profile/TenantProfilePage';
import type {
  TenantProfileAssignment,
  TenantProfileData,
} from '@/components/features/tenants/profile/types';

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

function toIso(value?: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function mapAssignment(a: {
  id: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  monthlyRate: number;
  startDate: Date;
  endDate?: Date;
  assignmentStatus: string;
  depositPaid?: number;
  advancePaid?: number;
  utilityDepositPaid?: number;
  notes?: string;
  leasePackageTemplateId?: string | null;
  leasePackageTemplateName?: string | null;
  leasePackageTermMonths?: number | null;
  leasePackageDepositMonths?: number | null;
  leasePackageAdvanceMonths?: number | null;
  leasePackageGracePeriodDays?: number | null;
  leasePackagePenaltyType?: 'percentage' | 'flat_fee' | null;
  leasePackagePenaltyFee?: number | null;
}): TenantProfileAssignment {
  return {
    id: String(a.id),
    roomId: String(a.roomId),
    roomNumber: String(a.roomNumber || ''),
    buildingName: String(a.buildingName || ''),
    monthlyRate: Number(a.monthlyRate) || 0,
    startDate: toIso(a.startDate),
    endDate: toIso(a.endDate),
    assignmentStatus: String(a.assignmentStatus || ''),
    depositPaid: a.depositPaid ?? null,
    advancePaid: a.advancePaid ?? null,
    utilityDepositPaid: a.utilityDepositPaid ?? null,
    notes: a.notes ?? null,
    leasePackageTemplateId: a.leasePackageTemplateId ?? null,
    leasePackageTemplateName: a.leasePackageTemplateName ?? null,
    leasePackageTermMonths: a.leasePackageTermMonths ?? null,
    leasePackageDepositMonths: a.leasePackageDepositMonths ?? null,
    leasePackageAdvanceMonths: a.leasePackageAdvanceMonths ?? null,
    leasePackageGracePeriodDays: a.leasePackageGracePeriodDays ?? null,
    leasePackagePenaltyType: a.leasePackagePenaltyType ?? null,
    leasePackagePenaltyFee: a.leasePackagePenaltyFee ?? null,
  };
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const { id } = await params;

  try {
    const tenant = await getTenantById(id);
    if (!tenant) notFound();

    const profile: TenantProfileData = {
      id: String(tenant.id),
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone ?? null,
      dateOfBirth: toIso(tenant.dateOfBirth),
      previousAddress: tenant.previousAddress ?? null,
      tenantStatus: tenant.tenantStatus,
      isTenant: Boolean(tenant.isTenant),
      profilePictureUrl: tenant.profilePictureUrl ?? null,
      emergencyContactName: tenant.emergencyContactName ?? null,
      emergencyContactPhone: tenant.emergencyContactPhone ?? null,
      emergencyContactRelationship: tenant.emergencyContactRelationship ?? null,
      employmentStatus: tenant.employmentStatus ?? null,
      employerName: tenant.employerName ?? null,
      monthlyIncome: tenant.monthlyIncome ?? null,
      securityDeposit: tenant.securityDeposit ?? null,
      leaseStartDate: toIso(tenant.leaseStartDate),
      leaseEndDate: toIso(tenant.leaseEndDate),
      notes: tenant.notes ?? null,
      agreementDocumentId: tenant.agreementDocumentId ?? null,
      agreementDocumentUrl: tenant.agreementDocumentUrl ?? null,
      agreementDocumentName: tenant.agreementDocumentName ?? null,
      currentAssignment: tenant.currentAssignment
        ? mapAssignment(tenant.currentAssignment)
        : null,
      assignmentHistory: (tenant.assignmentHistory || []).map(mapAssignment),
    };

    return (
      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center text-sm text-gray-500">
            Loading tenant…
          </div>
        }
      >
        <TenantProfilePage tenant={profile} />
      </Suspense>
    );
  } catch (error) {
    console.error('Error loading tenant:', error);
    notFound();
  }
}
