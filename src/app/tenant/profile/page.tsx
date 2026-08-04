'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Users, Phone } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import ProfileForm from '@/components/features/tenant/ProfileForm';
import OccupantList from '@/components/features/tenant/OccupantList';
import DocumentUpload from '@/components/features/DocumentUpload';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantData, fetchTenantProfile } from '@/hooks/useTenantPortalData';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';

type ProfileSection = 'personal' | 'occupants' | 'emergency';

const SECTIONS: { id: ProfileSection; label: string; icon: typeof User }[] = [
  { id: 'personal', label: 'Personal info', icon: User },
  { id: 'occupants', label: 'Occupants', icon: Users },
  { id: 'emergency', label: 'Emergency contact', icon: Phone },
];

interface ProfileData {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
    employmentStatus?: string;
    employerName?: string;
    monthlyIncome?: number;
    previousAddress?: string;
    securityDeposit?: number;
    leaseStartDate?: string;
    leaseEndDate?: string;
    tenantStatus?: string;
    notes?: string;
  };
  roomAssignment: {
    roomId: string;
    roomNumber: string;
    buildingId: string;
    buildingName: string;
    address: string;
    assignmentStart: string;
    assignmentEnd?: string;
    monthlyRate: number;
    depositPaid?: number;
    advancePaid?: number;
    utilityDepositPaid?: number;
  } | null;
  agreementDocument?: {
    id: string;
    url: string;
    name: string;
  } | null;
}

function ProfilePageInner() {
  const { data: session, status } = useSession();
  const { canAccess, isLoading: gateIsLoading } = useTenantPortalGate();
  const { load, getCached, isLoading: cacheLoading, invalidate } = useTenantData();
  const theme = useTenantTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');
  const activeSection: ProfileSection =
    sectionParam === 'occupants' || sectionParam === 'emergency' || sectionParam === 'personal'
      ? sectionParam
      : 'personal';

  const [profileData, setProfileData] = useState<ProfileData | null>(
    () => getCached<ProfileData>('profile') ?? null
  );
  const { showNotification } = useNotifications();

  const setSection = (section: ProfileSection) => {
    router.replace(`/tenant/profile?section=${section}`);
  };

  const fetchProfile = async (force = false) => {
    try {
      const data = await load('profile', fetchTenantProfile, { force });
      setProfileData(data as unknown as ProfileData);
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to load profile',
      });
    }
  };

  const refreshProfile = () => {
    invalidate('profile');
    void fetchProfile(true);
  };

  useEffect(() => {
    if (gateIsLoading || status === 'loading') return;
    if (canAccess) {
      void fetchProfile();
    } else if (status === 'unauthenticated') {
      router.push('/auth/tenant/signin');
    }
  }, [status, session, router, canAccess, gateIsLoading]);

  if (status === 'loading' || gateIsLoading || (!profileData && cacheLoading('profile'))) {
    return <TenantPageSkeleton variant="profile" />;
  }

  if (!canAccess) return null;

  return (
    <div className={theme.pagePad}>
      <div>
        <h1 className={theme.title}>Profile</h1>
        <p className={cn('mt-1', theme.muted)}>
          Personal details, co-residents, and emergency contact
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(theme.tabClass(active), 'inline-flex items-center gap-2')}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {profileData && (
        <div className="space-y-6">
          {activeSection === 'personal' && (
            <>
              <div className={cn(theme.formPanel, 'overflow-hidden')}>
                <div className="p-4 sm:p-6">
                  <ProfileForm
                    initialData={profileData.profile}
                    onSave={refreshProfile}
                    section="personal"
                  />
                </div>
              </div>
              <div className={cn(theme.formPanel, 'p-6')}>
                <h3 className="mb-4 text-lg font-medium text-gray-900">Tenant agreement</h3>
                <DocumentUpload
                  tenantId={profileData.profile.id}
                  currentDocumentUrl={profileData.agreementDocument?.url}
                  currentDocumentName={profileData.agreementDocument?.name}
                  onUploadComplete={refreshProfile}
                  onDeleteComplete={refreshProfile}
                />
              </div>
            </>
          )}

          {activeSection === 'occupants' && (
            <div className={cn(theme.formPanel, 'p-2 sm:p-4')}>
              <OccupantList
                roomId={profileData.roomAssignment?.roomId}
                onOccupantChange={refreshProfile}
              />
            </div>
          )}

          {activeSection === 'emergency' && (
            <div className={cn(theme.formPanel, 'overflow-hidden')}>
              <div className="p-4 sm:p-6">
                <ProfileForm
                  initialData={profileData.profile}
                  onSave={refreshProfile}
                  section="emergency"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<TenantPageSkeleton variant="profile" />}>
      <ProfilePageInner />
    </Suspense>
  );
}
