'use client';

import React, { useState, useEffect } from 'react';
import { Save, User, Phone, Mail, Calendar, Briefcase, MapPin } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  employmentStatus?: string;
  employerName?: string;
  monthlyIncome?: number;
  previousAddress?: string;
}

interface ProfileFormProps {
  initialData?: ProfileData;
  onSave?: () => void;
  /** Show only a subset of fields for sectioned profile nav */
  section?: 'personal' | 'emergency' | 'all';
}

export default function ProfileForm({ initialData, onSave, section = 'all' }: ProfileFormProps) {
  const showPersonal = section === 'all' || section === 'personal';
  const showEmergency = section === 'all' || section === 'emergency';
  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    employmentStatus: '',
    employerName: '',
    monthlyIncome: undefined,
    previousAddress: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        dateOfBirth: initialData.dateOfBirth
          ? initialData.dateOfBirth.split('T')[0]
          : '',
        emergencyContactName: initialData.emergencyContactName || '',
        emergencyContactPhone: initialData.emergencyContactPhone || '',
        emergencyContactRelationship: initialData.emergencyContactRelationship || '',
        employmentStatus: initialData.employmentStatus || '',
        employerName: initialData.employerName || '',
        monthlyIncome: initialData.monthlyIncome,
        previousAddress: initialData.previousAddress || '',
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        dateOfBirth: formData.dateOfBirth?.trim() ? formData.dateOfBirth : null,
        phone: formData.phone?.trim() ? formData.phone : null,
        monthlyIncome:
          formData.monthlyIncome === undefined || Number.isNaN(formData.monthlyIncome)
            ? null
            : formData.monthlyIncome,
      };

      const response = await fetch('/api/tenant/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Profile updated',
          message: 'Your profile has been saved successfully.',
        });
        onSave?.();
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || data.details || 'Failed to update profile',
        });
      }
    } catch {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'monthlyIncome' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      {showPersonal && (
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="First Name" htmlFor="firstName" required>
            <Input
              type="text"
              id="firstName"
              name="firstName"
              required
              value={formData.firstName}
              onChange={handleChange}
            />
          </FormField>
          <FormField label="Last Name" htmlFor="lastName" required>
            <Input
              type="text"
              id="lastName"
              name="lastName"
              required
              value={formData.lastName}
              onChange={handleChange}
            />
          </FormField>
          <FormField label="Email" htmlFor="email" hint="Email cannot be changed">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="email"
                id="email"
                name="email"
                className="pl-10"
                value={formData.email}
                isDisabled
              />
            </div>
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="tel"
                id="phone"
                name="phone"
                className="pl-10"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </FormField>
          <FormField label="Date of Birth" htmlFor="dateOfBirth">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                className="pl-10"
                value={formData.dateOfBirth}
                onChange={handleChange}
                min="1900-01-01"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </FormField>
        </div>
      </Card>
      )}

      {showEmergency && (
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Contact Name" htmlFor="emergencyContactName">
            <Input
              type="text"
              id="emergencyContactName"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
            />
          </FormField>
          <FormField label="Contact Phone" htmlFor="emergencyContactPhone">
            <Input
              type="tel"
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleChange}
            />
          </FormField>
          <FormField
            label="Relationship"
            htmlFor="emergencyContactRelationship"
            className="md:col-span-2"
          >
            <Select
              id="emergencyContactRelationship"
              name="emergencyContactRelationship"
              value={formData.emergencyContactRelationship}
              onChange={handleChange}
            >
              <option value="">Select relationship</option>
              <option value="spouse">Spouse</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
              <option value="child">Child</option>
              <option value="relative">Relative</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </Select>
          </FormField>
        </div>
      </Card>
      )}

      {showPersonal && (
      <>
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Briefcase className="h-5 w-5 mr-2" />
          Employment Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Employment Status" htmlFor="employmentStatus">
            <Select
              id="employmentStatus"
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleChange}
            >
              <option value="">Select status</option>
              <option value="employed">Employed</option>
              <option value="self-employed">Self-Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="student">Student</option>
              <option value="retired">Retired</option>
            </Select>
          </FormField>
          <FormField label="Employer Name" htmlFor="employerName">
            <Input
              type="text"
              id="employerName"
              name="employerName"
              value={formData.employerName}
              onChange={handleChange}
            />
          </FormField>
          <FormField label="Monthly Income (₱)" htmlFor="monthlyIncome">
            <Input
              type="number"
              id="monthlyIncome"
              name="monthlyIncome"
              min={0}
              step={0.01}
              value={formData.monthlyIncome ?? ''}
              onChange={handleChange}
            />
          </FormField>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Previous Address
        </h3>
        <FormField label="Address" htmlFor="previousAddress">
          <Textarea
            id="previousAddress"
            name="previousAddress"
            rows={3}
            value={formData.previousAddress}
            onChange={handleChange}
          />
        </FormField>
      </Card>
      </>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="success"
          isLoading={isSaving}
          leftIcon={<Save className="h-5 w-5" />}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}
