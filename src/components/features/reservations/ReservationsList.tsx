'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ReservationWithDetails } from '@/types/database';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ReservationStatusBadge } from '@/components/domain/StatusBadges';
import { Badge } from '@/components/ui/Badge';
import { Search } from 'lucide-react';

interface ReservationsListProps {
  reservations: ReservationWithDetails[];
  onRefresh?: () => void;
}

export default function ReservationsList({ reservations, onRefresh }: ReservationsListProps) {
  const router = useRouter();
  const { formatCurrency: formatCurrencyUtil } = useCurrency();
  const { showNotification, updateNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();
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

  const getExpiryBadge = (reservation: ReservationWithDetails) => {
    if (reservation.isExpired) {
      return <Badge tone="danger">Expired</Badge>;
    }

    if (reservation.daysUntilExpiry <= 7 && reservation.daysUntilExpiry >= 0) {
      return (
        <Badge tone="warning">
          Expiring in {reservation.daysUntilExpiry} day
          {reservation.daysUntilExpiry !== 1 ? 's' : ''}
        </Badge>
      );
    }

    return null;
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (
      !(await confirm({
        title: 'Cancel reservation?',
        message: 'Are you sure you want to cancel this reservation? This action cannot be undone.',
        confirmText: 'Cancel reservation',
        variant: 'danger',
      }))
    ) {
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
    <Card padding="none" className="overflow-hidden">
      {dialog}
      <div className="border-b border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              className="pl-10"
              placeholder="Search by tenant, room, or building..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-auto min-w-[9rem]"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="converted">Converted</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </Select>

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-auto min-w-[11rem]"
            >
              <option value="expiryDate">Sort by Expiry Date</option>
              <option value="reservationDate">Sort by Reservation Date</option>
              <option value="tenantName">Sort by Tenant</option>
              <option value="roomNumber">Sort by Room</option>
              <option value="monthlyRate">Sort by Monthly Rate</option>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              aria-label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
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
                    {formatCurrencyUtil(reservation.monthlyRate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrencyUtil(reservation.reservationDeposit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ReservationStatusBadge
                      status={
                        reservation.isExpired && reservation.reservationStatus === 'active'
                          ? 'expired'
                          : reservation.reservationStatus
                      }
                    />
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
    </Card>
  );
}

