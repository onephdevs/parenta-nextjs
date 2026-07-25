'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TenantWithAssignments } from '@/lib/api/tenants';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
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
    monthlyIncome: tenant.monthlyIncome ?? undefined,
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
      newErrors.securityDeposit = 'Deposit cannot be negative';
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
    const optionalNumberFields = ['monthlyIncome'];
    const isOptionalNumber = type === 'number' && optionalNumberFields.includes(name);
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number'
        ? (isOptionalNumber ? (value === '' ? undefined : (Number.isNaN(Number(value)) ? prev[name as keyof TenantFormData] : Number(value))) : (value === '' ? 0 : Number(value)))
        : value,
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
    <Card padding="none">
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

            <FormField label="Phone" htmlFor="phone" error={errors.phone}>
              <Input
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleInputChange}
                isInvalid={Boolean(errors.phone)}
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

            <FormField label="Status" htmlFor="tenantStatus">
              <Select
                name="tenantStatus"
                id="tenantStatus"
                value={formData.tenantStatus}
                onChange={handleInputChange}
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Previous Address" htmlFor="previousAddress" className="mt-6">
            <Textarea
              name="previousAddress"
              id="previousAddress"
              rows={4}
              value={formData.previousAddress}
              onChange={handleInputChange}
            />
          </FormField>
        </div>

        {/* Emergency Contact */}
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Emergency Contact
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <FormField label="Name" htmlFor="emergencyContactName">
              <Input
                type="text"
                name="emergencyContactName"
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label="Phone" htmlFor="emergencyContactPhone" error={errors.emergencyContactPhone}>
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
                placeholder="e.g., Parent, Sibling, Friend"
              />
            </FormField>
          </div>
        </div>

        {/* Employment & Financial */}
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

            <FormField label={`Deposit (${currencySymbol})`} htmlFor="securityDeposit" error={errors.securityDeposit}>
              <Input
                type="number"
                name="securityDeposit"
                id="securityDeposit"
                min={0}
                step={0.01}
                value={formData.securityDeposit}
                onChange={handleInputChange}
                isInvalid={Boolean(errors.securityDeposit)}
              />
            </FormField>
          </div>
        </div>

        {/* Lease Information */}
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Lease Information
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField label="Lease Start Date" htmlFor="leaseStartDate">
              <Input
                type="date"
                name="leaseStartDate"
                id="leaseStartDate"
                value={formData.leaseStartDate}
                onChange={handleInputChange}
                min="2000-01-01"
                max="2099-12-31"
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

            <FormField label="Move-in Date" htmlFor="moveInDate">
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

            <FormField label="Move-out Date" htmlFor="moveOutDate">
              <Input
                type="date"
                name="moveOutDate"
                id="moveOutDate"
                value={formData.moveOutDate}
                onChange={handleInputChange}
                min={formData.moveInDate || '2000-01-01'}
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>
          </div>
        </div>

        {/* Notes */}
        <FormField label="Notes" htmlFor="notes">
          <Textarea
            name="notes"
            id="notes"
            rows={4}
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Additional notes about the tenant..."
          />
        </FormField>

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
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            isLoading={isDeleting}
            isDisabled={loading}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Delete Tenant
          </Button>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
              isDisabled={loading || isDeleting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} isDisabled={isDeleting}>
              {loading ? 'Updating...' : 'Update Tenant'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
} 