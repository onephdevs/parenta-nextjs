'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TenantWithAssignments } from '@/lib/api/tenants';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import ProfilePictureUpload from './ProfilePictureUpload';
import DocumentUpload from './DocumentUpload';

interface EditTenantFormProps {
  tenant: TenantWithAssignments;
}

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

export function EditTenantForm({ tenant }: EditTenantFormProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const { currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form data with tenant values
  const [formData, setFormData] = useState<TenantFormData>({
    firstName: tenant.firstName,
    lastName: tenant.lastName,
    email: tenant.email,
    phone: tenant.phone || '',
    dateOfBirth: tenant.dateOfBirth ? new Date(tenant.dateOfBirth).toISOString().split('T')[0] : '',
    tenantStatus: tenant.tenantStatus,
    moveInDate: tenant.moveInDate ? new Date(tenant.moveInDate).toISOString().split('T')[0] : '',
    moveOutDate: tenant.moveOutDate ? new Date(tenant.moveOutDate).toISOString().split('T')[0] : '',
    previousAddress: tenant.previousAddress || '',
    emergencyContactName: tenant.emergencyContactName || '',
    emergencyContactPhone: tenant.emergencyContactPhone || '',
    emergencyContactRelationship: tenant.emergencyContactRelationship || '',
    employmentStatus: tenant.employmentStatus as 'employed' | 'unemployed' | 'student' | 'retired' | 'other' || 'employed',
    employerName: tenant.employerName || '',
    monthlyIncome: tenant.monthlyIncome || 0,
    securityDeposit: tenant.securityDeposit || 0,
    leaseStartDate: tenant.leaseStartDate ? new Date(tenant.leaseStartDate).toISOString().split('T')[0] : '',
    leaseEndDate: tenant.leaseEndDate ? new Date(tenant.leaseEndDate).toISOString().split('T')[0] : '',
    notes: tenant.notes || '',
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
      title: 'Updating tenant...',
      message: 'Please wait while we save your changes.'
    });

    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tenant');
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Tenant updated successfully!',
        message: `${formData.firstName} ${formData.lastName} has been updated.`
      });
      
      router.push(`/admin/tenants/${tenant.id}`);
    } catch (error) {
      console.error('Error updating tenant:', error);
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to update tenant',
        message: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${tenant.firstName} ${tenant.lastName}? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Deleting tenant...',
      message: 'Please wait while we delete the tenant.'
    });

    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete tenant');
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Tenant deleted successfully!',
        message: `${tenant.firstName} ${tenant.lastName} has been deleted.`
      });

      // Redirect to tenants list
      setTimeout(() => {
        router.push('/admin/tenants');
      }, 1000);
    } catch (error) {
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to delete tenant',
        message: error instanceof Error ? error.message : 'An error occurred'
      });
      setIsDeleting(false);
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

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-6 text-gray-900">
        {/* Current Room Assignment */}
        {tenant.currentAssignment && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-3">
              Current Room Assignment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Room:</span>{' '}
                  <span className="font-semibold">Room {tenant.currentAssignment.roomNumber}</span>
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Building:</span> {tenant.currentAssignment.buildingName}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Monthly Rate:</span> {formatCurrency(tenant.currentAssignment.monthlyRate)}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Since:</span> {formatDate(tenant.currentAssignment.startDate)}
                </p>
              </div>
              {(tenant.currentAssignment.depositPaid || tenant.currentAssignment.advancePaid || tenant.currentAssignment.utilityDepositPaid) && (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Deposits & Advance:</p>
                  {tenant.currentAssignment.depositPaid && (
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Deposit:</span> {formatCurrency(tenant.currentAssignment.depositPaid)}
                      {tenant.currentAssignment.depositValidUntil && (
                        <span className="text-xs text-gray-900 ml-2">
                          (Valid until: {formatDate(tenant.currentAssignment.depositValidUntil)})
                        </span>
                      )}
                    </p>
                  )}
                  {tenant.currentAssignment.advancePaid && (
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Advance:</span> {formatCurrency(tenant.currentAssignment.advancePaid)}
                    </p>
                  )}
                  {tenant.currentAssignment.utilityDepositPaid && (
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Utility Deposit:</span> {formatCurrency(tenant.currentAssignment.utilityDepositPaid)}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-green-200 flex items-center gap-4">
              {tenant.currentAssignment.roomId && (
                <>
                  <Link
                    href={`/admin/rooms/${tenant.currentAssignment.roomId}`}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    View Room Details →
                  </Link>
                  <span className="text-gray-400">|</span>
                  <Link
                    href={`/admin/rooms/${tenant.currentAssignment.roomId}#tenant-management`}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Change Room Assignment →
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* Personal Information */}
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Personal Information
          </h3>

          {/* Profile Picture Upload */}
          <div className="mb-6">
            <ProfilePictureUpload
              tenantId={tenant.id}
              currentPictureUrl={(tenant as any).profilePictureUrl}
              onUploadComplete={() => {
                // Refresh page to show new picture
                window.location.reload();
              }}
              onDeleteComplete={() => {
                // Refresh page to remove picture
                window.location.reload();
              }}
              size="md"
            />
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="phone" className="block text-sm font-medium text-gray-900">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                  errors.phone ? 'border-red-300' : ''
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="tenantStatus" className="block text-sm font-medium text-gray-900">
                Status
              </label>
              <select
                name="tenantStatus"
                id="tenantStatus"
                value={formData.tenantStatus}
                onChange={handleInputChange}
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="previousAddress" className="block text-sm font-medium text-gray-900">
              Previous Address
            </label>
            <textarea
              name="previousAddress"
              id="previousAddress"
              rows={4}
              value={formData.previousAddress}
              onChange={handleInputChange}
              className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Emergency Contact
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-900">
                Name
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
              <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-900">
                Phone
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
              <label htmlFor="emergencyContactRelationship" className="block text-sm font-medium text-gray-900">
                Relationship
              </label>
              <input
                type="text"
                name="emergencyContactRelationship"
                id="emergencyContactRelationship"
                value={formData.emergencyContactRelationship}
                onChange={handleInputChange}
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
                placeholder="e.g., Parent, Sibling, Friend"
              />
            </div>
          </div>
        </div>

        {/* Employment & Financial */}
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Employment & Financial Information
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="employmentStatus" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="employerName" className="block text-sm font-medium text-gray-900">
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

            <div>
              <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-900">
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
                className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                  errors.monthlyIncome ? 'border-red-300' : ''
                }`}
              />
              {errors.monthlyIncome && (
                <p className="mt-1 text-sm text-red-600">{errors.monthlyIncome}</p>
              )}
            </div>

            <div>
              <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-900">
                Security Deposit ({currencySymbol})
              </label>
              <input
                type="number"
                name="securityDeposit"
                id="securityDeposit"
                min="0"
                step="0.01"
                value={formData.securityDeposit}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                  errors.securityDeposit ? 'border-red-300' : ''
                }`}
              />
              {errors.securityDeposit && (
                <p className="mt-1 text-sm text-red-600">{errors.securityDeposit}</p>
              )}
            </div>
          </div>
        </div>

        {/* Lease Information */}
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Lease Information
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="leaseStartDate" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="leaseEndDate" className="block text-sm font-medium text-gray-900">
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
              <label htmlFor="moveInDate" className="block text-sm font-medium text-gray-900">
                Move-in Date
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

            <div>
              <label htmlFor="moveOutDate" className="block text-sm font-medium text-gray-900">
                Move-out Date
              </label>
              <input
                type="date"
                name="moveOutDate"
                id="moveOutDate"
                value={formData.moveOutDate}
                onChange={handleInputChange}
                className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
            Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={4}
            value={formData.notes}
            onChange={handleInputChange}
            className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
            placeholder="Additional notes about the tenant..."
          />
        </div>

        {/* Tenant Agreement Document */}
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Tenant Agreement
          </h3>
          <DocumentUpload
            tenantId={tenant.id}
            currentDocumentUrl={(tenant as any).agreementDocumentUrl}
            currentDocumentName={(tenant as any).agreementDocumentName}
            onUploadComplete={() => {
              window.location.reload();
            }}
            onDeleteComplete={() => {
              window.location.reload();
            }}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          {/* Delete Button - Left Side */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || loading}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Tenant
              </>
            )}
          </button>

          {/* Cancel & Save Buttons - Right Side */}
          <div className="flex space-x-3">
            <Link
              href={`/admin/tenants/${tenant.id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || isDeleting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Tenant'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 