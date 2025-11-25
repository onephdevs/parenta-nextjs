'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ReservationWithDetails } from '@/types/database';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';

interface ReservationsListProps {
  reservations: ReservationWithDetails[];
  onRefresh?: () => void;
}

export default function ReservationsList({ reservations, onRefresh }: ReservationsListProps) {
  const router = useRouter();
  const { formatCurrency: formatCurrencyUtil } = useCurrency();
  const { currencyCode } = useCurrency();
  const { showNotification, updateNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('expiryDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and sort reservations
  const filteredAndSortedReservations = useMemo(() => {
    const filtered = reservations.filter(reservation => {
      const matchesSearch = !searchTerm || (
        reservation.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.tenantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.buildingName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const matchesStatus = !selectedStatus || reservation.reservationStatus === selectedStatus;

      return matchesSearch && matchesStatus;
    });

    // Sort reservations
    filtered.sort((a, b) => {
      let aValue: string | number | Date = '';
      let bValue: string | number | Date = '';

      switch (sortBy) {
        case 'tenantName':
          aValue = a.tenantName.toLowerCase();
          bValue = b.tenantName.toLowerCase();
          break;
        case 'roomNumber':
          aValue = a.roomNumber.toLowerCase();
          bValue = b.roomNumber.toLowerCase();
          break;
        case 'reservationDate':
          aValue = new Date(a.reservationDate).getTime();
          bValue = new Date(b.reservationDate).getTime();
          break;
        case 'expiryDate':
          aValue = new Date(a.expiryDate).getTime();
          bValue = new Date(b.expiryDate).getTime();
          break;
        case 'monthlyRate':
          aValue = a.monthlyRate;
          bValue = b.monthlyRate;
          break;
        case 'reservationDeposit':
          aValue = a.reservationDeposit;
          bValue = b.reservationDeposit;
          break;
        default:
          aValue = new Date(a.expiryDate).getTime();
          bValue = new Date(b.expiryDate).getTime();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? 
          (aValue as number) - (bValue as number) : 
          (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [reservations, searchTerm, selectedStatus, sortBy, sortOrder]);

  const getStatusBadgeClass = (status: string, isExpired: boolean) => {
    if (isExpired && status === 'active') {
      return 'bg-red-100 text-red-800';
    }
    
    switch (status) {
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

  const getExpiryBadge = (reservation: ReservationWithDetails) => {
    if (reservation.isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expired
        </span>
      );
    }
    
    if (reservation.daysUntilExpiry <= 7 && reservation.daysUntilExpiry >= 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Expiring in {reservation.daysUntilExpiry} day{reservation.daysUntilExpiry !== 1 ? 's' : ''}
        </span>
      );
    }
    
    return null;
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('Are you sure you want to cancel this reservation? This action cannot be undone.')) {
      return;
    }

    const loadingId = showNotification({
      type: 'loading',
      title: 'Cancelling reservation...',
      message: 'Please wait.',
    });

    try {
      const response = await fetch(`/api/reservations/${reservationId}?refundDeposit=true`, {
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

      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to cancel reservation',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header with Search and Filters */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by tenant, room, or building..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="converted">Converted</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="expiryDate">Sort by Expiry Date</option>
              <option value="reservationDate">Sort by Reservation Date</option>
              <option value="tenantName">Sort by Tenant</option>
              <option value="roomNumber">Sort by Room</option>
              <option value="monthlyRate">Sort by Monthly Rate</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Room
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Reservation Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Expiry Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Monthly Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Deposit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedReservations.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                  No reservations found
                </td>
              </tr>
            ) : (
              filteredAndSortedReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{reservation.tenantName}</div>
                    <div className="text-sm text-gray-500">{reservation.tenantEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{reservation.roomNumber}</div>
                    <div className="text-sm text-gray-500">{reservation.buildingName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(reservation.reservationDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(reservation.expiryDate).toLocaleDateString()}
                    </div>
                    {getExpiryBadge(reservation)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(reservation.monthlyRate, currencyCode)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(reservation.reservationDeposit, currencyCode)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(reservation.reservationStatus, reservation.isExpired)}`}>
                      {reservation.reservationStatus.charAt(0).toUpperCase() + reservation.reservationStatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/tenants/reservations/${reservation.id}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        View
                      </Link>
                      {reservation.reservationStatus === 'active' && (
                        <>
                          <Link
                            href={`/admin/tenants/reservations/${reservation.id}?convert=true`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Convert
                          </Link>
                          <button
                            onClick={() => handleCancelReservation(reservation.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

