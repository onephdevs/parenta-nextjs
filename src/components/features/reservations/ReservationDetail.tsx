'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReservationWithDetails } from '@/types/database';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useNotifications } from '@/hooks/useNotifications';
import ConvertReservationModal from './ConvertReservationModal';

interface ReservationDetailProps {
  reservation: ReservationWithDetails;
  showConvertModal?: boolean;
}

export default function ReservationDetail({ reservation, showConvertModal = false }: ReservationDetailProps) {
  const router = useRouter();
  const { currencyCode } = useCurrency();
  const { showNotification, updateNotification } = useNotifications();
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(showConvertModal);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this reservation? This action cannot be undone.')) {
      return;
    }

    setIsCancelling(true);
    const loadingId = showNotification({
      type: 'loading',
      title: 'Cancelling reservation...',
      message: 'Please wait.',
    });

    try {
      const response = await fetch(`/api/reservations/${reservation.id}?refundDeposit=true`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.details || 'Failed to cancel reservation');
      }

      updateNotification(loadingId, {
        type: 'success',
        title: 'Reservation cancelled',
        message: 'The reservation has been cancelled and the room status has been updated.',
      });

      router.push('/admin/tenants/reservations');
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to cancel reservation',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadgeClass = () => {
    if (reservation.isExpired && reservation.reservationStatus === 'active') {
      return 'bg-red-100 text-red-800';
    }
    
    switch (reservation.reservationStatus) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'converted':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reservation Details</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage reservation information
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/tenants/reservations"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to List
          </Link>
          {reservation.reservationStatus === 'active' && (
            <>
              <button
                onClick={() => setIsConvertModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Convert to Assignment
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Cancel Reservation
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass()}`}>
              {reservation.reservationStatus.charAt(0).toUpperCase() + reservation.reservationStatus.slice(1)}
            </span>
            {reservation.isExpired && (
              <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                Expired
              </span>
            )}
            {!reservation.isExpired && reservation.daysUntilExpiry <= 7 && reservation.daysUntilExpiry >= 0 && (
              <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                Expiring in {reservation.daysUntilExpiry} day{reservation.daysUntilExpiry !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenant Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-600">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{reservation.tenantName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{reservation.tenantEmail}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Tenant ID</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <Link href={`/admin/tenants/${reservation.tenantId}`} className="text-purple-600 hover:text-purple-900">
                  {reservation.tenantId}
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        {/* Room Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-600">Room Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{reservation.roomNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Building</dt>
              <dd className="mt-1 text-sm text-gray-900">{reservation.buildingName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Room ID</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <Link href={`/admin/buildings/${reservation.roomId}/rooms`} className="text-purple-600 hover:text-purple-900">
                  {reservation.roomId}
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        {/* Reservation Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reservation Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-600">Reservation Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(reservation.reservationDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Expiry Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(reservation.expiryDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Monthly Rate</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatCurrency(reservation.monthlyRate, currencyCode)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Reservation Deposit</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatCurrency(reservation.reservationDeposit, currencyCode)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          <dl className="space-y-3">
            {reservation.notes && (
              <div>
                <dt className="text-sm font-medium text-gray-600">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{reservation.notes}</dd>
              </div>
            )}
            {reservation.convertedToAssignmentId && (
              <div>
                <dt className="text-sm font-medium text-gray-600">Converted to Assignment</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <Link href={`/admin/tenants/${reservation.tenantId}`} className="text-purple-600 hover:text-purple-900">
                    View Assignment
                  </Link>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-600">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(reservation.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(reservation.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Convert Modal */}
      {reservation.reservationStatus === 'active' && (
        <ConvertReservationModal
          reservation={reservation}
          isOpen={isConvertModalOpen}
          onClose={() => {
            setIsConvertModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

