'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/forms/FormField';

/** Assign API enforces this floor when no building deposit config exists */
const MINIMUM_DEPOSIT_AMOUNT = 3000;

interface Building {
  id: string;
  name: string;
}

interface Room {
  id: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  monthlyRate: number;
  roomStatus: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
}

interface TenantFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  moveInDate?: string;
  previousAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  employmentStatus?: 'employed' | 'unemployed' | 'student' | 'retired' | 'other';
  employerName?: string;
  monthlyIncome?: number;
  buildingId?: string;
  roomId?: string;
  monthlyRent?: number;
  depositMonths: number;
  advanceMonths: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  notes?: string;
}

export default function TenantForm() {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [overrideMonthlyRent, setOverrideMonthlyRent] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<TenantFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    moveInDate: '',
    previousAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    employmentStatus: 'employed',
    employerName: '',
    monthlyIncome: undefined,
    buildingId: '',
    roomId: '',
    monthlyRent: undefined,
    depositMonths: 1,
    advanceMonths: 1,
    leaseStartDate: '',
    leaseEndDate: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load buildings and rooms
  useEffect(() => {
    const loadData = async () => {
      try {
        const [buildingsRes, roomsRes] = await Promise.all([
          fetch('/api/buildings'),
          fetch('/api/rooms')
        ]);

        if (buildingsRes.ok) {
          const buildingsData = await buildingsRes.json();
          // API returns { success: true, data: { buildings: [...] } }
          const buildingsList = buildingsData.data?.buildings || buildingsData.buildings || buildingsData.data || [];
          if (Array.isArray(buildingsList)) {
            setBuildings(buildingsList);
          } else {
            console.error('Invalid buildings data format:', buildingsList);
            setBuildings([]);
          }
        }

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          // API returns { success: true, data: [...] }
          const roomsList = roomsData.data || roomsData.rooms || [];
          if (Array.isArray(roomsList)) {
            setRooms(roomsList);
            // Initially show only vacant rooms
            setFilteredRooms(roomsList.filter((r: Room) => r.roomStatus === 'vacant'));
          } else {
            console.error('Invalid rooms data format:', roomsList);
            setRooms([]);
            setFilteredRooms([]);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Filter rooms when building is selected
  useEffect(() => {
    if (formData.buildingId) {
      const filtered = rooms.filter(
        r => r.buildingId === formData.buildingId && r.roomStatus === 'vacant'
      );
      setFilteredRooms(filtered);
      
      // Reset room if it's not in the filtered list
      if (formData.roomId && !filtered.find(r => r.id === formData.roomId)) {
        setFormData(prev => ({ ...prev, roomId: '' }));
      }
    } else {
      setFilteredRooms(rooms.filter(r => r.roomStatus === 'vacant'));
    }
  }, [formData.buildingId, rooms, formData.roomId]);

  // Auto-fill monthly rent when room is selected (only if override is not checked)
  useEffect(() => {
    if (formData.roomId && !overrideMonthlyRent) {
      const selectedRoom = rooms.find(r => r.id === formData.roomId);
      if (selectedRoom && selectedRoom.monthlyRate != null) {
        setFormData(prev => ({
          ...prev,
          monthlyRent: Number(selectedRoom.monthlyRate),
        }));
      }
    } else if (!formData.roomId && !overrideMonthlyRent) {
      // Clear monthly rent when room is deselected and override is not checked
      setFormData(prev => ({ ...prev, monthlyRent: undefined }));
    }
  }, [formData.roomId, rooms, overrideMonthlyRent]);

  const computedDeposit = (formData.monthlyRent || 0) * formData.depositMonths;
  const computedAdvance = (formData.monthlyRent || 0) * formData.advanceMonths;
  // Assign API floors deposit at ₱3,000 — apply the same floor so low-rent rooms can still be assigned
  const effectiveDeposit =
    formData.roomId && computedDeposit < MINIMUM_DEPOSIT_AMOUNT
      ? MINIMUM_DEPOSIT_AMOUNT
      : computedDeposit;
  const depositRaisedToMinimum =
    Boolean(formData.roomId) && computedDeposit < MINIMUM_DEPOSIT_AMOUNT;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    if (formData.emergencyContactPhone && !/^\+?[\d\s\-\(\)]+$/.test(formData.emergencyContactPhone)) {
      newErrors.emergencyContactPhone = 'Emergency contact phone is invalid';
    }

    if (formData.monthlyIncome && formData.monthlyIncome < 0) {
      newErrors.monthlyIncome = 'Monthly income cannot be negative';
    }

    if (formData.monthlyRent != null && formData.monthlyRent < 0) {
      newErrors.monthlyRent = 'Monthly rent cannot be negative';
    }

    if (formData.depositMonths < 0) {
      newErrors.depositMonths = 'Deposit months cannot be negative';
    }

    if (formData.advanceMonths < 0) {
      newErrors.advanceMonths = 'Advance months cannot be negative';
    }

    // Room assignment requires positive rent + lease start (deposit floor applied at submit)
    if (formData.roomId) {
      if (!formData.monthlyRent || formData.monthlyRent <= 0) {
        newErrors.monthlyRent = 'Monthly rent is required when assigning a room';
      } else if (!formData.leaseStartDate) {
        newErrors.leaseStartDate = 'Lease start date is required when assigning a room';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Creating tenant...',
      message: formData.roomId 
        ? 'Creating tenant profile and assigning room...' 
        : 'Please wait while we create the tenant profile.'
    });

    try {
      // Create tenant
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
          moveInDate: formData.moveInDate ? new Date(formData.moveInDate) : null,
          leaseStartDate: formData.leaseStartDate ? new Date(formData.leaseStartDate) : null,
          leaseEndDate: formData.leaseEndDate ? new Date(formData.leaseEndDate) : null,
          monthlyIncome: formData.monthlyIncome || null,
          monthlyRent: formData.monthlyRent || null,
          depositMonths: formData.depositMonths,
          advanceMonths: formData.advanceMonths,
          // IDs are UUIDs — never parseInt
          buildingId: formData.buildingId || null,
          roomId: formData.roomId || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.details || result.error || 'Failed to create tenant');
      }

      const tenantId = result.data.id;
      const temporaryPassword = result.data.temporaryPassword as string | undefined;

      // If room is selected, assign tenant to room (this will trigger auto-invoicing)
      if (formData.roomId) {
        updateNotification(loadingNotificationId, {
          type: 'loading',
          title: 'Assigning room...',
          message: 'Generating invoices automatically...'
        });

        const monthlyRate = Number(formData.monthlyRent) || 0;
        const depositFromMonths = monthlyRate * formData.depositMonths;
        // Match assign API floor so rooms with tiny test rents can still be assigned
        const depositPaid = Math.max(depositFromMonths, MINIMUM_DEPOSIT_AMOUNT);
        const advanceAmount = monthlyRate * formData.advanceMonths;

        const assignResponse = await fetch(`/api/rooms/${formData.roomId}/assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantId: tenantId,
            startDate: formData.leaseStartDate || new Date().toISOString().slice(0, 10),
            endDate: formData.leaseEndDate || null,
            monthlyRate,
            depositPaid,
            advanceAmount,
          }),
        });

        const assignResult = await assignResponse.json();

        if (!assignResult.success) {
          // Tenant already exists — surface assignment failure clearly
          throw new Error(
            assignResult.details ||
              assignResult.error ||
              'Tenant was created but room assignment failed'
          );
        }

        // Create detailed success message
        const invoiceDetails = assignResult.invoiceDetails;
        let detailMessage = `${formData.firstName} ${formData.lastName} has been added successfully.`;
        
        if (invoiceDetails && invoiceDetails.totalInvoices > 0) {
          const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-PH', {
              style: 'currency',
              currency: 'PHP',
            }).format(amount);
          };
          
          detailMessage += `\n\n✅ Auto-Invoicing Complete:`;
          detailMessage += `\n📄 ${invoiceDetails.totalInvoices} invoices generated`;
          detailMessage += `\n💰 Total amount: ${formatCurrency(invoiceDetails.totalAmount)}`;
          detailMessage += `\n📊 Invoice range: ${invoiceDetails.firstInvoiceNumber} - ${invoiceDetails.lastInvoiceNumber}`;
        }

        if (temporaryPassword) {
          detailMessage += `\n\n🔑 Temporary login password (copy now — shown once):\n${temporaryPassword}`;
        }

        updateNotification(loadingNotificationId, {
          type: 'success',
          title: 'Tenant Created & Room Assigned!',
          message: detailMessage
        });
      } else {
        let message = `${formData.firstName} ${formData.lastName} has been added. You can assign a room later.`;
        if (temporaryPassword) {
          message += `\n\n🔑 Temporary login password (copy now — shown once):\n${temporaryPassword}`;
        }
        updateNotification(loadingNotificationId, {
          type: 'success',
          title: 'Tenant created successfully!',
          message,
        });
      }

      if (temporaryPassword) {
        // Also surface via alert so it's hard to miss before redirect
        window.alert(
          `Tenant account created.\n\nEmail: ${formData.email}\nTemporary password: ${temporaryPassword}\n\nCopy this password now — it will not be shown again.`
        );
      }

      setTimeout(() => {
        router.push(`/admin/tenants/${tenantId}`);
      }, temporaryPassword ? 2500 : 1500);

    } catch (error) {
      console.error('Error creating tenant:', error);
      const message = error instanceof Error ? error.message : 'An error occurred';
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: message.toLowerCase().includes('assign') || message.toLowerCase().includes('deposit')
          ? 'Room assignment failed'
          : 'Failed to create tenant',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const optionalNumberFields = ['monthlyIncome', 'monthlyRent'];
    const numValue = value === '' ? undefined : Number(value);
    const isOptionalNumber = type === 'number' && optionalNumberFields.includes(name);
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number'
        ? (isOptionalNumber ? (value === '' ? undefined : (Number.isNaN(numValue) ? prev[name as keyof TenantFormData] : numValue)) : (value === '' ? 0 : Number(value)))
        : value,
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Personal Information
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField label="First Name" htmlFor="firstName" required error={errors.firstName}>
            <Input
              type="text"
              name="firstName"
              id="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              isInvalid={Boolean(errors.firstName)}
              required
            />
          </FormField>

          <FormField label="Last Name" htmlFor="lastName" required error={errors.lastName}>
            <Input
              type="text"
              name="lastName"
              id="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              isInvalid={Boolean(errors.lastName)}
              required
            />
          </FormField>

          <FormField label="Email" htmlFor="email" required error={errors.email}>
            <Input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange}
              isInvalid={Boolean(errors.email)}
              required
            />
          </FormField>

          <FormField label="Phone" htmlFor="phone">
            <Input
              type="tel"
              name="phone"
              id="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </FormField>

          <FormField label="Date of Birth" htmlFor="dateOfBirth">
            <Input
              type="date"
              name="dateOfBirth"
              id="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              min="1900-01-01"
              max={new Date().toISOString().split('T')[0]}
              style={{ colorScheme: 'light' }}
            />
          </FormField>

          <FormField label="Previous Address" htmlFor="previousAddress">
            <Input
              type="text"
              name="previousAddress"
              id="previousAddress"
              value={formData.previousAddress}
              onChange={handleInputChange}
            />
          </FormField>

          <FormField label="Monthly Income (₱)" htmlFor="monthlyIncome" error={errors.monthlyIncome}>
            <Input
              type="number"
              name="monthlyIncome"
              id="monthlyIncome"
              min={0}
              step={0.01}
              value={formData.monthlyIncome ?? ''}
              onChange={handleInputChange}
              isInvalid={Boolean(errors.monthlyIncome)}
            />
          </FormField>
        </div>
      </div>

      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Emergency Contact
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <FormField label="Contact Name" htmlFor="emergencyContactName">
            <Input
              type="text"
              name="emergencyContactName"
              id="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleInputChange}
            />
          </FormField>

          <FormField label="Contact Phone" htmlFor="emergencyContactPhone" error={errors.emergencyContactPhone}>
            <Input
              type="tel"
              name="emergencyContactPhone"
              id="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleInputChange}
              isInvalid={Boolean(errors.emergencyContactPhone)}
            />
          </FormField>

          <FormField label="Relationship" htmlFor="emergencyContactRelationship">
            <Input
              type="text"
              name="emergencyContactRelationship"
              id="emergencyContactRelationship"
              value={formData.emergencyContactRelationship}
              onChange={handleInputChange}
              placeholder="e.g., Parent, Spouse, Friend"
            />
          </FormField>
        </div>
      </div>

      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Employment & Financial Information
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField label="Employment Status" htmlFor="employmentStatus">
            <Select
              name="employmentStatus"
              id="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleInputChange}
            >
              <option value="employed">Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="student">Student</option>
              <option value="retired">Retired</option>
              <option value="other">Other</option>
            </Select>
          </FormField>

          <FormField label="Employer Name" htmlFor="employerName">
            <Input
              type="text"
              name="employerName"
              id="employerName"
              value={formData.employerName}
              onChange={handleInputChange}
            />
          </FormField>
        </div>
      </div>

      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
          Property & Room Assignment
        </h3>
        <p className="text-sm text-gray-900 mb-4">
          Assign a property and room now to automatically generate invoices based on lease details.
        </p>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            label="Property (Optional)"
            htmlFor="buildingId"
            hint="Select a property to filter available rooms"
          >
            <Select
              name="buildingId"
              id="buildingId"
              value={formData.buildingId}
              onChange={handleInputChange}
              isDisabled={!Array.isArray(buildings) || buildings.length === 0}
            >
              <option value="">{Array.isArray(buildings) && buildings.length === 0 ? 'Loading properties...' : 'Select a property'}</option>
              {Array.isArray(buildings) && buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Room (Optional)"
            htmlFor="roomId"
            hint={
              formData.roomId
                ? 'Invoices will be auto-generated after tenant creation'
                : 'You can assign a room later from the tenant detail page'
            }
          >
            <Select
              name="roomId"
              id="roomId"
              value={formData.roomId}
              onChange={handleInputChange}
              isDisabled={!filteredRooms.length}
              className={!filteredRooms.length ? 'bg-gray-50 text-gray-400' : undefined}
            >
              <option value="">
                {formData.buildingId && !filteredRooms.length
                  ? 'No available rooms in this property'
                  : 'Select a room'}
              </option>
              {filteredRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.buildingName} - Room {room.roomNumber} (₱{room.monthlyRate.toLocaleString()}/month)
                </option>
              ))}
            </Select>
          </FormField>

          {formData.roomId && (
            <div className="sm:col-span-2 bg-purple-100 border border-purple-300 rounded-md p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-purple-900">
                    Auto-Invoicing Enabled
                  </h4>
                  <p className="mt-1 text-sm text-purple-700">
                    When you create this tenant, the system will automatically:
                  </p>
                  <ul className="mt-2 text-sm text-purple-700 list-disc list-inside space-y-1">
                    <li>Generate the initial invoice for advance payment</li>
                    <li>Create monthly invoices for the entire lease period</li>
                    <li>Set all invoices to "Pending" status</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Rent & Payment Details
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            label="Monthly Rent (₱)"
            htmlFor="monthlyRent"
            required
            error={errors.monthlyRent}
            hint={
              formData.roomId && !overrideMonthlyRent
                ? 'Monthly rent is automatically set from the selected room'
                : 'Enter amount in Philippine Pesos'
            }
          >
            <Checkbox
              id="overrideMonthlyRent"
              checked={overrideMonthlyRent}
              onChange={(e) => {
                setOverrideMonthlyRent(e.target.checked);
                if (!e.target.checked && formData.roomId) {
                  const selectedRoom = rooms.find(r => r.id === formData.roomId);
                  if (selectedRoom) {
                    setFormData(prev => ({ ...prev, monthlyRent: Number(selectedRoom.monthlyRate) }));
                  }
                }
              }}
              label="Override monthly rent"
              className="mb-2"
            />
            <Input
              type="number"
              name="monthlyRent"
              id="monthlyRent"
              min={0}
              step={1}
              value={formData.monthlyRent ?? ''}
              onChange={handleInputChange}
              required
              isDisabled={!overrideMonthlyRent && !formData.roomId}
              isInvalid={Boolean(errors.monthlyRent)}
              placeholder="e.g., 5000, 8000, 12000"
            />
          </FormField>

          <FormField
            label="Deposit Months"
            htmlFor="depositMonths"
            required
            error={errors.depositMonths}
            hint={`Deposit: ₱${computedDeposit.toLocaleString()}`}
          >
            <Select
              name="depositMonths"
              id="depositMonths"
              value={formData.depositMonths}
              onChange={handleInputChange}
            >
              <option value="0">0 month</option>
              <option value="1">1 month</option>
              <option value="2">2 months</option>
              <option value="3">3 months</option>
            </Select>
            {depositRaisedToMinimum && (
              <p className="text-xs text-amber-700 mt-1">
                Building minimum of ₱{MINIMUM_DEPOSIT_AMOUNT.toLocaleString()} will be charged on assign
              </p>
            )}
          </FormField>

          <FormField
            label="Advance Months"
            htmlFor="advanceMonths"
            required
            hint={`Advance: ₱${computedAdvance.toLocaleString()}`}
          >
            <Select
              name="advanceMonths"
              id="advanceMonths"
              value={formData.advanceMonths}
              onChange={handleInputChange}
            >
              <option value="0">0 month</option>
              <option value="1">1 month</option>
              <option value="2">2 months</option>
              <option value="3">3 months</option>
            </Select>
          </FormField>

          {/* Total Amount Display */}
          <div className="sm:col-span-2 bg-purple-50 p-4 rounded-md border border-purple-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Total Initial Payment:</span>
              <span className="text-lg font-bold text-purple-600">
                ₱{(effectiveDeposit + computedAdvance).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-900">
              (₱{(formData.monthlyRent || 0).toLocaleString()} × {formData.depositMonths} month{formData.depositMonths !== 1 ? 's' : ''} deposit
              {depositRaisedToMinimum
                ? ` → ₱${MINIMUM_DEPOSIT_AMOUNT.toLocaleString()} minimum`
                : ''}
              ) + (₱{(formData.monthlyRent || 0).toLocaleString()} × {formData.advanceMonths} month{formData.advanceMonths !== 1 ? 's' : ''} advance)
            </p>
            {depositRaisedToMinimum && (
              <p className="mt-2 text-xs text-amber-800">
                Room rent × deposit months is below the ₱{MINIMUM_DEPOSIT_AMOUNT.toLocaleString()} building minimum.
                Create Tenant will charge ₱{MINIMUM_DEPOSIT_AMOUNT.toLocaleString()} deposit so assignment can proceed.
                For real units, set a realistic monthly rent (e.g. ₱5,000+).
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Lease Information
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField label="Lease Start Date" htmlFor="leaseStartDate" error={errors.leaseStartDate}>
            <Input
              type="date"
              name="leaseStartDate"
              id="leaseStartDate"
              value={formData.leaseStartDate}
              onChange={handleInputChange}
              min="2000-01-01"
              max="2099-12-31"
              isInvalid={Boolean(errors.leaseStartDate)}
              style={{ colorScheme: 'light' }}
            />
          </FormField>

          <FormField label="Lease End Date" htmlFor="leaseEndDate">
            <Input
              type="date"
              name="leaseEndDate"
              id="leaseEndDate"
              value={formData.leaseEndDate}
              onChange={handleInputChange}
              min={formData.leaseStartDate || '2000-01-01'}
              max="2099-12-31"
              style={{ colorScheme: 'light' }}
            />
          </FormField>

          <FormField label="Move In Date" htmlFor="moveInDate">
            <Input
              type="date"
              name="moveInDate"
              id="moveInDate"
              value={formData.moveInDate}
              onChange={handleInputChange}
              min="2000-01-01"
              max="2099-12-31"
              style={{ colorScheme: 'light' }}
            />
          </FormField>
        </div>
      </div>

      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Additional Information
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
          <FormField label="Notes" htmlFor="notes">
            <Textarea
              name="notes"
              id="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Any additional notes about this tenant..."
            />
          </FormField>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          isDisabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={loading}>
          {loading ? 'Creating...' : 'Create Tenant'}
        </Button>
      </div>
    </form>
  );
} 