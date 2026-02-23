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
  const [buildingConfig, setBuildingConfig] = useState<any>(null);
  const [requiredDeposit, setRequiredDeposit] = useState(0);
  const [requiredAdvance, setRequiredAdvance] = useState(0);
  const [requiredUtility, setRequiredUtility] = useState(0);
  const [depositValidityDays, setDepositValidityDays] = useState(5);
  
  type FormState = Omit<CreateReservationData, 'monthlyRate' | 'reservationDeposit'> & { monthlyRate?: number; reservationDeposit?: number };
  const [formData, setFormData] = useState<FormState>({
    tenantId: initialTenantId || '',
    roomId: initialRoomId || '',
    reservationDate: new Date(),
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days from now
    monthlyRate: undefined,
    reservationDeposit: undefined,
    advanceAmount: 0,
    utilityDepositAmount: 0,
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

  // Update selected room and monthly rate when room changes, and fetch building config
  useEffect(() => {
    if (formData.roomId) {
      const room = rooms.find(r => r.id === formData.roomId);
      if (room) {
        setSelectedRoom(room);
        setFormData(prev => ({ ...prev, monthlyRate: room.monthlyRate }));
        // Fetch building deposit config
        fetchBuildingDepositConfig(room.buildingId);
      }
    } else {
      setSelectedRoom(null);
      setBuildingConfig(null);
      setRequiredDeposit(0);
      setRequiredAdvance(0);
      setRequiredUtility(0);
    }
  }, [formData.roomId, rooms]);
  
  // Fetch building deposit config
  const fetchBuildingDepositConfig = async (buildingId: string) => {
    try {
      const response = await fetch(`/api/building-deposit-config?buildingId=${buildingId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setBuildingConfig(result.data);
        setDepositValidityDays(result.data.depositValidityDays || 5);
        
        // Calculate required amounts
        const monthlyRate = formData.monthlyRate ?? selectedRoom?.monthlyRate ?? 0;
        if (monthlyRate > 0) {
          calculateRequiredAmounts(buildingId, monthlyRate, result.data);
        }
        } else {
          setBuildingConfig(null);
          // Fall back to room-level calculation
          if (selectedRoom) {
            const monthlyRate = formData.monthlyRate ?? selectedRoom.monthlyRate;
            let deposit = 0;
            if (selectedRoom.depositRequired) {
              switch (selectedRoom.depositType) {
                case 'one_month':
                  deposit = monthlyRate;
                  break;
                case 'percentage':
                  deposit = selectedRoom.depositPercentage
                    ? (monthlyRate * selectedRoom.depositPercentage) / 100
                    : 0;
                  break;
                case 'fixed':
                  deposit = selectedRoom.depositAmount || 0;
                  break;
              }
            }
            setRequiredDeposit(deposit);
            setRequiredAdvance(0);
            setRequiredUtility(0);
          }
        }
    } catch (error) {
      console.error('Error fetching building deposit config:', error);
      setBuildingConfig(null);
    }
  };
  
  // Calculate required amounts based on building config
  const calculateRequiredAmounts = async (buildingId: string, monthlyRate: number, config: any) => {
    try {
      const response = await fetch(
        `/api/building-deposit-config/${buildingId}?action=calculate&monthlyRate=${monthlyRate}`
      );
      const result = await response.json();
      
      if (result.success && result.data) {
        setRequiredDeposit(result.data.requiredDeposit || 0);
        setRequiredAdvance(result.data.requiredAdvance || 0);
        setRequiredUtility(result.data.utilityDeposit || 0);
        
        // Auto-fill deposit when minimum is known and field is empty or zero
        if ((formData.reservationDeposit == null || formData.reservationDeposit === 0) && result.data.requiredDeposit > 0) {
          setFormData(prev => ({ ...prev, reservationDeposit: result.data.requiredDeposit }));
        }
      }
    } catch (error) {
      console.error('Error calculating required amounts:', error);
    }
  };
  
  // Recalculate when monthly rate changes
  useEffect(() => {
    const rate = formData.monthlyRate ?? selectedRoom?.monthlyRate ?? 0;
    if (selectedRoom && buildingConfig && rate > 0) {
      calculateRequiredAmounts(selectedRoom.buildingId, rate, buildingConfig);
    }
  }, [formData.monthlyRate, selectedRoom, buildingConfig]);

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
        // 1. Must be vacant (not occupied, reserved, or maintenance)
        // 2. Must NOT have an active reservation (expiry_date >= CURRENT_DATE)
        // Note: We only show vacant rooms to avoid confusion. Rooms with status "reserved" 
        // should have an active reservation record, and if they don't, the status should be updated.
        const filteredRooms = allRooms.filter((r: Room) => {
          const isVacant = r.roomStatus === 'vacant';
          const hasActiveReservation = activeReservationRoomIds.has(r.id);
          return isVacant && !hasActiveReservation;
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
        const tenantsData = result.data?.tenants || (Array.isArray(result.data) ? result.data : []);
        setTenants(Array.isArray(tenantsData) ? tenantsData : []);
      } else {
        setTenants([]);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setTenants([]);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load tenants',
      });
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name === 'monthlyRate' || name === 'reservationDeposit') {
        const num = value === '' ? undefined : parseFloat(value);
        const final = num !== undefined && !Number.isNaN(num) ? num : (name === 'monthlyRate' ? prev.monthlyRate : prev.reservationDeposit);
        return { ...prev, [name]: final };
      }
      if (name === 'advanceAmount' || name === 'utilityDepositAmount') {
        const parsed = value === '' ? 0 : parseFloat(value);
        const num = Number.isNaN(parsed) ? (name === 'advanceAmount' ? prev.advanceAmount : prev.utilityDepositAmount) : parsed;
        return { ...prev, [name]: num };
      }
      if (name === 'reservationDate' || name === 'expiryDate') {
        return { ...prev, [name]: new Date(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const depositValue = formData.reservationDeposit ?? 0;
    if (typeof formData.reservationDeposit === 'number' && Number.isNaN(formData.reservationDeposit) || depositValue < 0) {
      showNotification({
        type: 'error',
        title: 'Invalid Deposit',
        message: 'Reservation deposit cannot be negative.',
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

    // Validate deposit meets minimum when one is set (building config or room config)
    const currentRequiredDeposit = buildingConfig ? requiredDeposit : calculateRequiredDepositLocal();
    if (currentRequiredDeposit > 0 && (depositValue < currentRequiredDeposit)) {
      showNotification({
        type: 'error',
        title: 'Reservation deposit required',
        message: depositValue === 0 || formData.reservationDeposit == null
          ? `Reservation deposit is required. Minimum: ${formatCurrency(currentRequiredDeposit, currencyCode)}`
          : `Minimum deposit required: ${formatCurrency(currentRequiredDeposit, currencyCode)}`,
      });
      setIsSubmitting(false);
      return;
    }
    
    // Validate advance if provided
    if (formData.advanceAmount && formData.advanceAmount > 0 && requiredAdvance > 0) {
      if (formData.advanceAmount < requiredAdvance) {
        showNotification({
          type: 'error',
          title: 'Insufficient Advance',
          message: `Minimum advance required: ${formatCurrency(requiredAdvance, currencyCode)}`,
        });
        setIsSubmitting(false);
        return;
      }
    }
    
    // Validate utility deposit if provided
    if (formData.utilityDepositAmount && formData.utilityDepositAmount > 0 && requiredUtility > 0) {
      if (formData.utilityDepositAmount < requiredUtility) {
        showNotification({
          type: 'error',
          title: 'Insufficient Utility Deposit',
          message: `Minimum utility deposit required: ${formatCurrency(requiredUtility, currencyCode)}`,
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
          monthlyRate: formData.monthlyRate ?? 0,
          reservationDeposit: formData.reservationDeposit ?? 0,
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
        monthlyRate: undefined,
        reservationDeposit: undefined,
        advanceAmount: 0,
        utilityDepositAmount: 0,
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

  // Calculate required deposit (fallback to room-level if no building config)
  const calculateRequiredDepositLocal = (): number => {
    if (buildingConfig) {
      return requiredDeposit;
    }
    if (!selectedRoom?.depositRequired) return 0;
    const monthlyRate = formData.monthlyRate ?? selectedRoom.monthlyRate;
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
  
  const displayRequiredDeposit = buildingConfig ? requiredDeposit : calculateRequiredDepositLocal();

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
        disabled={isSubmitting || (formData.reservationDeposit ?? 0) < 0 || (displayRequiredDeposit > 0 && (formData.reservationDeposit ?? 0) < displayRequiredDeposit)}
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
                {room.roomNumber} - {room.buildingName || 'Unknown Building'}
              </option>
            ))}
          </select>
          {selectedRoom && (
            <p className="mt-1 text-sm text-gray-600">
              Monthly Rate: {formatCurrency(selectedRoom.monthlyRate, currencyCode)}
              {requiredDeposit > 0 && (
                <span className="ml-2">
                  | Required Deposit: {formatCurrency(requiredDeposit, currencyCode)}
                </span>
              )}
              {buildingConfig && requiredAdvance > 0 && (
                <span className="ml-2">
                  | Required Advance: {formatCurrency(requiredAdvance, currencyCode)}
                </span>
              )}
              {buildingConfig && requiredUtility > 0 && (
                <span className="ml-2">
                  | Utility Deposit: {formatCurrency(requiredUtility, currencyCode)}
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
              {Array.isArray(tenants) && tenants.length > 0 ? (
                tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.firstName} {tenant.lastName} ({tenant.email})
                  </option>
                ))
              ) : (
                <option value="" disabled>{loadingTenants ? 'Loading tenants...' : 'No tenants available'}</option>
              )}
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
              min="2000-01-01"
              max="2099-12-31"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              style={{
                colorScheme: 'light',
              }}
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
              min={formData.reservationDate?.toISOString().split('T')[0] || '2000-01-01'}
              max="2099-12-31"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              style={{
                colorScheme: 'light',
              }}
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
            value={formData.monthlyRate ?? ''}
            onChange={handleInputChange}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Reservation Deposit */}
        <div>
          <label htmlFor="reservationDeposit" className="block text-sm font-medium text-gray-900 mb-1">
            Reservation Deposit ({currencySymbol}) <span className="text-red-600">*</span>
            {displayRequiredDeposit > 0 && (
              <span className="text-red-600"> (Min: {formatCurrency(displayRequiredDeposit, currencyCode)})</span>
            )}
          </label>
          <input
            type="number"
            id="reservationDeposit"
            name="reservationDeposit"
            min={displayRequiredDeposit > 0 ? displayRequiredDeposit : 0}
            step="0.01"
            value={formData.reservationDeposit ?? ''}
            onChange={handleInputChange}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {(formData.reservationDeposit ?? 0) < 0 && (
            <p className="mt-1 text-sm text-red-600">
              Reservation deposit cannot be negative.
            </p>
          )}
          {displayRequiredDeposit > 0 && (formData.reservationDeposit == null || (formData.reservationDeposit >= 0 && formData.reservationDeposit < displayRequiredDeposit)) && (
            <p className="mt-1 text-sm text-red-600">
              {formData.reservationDeposit == null || formData.reservationDeposit === 0
                ? `Reservation deposit is required. Minimum: ${formatCurrency(displayRequiredDeposit, currencyCode)}`
                : `Minimum deposit required: ${formatCurrency(displayRequiredDeposit, currencyCode)}`}
            </p>
          )}
          {buildingConfig && depositValidityDays > 0 && (
            <p className="mt-1 text-sm text-gray-600">
              Deposit valid for {depositValidityDays} day{depositValidityDays !== 1 ? 's' : ''} from reservation date
            </p>
          )}
        </div>

        {/* Advance Payment */}
        {buildingConfig && requiredAdvance > 0 && (
          <div>
            <label htmlFor="advanceAmount" className="block text-sm font-medium text-gray-900 mb-1">
              Advance Payment ({currencySymbol}) (Optional)
              <span className="text-gray-500"> — 0 for none, or min {formatCurrency(requiredAdvance, currencyCode)} if provided</span>
            </label>
            <input
              type="number"
              id="advanceAmount"
              name="advanceAmount"
              min={0}
              step="0.01"
              value={formData.advanceAmount === 0 || Number.isNaN(formData.advanceAmount) ? '' : formData.advanceAmount}
              onChange={handleInputChange}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-600">
              Any advance rent payment made at the start of the lease
            </p>
          </div>
        )}

        {/* Utility Deposit */}
        {buildingConfig && requiredUtility > 0 && (
          <div>
            <label htmlFor="utilityDepositAmount" className="block text-sm font-medium text-gray-900 mb-1">
              Utility Deposit ({currencySymbol}) (Optional)
              <span className="text-gray-500"> — 0 for none, or min {formatCurrency(requiredUtility, currencyCode)} if provided</span>
            </label>
            <input
              type="number"
              id="utilityDepositAmount"
              name="utilityDepositAmount"
              min={0}
              step="0.01"
              value={formData.utilityDepositAmount === 0 || Number.isNaN(formData.utilityDepositAmount) ? '' : formData.utilityDepositAmount}
              onChange={handleInputChange}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-600">
              Utility deposit amount for this building
            </p>
          </div>
        )}

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

