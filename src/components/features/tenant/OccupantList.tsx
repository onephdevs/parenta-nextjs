'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Save } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { FormField } from '@/components/forms/FormField';

interface Occupant {
  id: string;
  firstName: string;
  lastName: string;
  relationshipToTenant?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  moveInDate: string;
  moveOutDate?: string;
  notes?: string;
  isActive: boolean;
}

interface OccupantListProps {
  roomId?: string;
  onOccupantChange?: () => void;
}

export default function OccupantList({ roomId, onOccupantChange }: OccupantListProps) {
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { showNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();

  const [formData, setFormData] = useState<Partial<Occupant>>({
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

  useEffect(() => {
    fetchOccupants();
  }, []);

  const fetchOccupants = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenant/occupants');
      const data = await response.json();

      if (data.success) {
        setOccupants(data.data);
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to load occupants',
        });
      }
    } catch (error) {
      console.error('Error fetching occupants:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load occupants',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.firstName || !formData.lastName || !formData.moveInDate) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'First name, last name, and move-in date are required',
      });
      return;
    }

    setIsAdding(true);

    try {
      const response = await fetch('/api/tenant/occupants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Occupant added successfully',
        });
        setShowAddForm(false);
        resetForm();
        fetchOccupants();
        if (onOccupantChange) {
          onOccupantChange();
        }
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to add occupant',
        });
      }
    } catch (error) {
      console.error('Error adding occupant:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to add occupant',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setIsAdding(true);

    try {
      const response = await fetch(`/api/tenant/occupants/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Occupant updated successfully',
        });
        setEditingId(null);
        resetForm();
        fetchOccupants();
        if (onOccupantChange) {
          onOccupantChange();
        }
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update occupant',
        });
      }
    } catch (error) {
      console.error('Error updating occupant:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update occupant',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !(await confirm({
        title: 'Remove occupant?',
        message: 'Are you sure you want to remove this occupant?',
        confirmText: 'Remove',
        variant: 'danger',
      }))
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/tenant/occupants/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Occupant removed successfully',
        });
        fetchOccupants();
        if (onOccupantChange) {
          onOccupantChange();
        }
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to remove occupant',
        });
      }
    } catch (error) {
      console.error('Error deleting occupant:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove occupant',
      });
    }
  };

  const startEdit = (occupant: Occupant) => {
    setEditingId(occupant.id);
    setFormData({
      firstName: occupant.firstName,
      lastName: occupant.lastName,
      relationshipToTenant: occupant.relationshipToTenant || '',
      dateOfBirth: occupant.dateOfBirth ? occupant.dateOfBirth.split('T')[0] : '',
      phone: occupant.phone || '',
      email: occupant.email || '',
      emergencyContactName: occupant.emergencyContactName || '',
      emergencyContactPhone: occupant.emergencyContactPhone || '',
      emergencyContactRelationship: occupant.emergencyContactRelationship || '',
      moveInDate: occupant.moveInDate ? occupant.moveInDate.split('T')[0] : '',
      notes: occupant.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
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
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      {dialog}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Occupants ({occupants.length})
        </h3>
        {!showAddForm && !editingId && (
          <Button
            variant="success"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAddForm(true)}
          >
            Add Occupant
          </Button>
        )}
      </div>

      {(showAddForm || editingId) && (
        <Card padding="sm" className="mb-6 bg-gray-50 border border-gray-200 shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="First Name" htmlFor="firstName" required>
              <Input
                id="firstName"
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Last Name" htmlFor="lastName" required>
              <Input
                id="lastName"
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Relationship to Tenant" htmlFor="relationshipToTenant">
              <Select
                id="relationshipToTenant"
                name="relationshipToTenant"
                value={formData.relationshipToTenant}
                onChange={handleChange}
              >
                <option value="">Select relationship</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="relative">Relative</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </Select>
            </FormField>

            <FormField label="Date of Birth" htmlFor="dateOfBirth">
              <Input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                min="1900-01-01"
                max={new Date().toISOString().split('T')[0]}
                style={{ colorScheme: 'light' }}
              />
            </FormField>

            <FormField label="Phone" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Emergency Contact Name" htmlFor="emergencyContactName">
              <Input
                id="emergencyContactName"
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Emergency Contact Phone" htmlFor="emergencyContactPhone">
              <Input
                id="emergencyContactPhone"
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Move-in Date" htmlFor="moveInDate" required>
              <Input
                id="moveInDate"
                type="date"
                name="moveInDate"
                required
                value={formData.moveInDate}
                onChange={handleChange}
                min="2000-01-01"
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>

            <FormField label="Notes" htmlFor="notes" className="md:col-span-2">
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                value={formData.notes}
                onChange={handleChange}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button
              variant="success"
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
              isLoading={isAdding}
            >
              {editingId ? 'Update' : 'Add'} Occupant
            </Button>
          </div>
        </Card>
      )}

      {occupants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No occupants registered</p>
          {!showAddForm && (
            <Button
              variant="ghost"
              className="mt-4 text-green-600 hover:text-green-800"
              onClick={() => setShowAddForm(true)}
            >
              Add your first occupant
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {occupants.map((occupant) => (
            <Card
              key={occupant.id}
              padding="sm"
              className="border border-gray-200 shadow-none hover:shadow-md transition"
            >
              {editingId === occupant.id ? (
                <div className="text-sm text-gray-500">Editing...</div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {occupant.firstName} {occupant.lastName}
                    </h4>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                      {occupant.relationshipToTenant && (
                        <div>
                          <span className="font-medium">Relationship:</span>{' '}
                          {occupant.relationshipToTenant}
                        </div>
                      )}
                      {occupant.phone && (
                        <div>
                          <span className="font-medium">Phone:</span> {occupant.phone}
                        </div>
                      )}
                      {occupant.email && (
                        <div>
                          <span className="font-medium">Email:</span> {occupant.email}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Move-in:</span>{' '}
                        {new Date(occupant.moveInDate).toLocaleDateString()}
                      </div>
                      {occupant.emergencyContactName && (
                        <div className="col-span-2">
                          <span className="font-medium">Emergency Contact:</span>{' '}
                          {occupant.emergencyContactName} ({occupant.emergencyContactPhone})
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <IconButton
                      label="Edit occupant"
                      variant="primary"
                      size="sm"
                      onClick={() => startEdit(occupant)}
                    >
                      <Edit className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label="Remove occupant"
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(occupant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
