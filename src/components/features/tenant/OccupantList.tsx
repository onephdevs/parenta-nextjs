'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, X, Save, Loader2 } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

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
    if (!confirm('Are you sure you want to remove this occupant?')) {
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
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Occupants ({occupants.length})
        </h3>
        {!showAddForm && !editingId && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Occupant
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship to Tenant
              </label>
              <select
                name="relationshipToTenant"
                value={formData.relationshipToTenant}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select relationship</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="relative">Relative</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Move-in Date *
              </label>
              <input
                type="date"
                name="moveInDate"
                required
                value={formData.moveInDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
              disabled={isAdding}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Add'} Occupant
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Occupants List */}
      {occupants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No occupants registered</p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Add your first occupant
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {occupants.map((occupant) => (
            <div
              key={occupant.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
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
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => startEdit(occupant)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(occupant.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
