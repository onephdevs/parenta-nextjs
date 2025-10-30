'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  tenant_status: string;
  monthly_income?: number;
  employment_status?: string;
}

interface CurrentTenant {
  id: string;
  tenant_id: string;
  room_id: string;
  start_date: string;
  monthly_rate: number;
  deposit_paid?: number;
  notes?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  tenant_status: string;
}

interface AssignmentHistory {
  id: string;
  tenant_id: string;
  start_date: string;
  end_date?: string;
  monthly_rate: number;
  assignment_status: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface TenantAssignmentManagerProps {
  roomId: string;
  currentTenant: CurrentTenant | null;
  assignmentHistory: AssignmentHistory[];
  roomMonthlyRate: number;
  onAssignmentChange: () => void;
}

export default function TenantAssignmentManager({
  roomId,
  currentTenant,
  assignmentHistory,
  roomMonthlyRate,
  onAssignmentChange
}: TenantAssignmentManagerProps) {
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showUnassignForm, setShowUnassignForm] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();
  const [assignFormData, setAssignFormData] = useState({
    tenantId: '',
    startDate: new Date().toISOString().split('T')[0],
    monthlyRate: roomMonthlyRate.toString(),
    depositPaid: '',
    notes: ''
  });
  const [unassignFormData, setUnassignFormData] = useState({
    endDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Fetch available tenants for assignment
  const fetchAvailableTenants = async () => {
    try {
      const response = await fetch('/api/tenants?status=available');
      const result = await response.json();
      
      if (result.success) {
        setAvailableTenants(result.data);
      }
    } catch (error) {
      console.error('Error fetching available tenants:', error);
      showError('Failed to load available tenants');
    }
  };

  useEffect(() => {
    if (showAssignForm) {
      fetchAvailableTenants();
    }
  }, [showAssignForm]);

  // Handle tenant assignment
  const handleAssignTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/rooms/${roomId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: assignFormData.tenantId,
          startDate: assignFormData.startDate,
          monthlyRate: parseFloat(assignFormData.monthlyRate),
          depositPaid: assignFormData.depositPaid ? parseFloat(assignFormData.depositPaid) : undefined,
          notes: assignFormData.notes
        })
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Tenant assigned successfully!');
        setShowAssignForm(false);
        setAssignFormData({
          tenantId: '',
          startDate: new Date().toISOString().split('T')[0],
          monthlyRate: roomMonthlyRate.toString(),
          depositPaid: '',
          notes: ''
        });
        onAssignmentChange();
      } else {
        showError(result.error || 'Failed to assign tenant');
      }
    } catch (error) {
      console.error('Error assigning tenant:', error);
      showError('Failed to assign tenant');
    } finally {
      setLoading(false);
    }
  };

  // Handle tenant unassignment
  const handleUnassignTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/rooms/${roomId}/assign`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant?.tenant_id,
          endDate: unassignFormData.endDate,
          notes: unassignFormData.notes
        })
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Tenant unassigned successfully!');
        setShowUnassignForm(false);
        setUnassignFormData({
          endDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        onAssignmentChange();
      } else {
        showError(result.error || 'Failed to unassign tenant');
      }
    } catch (error) {
      console.error('Error unassigning tenant:', error);
      showError('Failed to unassign tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Tenant Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Current Tenant</h3>
          {currentTenant ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAssignForm(true)}
                className="inline-flex items-center px-3 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add Occupant
              </button>
              <button
                onClick={() => setShowUnassignForm(true)}
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                End Assignment
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAssignForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Assign Tenant
            </button>
          )}
        </div>

        {currentTenant ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h4 className="text-lg font-medium text-gray-900">
                  {currentTenant.first_name} {currentTenant.last_name}
                </h4>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Email:</span> {currentTenant.email}
                  </div>
                  {currentTenant.phone && (
                    <div>
                      <span className="font-medium">Phone:</span> {currentTenant.phone}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Move-in Date:</span> {new Date(currentTenant.start_date).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Monthly Rate:</span> ₱{parseFloat(currentTenant.monthly_rate.toString()).toLocaleString()}
                  </div>
                  {currentTenant.deposit_paid && (
                    <div>
                      <span className="font-medium">Deposit Paid:</span> ₱{parseFloat(currentTenant.deposit_paid.toString()).toLocaleString()}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Status:</span> 
                    <span className="ml-1 capitalize">{currentTenant.tenant_status}</span>
                  </div>
                </div>
                {currentTenant.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <span className="font-medium text-gray-700">Notes:</span>
                    <p className="mt-1 text-sm text-gray-600">{currentTenant.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="mt-2">No tenant currently assigned to this room</p>
          </div>
        )}
      </div>

      {/* Assignment History */}
      {assignmentHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment History</h3>
          <div className="space-y-4">
            {assignmentHistory.map((assignment) => (
              <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {assignment.first_name} {assignment.last_name}
                    </h4>
                    <p className="text-sm text-gray-600">{assignment.email}</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>
                      {new Date(assignment.start_date).toLocaleDateString()} - 
                      {assignment.end_date ? new Date(assignment.end_date).toLocaleDateString() : 'Current'}
                    </div>
                    <div className="font-medium">₱{parseFloat(assignment.monthly_rate.toString()).toLocaleString()}/month</div>
                    <div className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      assignment.assignment_status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {assignment.assignment_status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Tenant Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Tenant to Room</h3>
              <form onSubmit={handleAssignTenant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Tenant</label>
                  <select
                    value={assignFormData.tenantId}
                    onChange={(e) => setAssignFormData({ ...assignFormData, tenantId: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  >
                    <option value="">Choose a tenant...</option>
                    {availableTenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.first_name} {tenant.last_name} ({tenant.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={assignFormData.startDate}
                    onChange={(e) => setAssignFormData({ ...assignFormData, startDate: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Rate (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={assignFormData.monthlyRate}
                    onChange={(e) => setAssignFormData({ ...assignFormData, monthlyRate: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Deposit Paid ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={assignFormData.depositPaid}
                    onChange={(e) => setAssignFormData({ ...assignFormData, depositPaid: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={assignFormData.notes}
                    onChange={(e) => setAssignFormData({ ...assignFormData, notes: e.target.value })}
                    rows={4}
                    className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Optional notes about the assignment..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {loading ? 'Assigning...' : 'Assign Tenant'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssignForm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Tenant Modal */}
      {showUnassignForm && currentTenant && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">End Tenant Assignment</h3>
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  This will end the assignment for <strong>{currentTenant.first_name} {currentTenant.last_name}</strong> and mark the room as vacant.
                </p>
              </div>
              <form onSubmit={handleUnassignTenant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={unassignFormData.endDate}
                    onChange={(e) => setUnassignFormData({ ...unassignFormData, endDate: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={unassignFormData.notes}
                    onChange={(e) => setUnassignFormData({ ...unassignFormData, notes: e.target.value })}
                    rows={4}
                    className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Reason for ending assignment..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'End Assignment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUnassignForm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 