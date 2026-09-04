'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Room, CreateReservationData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import SectionedFormShell, { SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { Home, User, Calendar, DollarSign, FileText } from 'lucide-react';
import ReservationPersonPicker from '@/components/features/reservations/ReservationPersonPicker';

interface CreateReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoomId?: string;
  initialTenantId?: string;
}

type FormSection = 'room' | 'person' | 'dates' | 'payments' | 'notes';

const formSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'room',
    label: 'Room',
    icon: <Home className="h-4 w-4" />,
    title: 'Room Selection',
    subtitle: 'Select the vacant room to hold',
  },
  {
    id: 'person',
    label: 'Person',
    icon: <User className="h-4 w-4" />,
    title: 'Who is holding this room?',
    subtitle: 'A walk-in or returning person — not a current occupant',
  },
  {
    id: 'dates',
    label: 'Dates',
    icon: <Calendar className="h-4 w-4" />,
    title: 'Reservation Dates',
    subtitle: 'Set reservation and expiry dates',
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: <DollarSign className="h-4 w-4" />,
    title: 'Payment Details',
    subtitle: 'Configure rates and deposits',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <FileText className="h-4 w-4" />,
    title: 'Additional Notes',
    subtitle: 'Add any additional information',
  },
];

export default function CreateReservationModal({
  isOpen,
  onClose,
  initialRoomId,
  initialTenantId,
}: CreateReservationModalProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const { formatCurrency, currencySymbol } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<FormSection>('room');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
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
        const roomIdsWithActiveReservations = new Set<string>(
          reservations
            .filter((r: { expiryDate?: string; expiry_date?: string }) => {
              // Only include reservations that haven't expired
              const expiryDate = new Date(r.expiryDate || r.expiry_date || 0);
              return expiryDate >= new Date();
            })
            .map((r: { roomId?: string; room_id?: string }) => r.roomId || r.room_id)
            .filter((id: string | undefined): id is string => Boolean(id))
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

    if (!formData.tenantId) {
      showNotification({
        type: 'error',
        title: 'Select a person',
        message: 'Choose who is holding this room, or add them first.',
      });
      setActiveSection('person');
      setIsSubmitting(false);
      return;
    }

    if (!formData.roomId) {
      showNotification({
        type: 'error',
        title: 'Select a room',
        message: 'Choose the vacant room to hold.',
      });
      setActiveSection('room');
      setIsSubmitting(false);
      return;
    }

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
          ? `Reservation deposit is required. Minimum: ${formatCurrency(currentRequiredDeposit)}`
          : `Minimum deposit required: ${formatCurrency(currentRequiredDeposit)}`,
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
          message: `Minimum advance required: ${formatCurrency(requiredAdvance)}`,
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
          message: `Minimum utility deposit required: ${formatCurrency(requiredUtility)}`,
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

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'room':
        return (
          <FormField
            label="Room"
            htmlFor="roomId"
            required
            hint={
              selectedRoom
                ? `Monthly Rate: ${formatCurrency(selectedRoom.monthlyRate)}${
                    requiredDeposit > 0
                      ? ` | Required Deposit: ${formatCurrency(requiredDeposit)}`
                      : ''
                  }${
                    buildingConfig && requiredAdvance > 0
                      ? ` | Required Advance: ${formatCurrency(requiredAdvance)}`
                      : ''
                  }${
                    buildingConfig && requiredUtility > 0
                      ? ` | Utility Deposit: ${formatCurrency(requiredUtility)}`
                      : ''
                  }`
                : undefined
            }
          >
            <Select
              id="roomId"
              name="roomId"
              required
              value={formData.roomId}
              onChange={handleInputChange}
              isDisabled={loadingRooms}
            >
              <option value="">Select a room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber} - {room.buildingName || 'Unknown Building'}
                </option>
              ))}
            </Select>
          </FormField>
        );

      case 'person':
        return (
          <ReservationPersonPicker
            value={formData.tenantId}
            onChange={(personId) =>
              setFormData((prev) => ({ ...prev, tenantId: personId }))
            }
            active={isOpen}
          />
        );

      case 'dates':
        return (
          <div className="space-y-6">
            <FormField label="Reservation Date" htmlFor="reservationDate" required>
              <Input
                type="date"
                id="reservationDate"
                name="reservationDate"
                required
                value={formData.reservationDate?.toISOString().split('T')[0] || ''}
                onChange={handleInputChange}
                min="2000-01-01"
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>

            <FormField label="Expiry Date" htmlFor="expiryDate" required>
              <Input
                type="date"
                id="expiryDate"
                name="expiryDate"
                required
                value={formData.expiryDate.toISOString().split('T')[0]}
                onChange={handleInputChange}
                min={formData.reservationDate?.toISOString().split('T')[0] || '2000-01-01'}
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <FormField label={`Monthly Rate (${currencySymbol})`} htmlFor="monthlyRate" required>
              <Input
                type="number"
                id="monthlyRate"
                name="monthlyRate"
                required
                min="0"
                step="0.01"
                value={formData.monthlyRate ?? ''}
                onChange={handleInputChange}
                placeholder="0"
              />
            </FormField>

            <FormField
              label={`Reservation Deposit (${currencySymbol})`}
              htmlFor="reservationDeposit"
              required
              error={
                (formData.reservationDeposit ?? 0) < 0
                  ? 'Reservation deposit cannot be negative.'
                  : displayRequiredDeposit > 0 &&
                      (formData.reservationDeposit == null ||
                        (formData.reservationDeposit >= 0 &&
                          formData.reservationDeposit < displayRequiredDeposit))
                    ? formData.reservationDeposit == null || formData.reservationDeposit === 0
                      ? `Reservation deposit is required. Minimum: ${formatCurrency(displayRequiredDeposit)}`
                      : `Minimum deposit required: ${formatCurrency(displayRequiredDeposit)}`
                    : undefined
              }
              hint={
                buildingConfig && depositValidityDays > 0
                  ? `Deposit valid for ${depositValidityDays} day${depositValidityDays !== 1 ? 's' : ''} from reservation date${
                      displayRequiredDeposit > 0
                        ? ` (Min: ${formatCurrency(displayRequiredDeposit)})`
                        : ''
                    }`
                  : displayRequiredDeposit > 0
                    ? `Minimum: ${formatCurrency(displayRequiredDeposit)}`
                    : undefined
              }
            >
              <Input
                type="number"
                id="reservationDeposit"
                name="reservationDeposit"
                min={displayRequiredDeposit > 0 ? displayRequiredDeposit : 0}
                step="0.01"
                value={formData.reservationDeposit ?? ''}
                onChange={handleInputChange}
                placeholder="0"
                isInvalid={
                  (formData.reservationDeposit ?? 0) < 0 ||
                  (displayRequiredDeposit > 0 &&
                    (formData.reservationDeposit == null ||
                      (formData.reservationDeposit >= 0 &&
                        formData.reservationDeposit < displayRequiredDeposit)))
                }
              />
            </FormField>

            {buildingConfig && requiredAdvance > 0 && (
              <FormField
                label={`Advance Payment (${currencySymbol}) (Optional)`}
                htmlFor="advanceAmount"
                hint={`0 for none, or min ${formatCurrency(requiredAdvance)} if provided. Any advance rent payment made at the start of the lease.`}
              >
                <Input
                  type="number"
                  id="advanceAmount"
                  name="advanceAmount"
                  min={0}
                  step="0.01"
                  value={
                    formData.advanceAmount === 0 || Number.isNaN(formData.advanceAmount)
                      ? ''
                      : formData.advanceAmount
                  }
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </FormField>
            )}

            {buildingConfig && requiredUtility > 0 && (
              <FormField
                label={`Utility Deposit (${currencySymbol}) (Optional)`}
                htmlFor="utilityDepositAmount"
                hint={`0 for none, or min ${formatCurrency(requiredUtility)} if provided. Utility deposit amount for this building.`}
              >
                <Input
                  type="number"
                  id="utilityDepositAmount"
                  name="utilityDepositAmount"
                  min={0}
                  step="0.01"
                  value={
                    formData.utilityDepositAmount === 0 ||
                    Number.isNaN(formData.utilityDepositAmount)
                      ? ''
                      : formData.utilityDepositAmount
                  }
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </FormField>
            )}
          </div>
        );

      case 'notes':
        return (
          <FormField label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes about this reservation..."
            />
          </FormField>
        );

      default:
        return null;
    }
  };

  return (
    <SectionedFormShell
      mode="modal"
      isOpen={isOpen}
      onCancel={onClose}
      eyebrow="Create Reservation"
      entityLabel="New Reservation"
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      primaryLabel="Create Reservation"
      primaryLoading={isSubmitting}
      primaryDisabled={
        (formData.reservationDeposit ?? 0) < 0 ||
        (displayRequiredDeposit > 0 &&
          (formData.reservationDeposit ?? 0) < displayRequiredDeposit)
      }
      formId="create-reservation-form"
    >
      <form id="create-reservation-form" onSubmit={handleSubmit} className="space-y-6">
        {renderSectionContent()}
      </form>
    </SectionedFormShell>
  );
}

