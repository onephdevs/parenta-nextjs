'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';

interface TenantFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  tenantStatus: 'active' | 'pending' | 'inactive' | 'terminated';
  moveInDate?: string;
  moveOutDate?: string;
  previousAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  employmentStatus?: 'employed' | 'unemployed' | 'student' | 'retired' | 'other';
  employerName?: string;
  monthlyIncome?: number;
  securityDeposit?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  notes?: string;
}

export default function TenantForm() {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<TenantFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    tenantStatus: 'pending',
    moveInDate: '',
    moveOutDate: '',
    previousAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    employmentStatus: 'employed',
    employerName: '',
    monthlyIncome: 0,
    securityDeposit: 0,
    leaseStartDate: '',
    leaseEndDate: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

    if (formData.securityDeposit && formData.securityDeposit < 0) {
      newErrors.securityDeposit = 'Security deposit cannot be negative';
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
      message: 'Please wait while we create the tenant profile.'
    });

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
          moveInDate: formData.moveInDate ? new Date(formData.moveInDate) : null,
          moveOutDate: formData.moveOutDate ? new Date(formData.moveOutDate) : null,
          leaseStartDate: formData.leaseStartDate ? new Date(formData.leaseStartDate) : null,
          leaseEndDate: formData.leaseEndDate ? new Date(formData.leaseEndDate) : null,
          monthlyIncome: formData.monthlyIncome || null,
          securityDeposit: formData.securityDeposit || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create tenant');
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Tenant created successfully!',
        message: `${formData.firstName} ${formData.lastName} has been added.`
      });

      setTimeout(() => {
        router.push(`/admin/tenants/${result.data.id}`);
      }, 1000);

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
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
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
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
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
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="tenantStatus" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="tenantStatus"
              id="tenantStatus"
              value={formData.tenantStatus}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <div>
            <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-700">
              Monthly Income ($)
            </label>
            <input
              type="number"
              name="monthlyIncome"
              id="monthlyIncome"
              min="0"
              step="0.01"
              value={formData.monthlyIncome}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-700">
              Security Deposit ($)
            </label>
            <input
              type="number"
              name="securityDeposit"
              id="securityDeposit"
              min="0"
              step="0.01"
              value={formData.securityDeposit}
              onChange={handleInputChange}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
                errors.securityDeposit ? 'border-red-300' : ''
              }`}
            />
            {errors.securityDeposit && (
              <p className="mt-1 text-sm text-red-600">{errors.securityDeposit}</p>
            )}
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="moveOutDate" className="block text-sm font-medium text-gray-700">
              Move Out Date
            </label>
            <input
              type="date"
              name="moveOutDate"
              id="moveOutDate"
              value={formData.moveOutDate}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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