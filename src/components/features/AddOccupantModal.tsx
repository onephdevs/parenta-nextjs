'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface AddOccupantModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  tenantId?: string; // Optional: link to primary tenant
  onSuccess: () => void;
}

export default function AddOccupantModal({
  isOpen,
  onClose,
  roomId,
  tenantId,
  onSuccess
}: AddOccupantModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();
  const [formData, setFormData] = useState({
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
    notes: ''
  });

  const relationshipOptions = [
    { value: '', label: 'Select relationship...' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'child', label: 'Child' },
    { value: 'parent', label: 'Parent' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'relative', label: 'Relative' },
    { value: 'friend', label: 'Friend' },
    { value: 'other', label: 'Other' }
  ];

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
          notes: formData.notes || null
        })
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Occupant added successfully!');
        // Reset form
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
          notes: ''
        });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add Occupant</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Add a non-tenant occupant (e.g., relative, spouse, child) to this room.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            {tenantId && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Relationship to Tenant</label>
                <select
                  value={formData.relationshipToTenant}
                  onChange={(e) => setFormData({ ...formData, relationshipToTenant: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                >
                  {relationshipOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Move-in Date *</label>
                <input
                  type="date"
                  value={formData.moveInDate}
                  onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Emergency Contact (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Relationship</label>
                <input
                  type="text"
                  value={formData.emergencyContactRelationship}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                  placeholder="e.g., Parent, Sibling"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                placeholder="Additional notes about this occupant..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Occupant'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

