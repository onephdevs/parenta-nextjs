'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';

interface AddOccupantModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  tenantId?: string;
  onSuccess: () => void;
}

const relationshipOptions = [
  { value: '', label: 'Select relationship...' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'relative', label: 'Relative' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' },
];

const emptyFormData = () => ({
  firstName: '',
  lastName: '',
  relationshipToTenant: '',
  dateOfBirth: '',
  phone: '',
  email: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  moveInDate: new Date().toISOString().split('T')[0],
  notes: '',
});

export default function AddOccupantModal({
  isOpen,
  onClose,
  roomId,
  tenantId,
  onSuccess,
}: AddOccupantModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();
  const [formData, setFormData] = useState(emptyFormData());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/occupants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          tenantId: tenantId || null,
          firstName: formData.firstName,
          lastName: formData.lastName,
          relationshipToTenant: formData.relationshipToTenant || null,
          dateOfBirth: formData.dateOfBirth || null,
          phone: formData.phone || null,
          email: formData.email || null,
          emergencyContactName: formData.emergencyContactName || null,
          emergencyContactPhone: formData.emergencyContactPhone || null,
          emergencyContactRelationship: formData.emergencyContactRelationship || null,
          moveInDate: formData.moveInDate,
          notes: formData.notes || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Occupant added successfully!');
        setFormData(emptyFormData());
        onClose();
        onSuccess();
      } else {
        showError(result.error || 'Failed to add occupant');
      }
    } catch (error) {
      console.error('Error adding occupant:', error);
      showError('Failed to add occupant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Occupant"
      description="Add a non-tenant occupant (e.g., relative, spouse, child) to this room."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="add-occupant-form" isLoading={loading}>
            Add Occupant
          </Button>
        </>
      }
    >
      <form id="add-occupant-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="First Name" htmlFor="firstName" required>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Last Name" htmlFor="lastName" required>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </FormField>
        </div>

        {tenantId && (
          <FormField label="Relationship to Tenant" htmlFor="relationshipToTenant">
            <Select
              id="relationshipToTenant"
              value={formData.relationshipToTenant}
              onChange={(e) =>
                setFormData({ ...formData, relationshipToTenant: e.target.value })
              }
            >
              {relationshipOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Date of Birth" htmlFor="dateOfBirth">
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              min="1900-01-01"
              max={new Date().toISOString().split('T')[0]}
              style={{ colorScheme: 'light' }}
            />
          </FormField>

          <FormField label="Move-in Date" htmlFor="moveInDate" required>
            <Input
              id="moveInDate"
              type="date"
              value={formData.moveInDate}
              onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
              min="2000-01-01"
              max="2099-12-31"
              required
              style={{ colorScheme: 'light' }}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Phone" htmlFor="phone">
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </FormField>

          <FormField label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </FormField>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Emergency Contact (Optional)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Contact Name" htmlFor="emergencyContactName">
              <Input
                id="emergencyContactName"
                type="text"
                value={formData.emergencyContactName}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContactName: e.target.value })
                }
              />
            </FormField>

            <FormField label="Contact Phone" htmlFor="emergencyContactPhone">
              <Input
                id="emergencyContactPhone"
                type="tel"
                value={formData.emergencyContactPhone}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContactPhone: e.target.value })
                }
              />
            </FormField>
          </div>

          <FormField
            label="Relationship"
            htmlFor="emergencyContactRelationship"
            className="mt-4"
          >
            <Input
              id="emergencyContactRelationship"
              type="text"
              value={formData.emergencyContactRelationship}
              onChange={(e) =>
                setFormData({ ...formData, emergencyContactRelationship: e.target.value })
              }
              placeholder="e.g., Parent, Sibling"
            />
          </FormField>
        </div>

        <FormField label="Notes" htmlFor="notes">
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Additional notes about this occupant..."
          />
        </FormField>
      </form>
    </Dialog>
  );
}
