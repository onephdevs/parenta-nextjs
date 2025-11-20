'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';

interface Building {
  id: number;
  name: string;
}

interface Room {
  id: number;
  roomNumber: string;
  buildingId: number;
  buildingName: string;
  rentAmount: number;
  status: string;
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
    monthlyIncome: 0,
    buildingId: '',
    roomId: '',
    monthlyRent: 0,
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
          setBuildings(buildingsData.buildings || buildingsData.data || []);
        }

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          const roomsList = roomsData.rooms || roomsData.data || [];
          setRooms(roomsList);
          // Initially show only available rooms
          setFilteredRooms(roomsList.filter((r: Room) => r.status === 'available'));
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
        r => r.buildingId === parseInt(formData.buildingId!) && r.status === 'available'
      );
      setFilteredRooms(filtered);
      
      // Reset room if it's not in the filtered list
      if (formData.roomId && !filtered.find(r => r.id === parseInt(formData.roomId!))) {
        setFormData(prev => ({ ...prev, roomId: '' }));
      }
    } else {
      setFilteredRooms(rooms.filter(r => r.status === 'available'));
    }
  }, [formData.buildingId, rooms, formData.roomId]);

  // Auto-fill monthly rent when room is selected
  useEffect(() => {
    if (formData.roomId) {
      const selectedRoom = rooms.find(r => r.id === parseInt(formData.roomId!));
      if (selectedRoom && selectedRoom.rentAmount) {
        setFormData(prev => ({ ...prev, monthlyRent: selectedRoom.rentAmount }));
      }
    }
  }, [formData.roomId, rooms]);

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

    if (formData.monthlyRent && formData.monthlyRent < 0) {
      newErrors.monthlyRent = 'Monthly rent cannot be negative';
    }

    if (formData.depositMonths < 0) {
      newErrors.depositMonths = 'Deposit months cannot be negative';
    }

    if (formData.advanceMonths < 0) {
      newErrors.advanceMonths = 'Advance months cannot be negative';
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
          buildingId: formData.buildingId ? parseInt(formData.buildingId) : null,
          roomId: formData.roomId ? parseInt(formData.roomId) : null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create tenant');
      }

      const tenantId = result.data.id;

      // If room is selected, assign tenant to room (this will trigger auto-invoicing)
      if (formData.roomId) {
        updateNotification(loadingNotificationId, {
          type: 'loading',
          title: 'Assigning room...',
          message: 'Generating invoices automatically...'
        });

        const assignResponse = await fetch(`/api/rooms/${formData.roomId}/assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantId: tenantId,
            startDate: formData.leaseStartDate || new Date().toISOString(),
            endDate: formData.leaseEndDate,
            monthlyRent: formData.monthlyRent,
            depositAmount: (formData.monthlyRent || 0) * formData.depositMonths,
            advanceMonths: formData.advanceMonths,
          }),
        });

        const assignResult = await assignResponse.json();

        if (!assignResult.success) {
          throw new Error(assignResult.error || 'Failed to assign room');
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

        updateNotification(loadingNotificationId, {
          type: 'success',
          title: 'Tenant Created & Room Assigned!',
          message: detailMessage
        });
      } else {
        updateNotification(loadingNotificationId, {
          type: 'success',
          title: 'Tenant created successfully!',
          message: `${formData.firstName} ${formData.lastName} has been added. You can assign a room later.`
        });
      }

      setTimeout(() => {
        router.push(`/admin/tenants/${tenantId}`);
      }, 1500);

    } catch (error) {
      console.error('Error creating tenant:', error);
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to create tenant',
        message: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Personal Information
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name *
            </label>
            <input
              type="text"
              name="firstName"
              id="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                errors.firstName ? 'border-red-300' : ''
              }`}
              required
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name *
            </label>
            <input
              type="text"
              name="lastName"
              id="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                errors.lastName ? 'border-red-300' : ''
              }`}
              required
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                errors.email ? 'border-red-300' : ''
              }`}
              required
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              id="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              id="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>

          <div>
            <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-700">
              Monthly Income (₱)
            </label>
            <input
              type="number"
              name="monthlyIncome"
              id="monthlyIncome"
              min="0"
              step="0.01"
              value={formData.monthlyIncome}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Emergency Contact
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700">
              Contact Name
            </label>
            <input
              type="text"
              name="emergencyContactName"
              id="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>

          <div>
            <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700">
              Contact Phone
            </label>
            <input
              type="tel"
              name="emergencyContactPhone"
              id="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                errors.emergencyContactPhone ? 'border-red-300' : ''
              }`}
            />
            {errors.emergencyContactPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.emergencyContactPhone}</p>
            )}
          </div>

          <div>
            <label htmlFor="emergencyContactRelationship" className="block text-sm font-medium text-gray-700">
              Relationship
            </label>
            <input
              type="text"
              name="emergencyContactRelationship"
              id="emergencyContactRelationship"
              value={formData.emergencyContactRelationship}
              onChange={handleInputChange}
              placeholder="e.g., Parent, Spouse, Friend"
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Employment & Financial Information
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="employmentStatus" className="block text-sm font-medium text-gray-700">
              Employment Status
            </label>
            <select
              name="employmentStatus"
              id="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            >
              <option value="employed">Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="student">Student</option>
              <option value="retired">Retired</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="employerName" className="block text-sm font-medium text-gray-700">
              Employer Name
            </label>
            <input
              type="text"
              name="employerName"
              id="employerName"
              value={formData.employerName}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>
        </div>
      </div>

      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
          Property & Room Assignment
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Assign a property and room now to automatically generate invoices based on lease details.
        </p>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="buildingId" className="block text-sm font-medium text-gray-700">
              Property (Optional)
            </label>
            <select
              name="buildingId"
              id="buildingId"
              value={formData.buildingId}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base bg-white"
            >
              <option value="">Select a property</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select a property to filter available rooms
            </p>
          </div>

          <div>
            <label htmlFor="roomId" className="block text-sm font-medium text-gray-700">
              Room (Optional)
            </label>
            <select
              name="roomId"
              id="roomId"
              value={formData.roomId}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base bg-white ${
                !filteredRooms.length ? 'bg-gray-50 text-gray-400' : ''
              }`}
              disabled={!filteredRooms.length}
            >
              <option value="">
                {formData.buildingId && !filteredRooms.length 
                  ? 'No available rooms in this property' 
                  : 'Select a room'}
              </option>
              {filteredRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.buildingName} - Room {room.roomNumber} (₱{room.rentAmount.toLocaleString()}/month)
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.roomId 
                ? 'Invoices will be auto-generated after tenant creation' 
                : 'You can assign a room later from the tenant detail page'}
            </p>
          </div>

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
          <div>
            <label htmlFor="monthlyRent" className="block text-sm font-medium text-gray-700">
              Monthly Rent (₱) *
            </label>
            <input
              type="number"
              name="monthlyRent"
              id="monthlyRent"
              min="0"
              step="1"
              value={formData.monthlyRent}
              onChange={handleInputChange}
              required
              placeholder="e.g., 5000, 8000, 12000"
              className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                errors.monthlyRent ? 'border-red-300' : ''
              }`}
            />
            {errors.monthlyRent && (
              <p className="mt-1 text-sm text-red-600">{errors.monthlyRent}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Enter amount in Philippine Pesos</p>
          </div>

          <div>
            <label htmlFor="depositMonths" className="block text-sm font-medium text-gray-700">
              Deposit Months *
            </label>
            <select
              name="depositMonths"
              id="depositMonths"
              value={formData.depositMonths}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            >
              <option value="0">0 month</option>
              <option value="1">1 month</option>
              <option value="2">2 months</option>
              <option value="3">3 months</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Deposit: ₱{((formData.monthlyRent || 0) * formData.depositMonths).toLocaleString()}
            </p>
          </div>

          <div>
            <label htmlFor="advanceMonths" className="block text-sm font-medium text-gray-700">
              Advance Months *
            </label>
            <select
              name="advanceMonths"
              id="advanceMonths"
              value={formData.advanceMonths}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            >
              <option value="0">0 month</option>
              <option value="1">1 month</option>
              <option value="2">2 months</option>
              <option value="3">3 months</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Advance: ₱{((formData.monthlyRent || 0) * formData.advanceMonths).toLocaleString()}
            </p>
          </div>

          {/* Total Amount Display */}
          <div className="sm:col-span-2 bg-purple-50 p-4 rounded-md border border-purple-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Initial Payment:</span>
              <span className="text-lg font-bold text-purple-600">
                ₱{((formData.monthlyRent || 0) * (formData.depositMonths + formData.advanceMonths)).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              ({formData.depositMonths} month{formData.depositMonths !== 1 ? 's' : ''} deposit + {formData.advanceMonths} month{formData.advanceMonths !== 1 ? 's' : ''} advance) × ₱{(formData.monthlyRent || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Lease Information
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="leaseStartDate" className="block text-sm font-medium text-gray-700">
              Lease Start Date
            </label>
            <input
              type="date"
              name="leaseStartDate"
              id="leaseStartDate"
              value={formData.leaseStartDate}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>

          <div>
            <label htmlFor="leaseEndDate" className="block text-sm font-medium text-gray-700">
              Lease End Date
            </label>
            <input
              type="date"
              name="leaseEndDate"
              id="leaseEndDate"
              value={formData.leaseEndDate}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>

          <div>
            <label htmlFor="moveInDate" className="block text-sm font-medium text-gray-700">
              Move In Date
            </label>
            <input
              type="date"
              name="moveInDate"
              id="moveInDate"
              value={formData.moveInDate}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Additional Information
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="previousAddress" className="block text-sm font-medium text-gray-700">
              Previous Address
            </label>
            <input
              type="text"
              name="previousAddress"
              id="previousAddress"
              value={formData.previousAddress}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              name="notes"
              id="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
              placeholder="Any additional notes about this tenant..."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Tenant'}
        </button>
      </div>
    </form>
  );
} 