'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Room, Tenant, CreateReservationData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import AdminFullScreenModal from '@/components/ui/AdminFullScreenModal';
import Link from 'next/link';

interface CreateReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoomId?: string;
  initialTenantId?: string;
}

export default function CreateReservationModal({
  isOpen,
  onClose,
  initialRoomId,
  initialTenantId,
}: CreateReservationModalProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const { currencySymbol, currencyCode } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeReservationRoomIds, setActiveReservationRoomIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<CreateReservationData>({
    tenantId: initialTenantId || '',
    roomId: initialRoomId || '',
    reservationDate: new Date(),
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days from now
    monthlyRate: 0,
    reservationDeposit: 0,
    notes: '',
  });

  // Fetch active reservations first, then rooms
  useEffect(() => {
    if (isOpen) {
      fetchActiveReservations();
      fetchTenants();
    }
  }, [isOpen]);

  // Fetch rooms after active reservations are loaded
  useEffect(() => {
    if (isOpen && activeReservationRoomIds.size >= 0) {
      // activeReservationRoomIds.size >= 0 is always true, but this ensures
      // we wait for the initial fetch to complete (even if empty)
      fetchRooms();
    }
  }, [isOpen, activeReservationRoomIds]);

  // Update form when initial values change
  useEffect(() => {
    if (initialRoomId) {
      setFormData(prev => ({ ...prev, roomId: initialRoomId }));
    }
    if (initialTenantId) {
      setFormData(prev => ({ ...prev, tenantId: initialTenantId }));
    }
  }, [initialRoomId, initialTenantId]);

  // Update selected room and monthly rate when room changes
  useEffect(() => {
    if (formData.roomId) {
      const room = rooms.find(r => r.id === formData.roomId);
      if (room) {
        setSelectedRoom(room);
        setFormData(prev => ({ ...prev, monthlyRate: room.monthlyRate }));
      }
    } else {
      setSelectedRoom(null);
    }
  }, [formData.roomId, rooms]);

  const fetchActiveReservations = async () => {
    try {
      // Fetch active reservations to filter out rooms that already have reservations
      const response = await fetch('/api/reservations?status=active');
      const result = await response.json();
      
      if (result.success && result.data) {
        const reservations = result.data.reservations || result.data || [];
        // Get set of room IDs that have active reservations
        const roomIdsWithActiveReservations = new Set(
          reservations
            .filter((r: any) => {
              // Only include reservations that haven't expired
              const expiryDate = new Date(r.expiryDate || r.expiry_date);
              return expiryDate >= new Date();
            })
            .map((r: any) => r.roomId || r.room_id)
        );
        setActiveReservationRoomIds(roomIdsWithActiveReservations);
      }
    } catch (error) {
      console.error('Error fetching active reservations:', error);
      // Don't show error to user, just log it
    }
  };

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      // Fetch all rooms and filter client-side
      const response = await fetch('/api/rooms?limit=1000');
      const result = await response.json();
      
      if (result.success) {
        // Handle paginated response
        const roomsData = result.data?.rooms || result.data || [];
        const allRooms = Array.isArray(roomsData) ? roomsData : [];
        
        // Filter rooms:
        // 1. Must be vacant or reserved (not occupied or maintenance)
        // 2. Must NOT have an active reservation (expiry_date >= CURRENT_DATE)
        const filteredRooms = allRooms.filter((r: Room) => {
          const isAvailableStatus = r.roomStatus === 'vacant' || r.roomStatus === 'reserved';
          const hasActiveReservation = activeReservationRoomIds.has(r.id);
          return isAvailableStatus && !hasActiveReservation;
        });
        setRooms(filteredRooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load rooms',
      });
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchTenants = async () => {
    setLoadingTenants(true);
    try {
      const response = await fetch('/api/tenants?limit=1000');
      const result = await response.json();
      
      if (result.success) {
        const tenantsData = result.data?.tenants || result.data || [];
        setTenants(tenantsData);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load tenants',
      });
    } finally {
      setLoadingTenants(false);
    }
  };

  const calculateRequiredDeposit = (): number => {
    if (!selectedRoom?.depositRequired) return 0;

    const monthlyRate = formData.monthlyRate || selectedRoom.monthlyRate;

    switch (selectedRoom.depositType) {
      case 'one_month':
        return monthlyRate;
      case 'percentage':
        return selectedRoom.depositPercentage
          ? (monthlyRate * selectedRoom.depositPercentage) / 100
          : 0;
      case 'fixed':
        return selectedRoom.depositAmount || 0;
      default:
        return 0;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'monthlyRate' || name === 'reservationDeposit'
        ? (value ? parseFloat(value) : 0)
        : name === 'reservationDate' || name === 'expiryDate'
        ? new Date(value)
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate deposit is required (must be > 0)
    if (!formData.reservationDeposit || formData.reservationDeposit <= 0) {
      showNotification({
        type: 'error',
        title: 'Deposit Required',
        message: 'Reservation deposit is required. No reservation can be created without a deposit payment.',
      });
      setIsSubmitting(false);
      return;
    }

    // Validate expiry date
    if (formData.expiryDate <= formData.reservationDate!) {
      showNotification({
        type: 'error',
        title: 'Invalid Date',
        message: 'Expiry date must be after reservation date',
      });
      setIsSubmitting(false);
      return;
    }

    // Validate deposit meets room requirements if room has depositRequired
    if (selectedRoom?.depositRequired) {
      const requiredDeposit = calculateRequiredDeposit();
      if (formData.reservationDeposit < requiredDeposit) {
        showNotification({
          type: 'error',
          title: 'Insufficient Deposit',
          message: `Minimum deposit required: ${formatCurrency(requiredDeposit, currencyCode)}`,
        });
        setIsSubmitting(false);
        return;
      }
    }

    const loadingId = showNotification({
      type: 'loading',
      title: 'Creating reservation...',
      message: 'Please wait while we create the reservation.',
    });

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          reservationDate: formData.reservationDate?.toISOString().split('T')[0],
          expiryDate: formData.expiryDate.toISOString().split('T')[0],
        }),
      });

      const result = await response.json();

      if (!result.success) {
        // Use details if available, otherwise use error, otherwise default message
        const errorMessage = result.details || result.error || 'Failed to create reservation';
        throw new Error(errorMessage);
      }

      updateNotification(loadingId, {
        type: 'success',
        title: 'Reservation created successfully!',
        message: 'The reservation has been created and the room status has been updated.',
      });

      // Reset form
      setFormData({
        tenantId: '',
        roomId: '',
        reservationDate: new Date(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        monthlyRate: 0,
        reservationDeposit: 0,
        notes: '',
      });
      setSelectedRoom(null);
      
      onClose();
      router.refresh();
    } catch (error) {
      console.error('Error creating reservation:', error);
      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to create reservation',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiredDeposit = calculateRequiredDeposit();

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="create-reservation-form"
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating...' : 'Create Reservation'}
      </button>
    </>
  );

  return (
    <AdminFullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Reservation"
      subtitle="Reserve a room for a tenant with deposit and expiry date"
      actionButtons={actionButtons}
    >
      <form id="create-reservation-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Room Selection */}
        <div>
          <label htmlFor="roomId" className="block text-sm font-medium text-gray-900 mb-1">
            Room *
          </label>
          <select
            id="roomId"
            name="roomId"
            required
            value={formData.roomId}
            onChange={handleInputChange}
            disabled={loadingRooms}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Select a room</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.roomNumber} - {room.buildingName || 'Unknown Building'} ({room.roomStatus})
              </option>
            ))}
          </select>
          {selectedRoom && (
            <p className="mt-1 text-sm text-gray-600">
              Monthly Rate: {formatCurrency(selectedRoom.monthlyRate, currencyCode)}
              {selectedRoom.depositRequired && (
                <span className="ml-2">
                  | Required Deposit: {formatCurrency(requiredDeposit, currencyCode)}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Tenant Selection */}
        <div>
          <label htmlFor="tenantId" className="block text-sm font-medium text-gray-900 mb-1">
            Tenant *
          </label>
          <div className="flex gap-2">
            <select
              id="tenantId"
              name="tenantId"
              required
              value={formData.tenantId}
              onChange={handleInputChange}
              disabled={loadingTenants}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select a tenant</option>
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.firstName} {tenant.lastName} ({tenant.email})
                </option>
              ))}
            </select>
            <Link
              href="/admin/tenants/new"
              target="_blank"
              className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              New Tenant
            </Link>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="reservationDate" className="block text-sm font-medium text-gray-900 mb-1">
              Reservation Date *
            </label>
            <input
              type="date"
              id="reservationDate"
              name="reservationDate"
              required
              value={formData.reservationDate?.toISOString().split('T')[0] || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-900 mb-1">
              Expiry Date *
            </label>
            <input
              type="date"
              id="expiryDate"
              name="expiryDate"
              required
              value={formData.expiryDate.toISOString().split('T')[0]}
              onChange={handleInputChange}
              min={formData.reservationDate?.toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Monthly Rate */}
        <div>
          <label htmlFor="monthlyRate" className="block text-sm font-medium text-gray-900 mb-1">
            Monthly Rate ({currencySymbol}) *
          </label>
          <input
            type="number"
            id="monthlyRate"
            name="monthlyRate"
            required
            min="0"
            step="0.01"
            value={formData.monthlyRate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Reservation Deposit */}
        <div>
          <label htmlFor="reservationDeposit" className="block text-sm font-medium text-gray-900 mb-1">
            Reservation Deposit ({currencySymbol}) <span className="text-red-600">*</span>
            {selectedRoom?.depositRequired && (
              <span className="text-red-600"> (Min: {formatCurrency(requiredDeposit, currencyCode)})</span>
            )}
          </label>
          <input
            type="number"
            id="reservationDeposit"
            name="reservationDeposit"
            required
            min={selectedRoom?.depositRequired ? requiredDeposit : 0.01}
            step="0.01"
            value={formData.reservationDeposit}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {(!formData.reservationDeposit || formData.reservationDeposit <= 0) && (
            <p className="mt-1 text-sm text-red-600">
              Reservation deposit is required. No reservation can be created without a deposit payment.
            </p>
          )}
          {selectedRoom?.depositRequired && formData.reservationDeposit > 0 && formData.reservationDeposit < requiredDeposit && (
            <p className="mt-1 text-sm text-red-600">
              Minimum deposit required: {formatCurrency(requiredDeposit, currencyCode)}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-900 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Additional notes about this reservation..."
          />
        </div>
      </form>
    </AdminFullScreenModal>
  );
}

