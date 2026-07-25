'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Home, Calendar, DollarSign, FileText } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import ProfileForm from '@/components/features/tenant/ProfileForm';
import OccupantList from '@/components/features/tenant/OccupantList';
import DocumentUpload from '@/components/features/DocumentUpload';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import SkeletonCard from '@/components/ui/SkeletonCard';

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
    floorNumber?: number;
    roomType?: string;
    buildingId: string;
    buildingName: string;
    address: string;
    assignmentStart: string;
    assignmentEnd?: string;
    monthlyRate: number;
    depositPaid?: number;
    advancePaid?: number;
    utilityDepositPaid?: number;
    depositValidUntil?: string;
    depositRefundable?: boolean;
  } | null;
  occupants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    relationshipToTenant?: string;
    dateOfBirth?: string;
    phone?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
    moveInDate: string;
    moveOutDate?: string;
    notes?: string;
    isActive: boolean;
  }>;
  agreementDocument?: {
    id: string;
    url: string;
    name: string;
  } | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showNotification } = useNotifications();

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenant/profile');
      const data = await response.json();

      if (data.success) {
        setProfileData(data.data);
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to load profile',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role === 'tenant') {
      fetchProfile();
    } else if (status === 'unauthenticated') {
      router.push('/auth/tenant/signin');
    }
  }, [status, session, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <SkeletonCard showHeader={true} lines={5} />
            <SkeletonCard showHeader={true} lines={3} />
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'tenant') {
    return null; // Will redirect via useEffect
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/tenant"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <PageHeader
        title="My Profile"
        description="Manage your personal information and occupants"
      />
          {profileData && (
            <div className="space-y-6">
              {/* Room Assignment Info */}
              {profileData.roomAssignment && (
                <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
                  <h3 className="text-2xl font-bold mb-4 flex items-center">
                    <Home className="h-6 w-6 mr-2" />
                    Current Assignment
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm opacity-80">Building</p>
                      <p className="font-semibold text-lg">{profileData.roomAssignment.buildingName}</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-80">Room Number</p>
                      <p className="font-semibold text-lg">{profileData.roomAssignment.roomNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-80">Monthly Rent</p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(profileData.roomAssignment.monthlyRate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm opacity-80">Lease Period</p>
                      <p className="font-semibold text-lg">
                        {formatDate(profileData.roomAssignment.assignmentStart)} -{' '}
                        {formatDate(profileData.roomAssignment.assignmentEnd) || 'Ongoing'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm opacity-80">Address</p>
                    <p className="font-semibold">{profileData.roomAssignment.address}</p>
                  </div>
                  
                  {/* Deposit and Advance Information */}
                  {((profileData.roomAssignment.depositPaid && profileData.roomAssignment.depositPaid > 0) || 
                    (profileData.roomAssignment.advancePaid && profileData.roomAssignment.advancePaid > 0) || 
                    (profileData.roomAssignment.utilityDepositPaid && profileData.roomAssignment.utilityDepositPaid > 0)) && (
                    <div className="mt-6 pt-6 border-t border-white/20">
                      <h4 className="text-lg font-semibold mb-3">Deposits & Advance</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {profileData.roomAssignment.depositPaid && profileData.roomAssignment.depositPaid > 0 && (
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-sm opacity-80">Deposit</p>
                            <p className="font-semibold text-lg">
                              {formatCurrency(profileData.roomAssignment.depositPaid)}
                            </p>
                            {profileData.roomAssignment.depositValidUntil && (
                              <p className="text-xs opacity-70 mt-1">
                                Valid until: {formatDate(profileData.roomAssignment.depositValidUntil)}
                              </p>
                            )}
                            {profileData.roomAssignment.depositRefundable !== undefined && (
                              <p className="text-xs opacity-70">
                                {profileData.roomAssignment.depositRefundable ? '✓ Refundable' : '✗ Non-refundable'}
                              </p>
                            )}
                          </div>
                        )}
                        {profileData.roomAssignment.advancePaid && profileData.roomAssignment.advancePaid > 0 && (
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-sm opacity-80">Advance</p>
                            <p className="font-semibold text-lg">
                              {formatCurrency(profileData.roomAssignment.advancePaid)}
                            </p>
                          </div>
                        )}
                        {profileData.roomAssignment.utilityDepositPaid && profileData.roomAssignment.utilityDepositPaid > 0 && (
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-sm opacity-80">Utility Deposit</p>
                            <p className="font-semibold text-lg">
                              {formatCurrency(profileData.roomAssignment.utilityDepositPaid)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lease Information */}
              {profileData.profile.leaseStartDate && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Lease Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Lease Start</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(profileData.profile.leaseStartDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Lease End</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(profileData.profile.leaseEndDate) || 'Ongoing'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Security Deposit</p>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(profileData.profile.securityDeposit)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Form */}
              <ProfileForm
                initialData={profileData.profile}
                onSave={fetchProfile}
              />

              {/* Tenant Agreement */}
              {profileData && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Tenant Agreement</h3>
                  <DocumentUpload
                    tenantId={profileData.profile.id}
                    currentDocumentUrl={(profileData as any).agreementDocument?.url}
                    currentDocumentName={(profileData as any).agreementDocument?.name}
                    onUploadComplete={fetchProfile}
                    onDeleteComplete={fetchProfile}
                  />
                </div>
              )}

              {/* Occupants */}
              <OccupantList
                roomId={profileData.roomAssignment?.roomId}
                onOccupantChange={fetchProfile}
              />
            </div>
          )}
    </div>
  );
}
