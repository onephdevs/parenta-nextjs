'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import AddOccupantModal from './AddOccupantModal';

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

interface Occupant {
  id: string;
  first_name: string;
  last_name: string;
  relationship_to_tenant?: string;
  phone?: string;
  email?: string;
  move_in_date: string;
  move_out_date?: string;
  is_active: boolean;
}

interface TenantAssignmentManagerProps {
  roomId: string;
  currentTenant: CurrentTenant | null;
  assignmentHistory: AssignmentHistory[];
  roomMonthlyRate: number;
  room?: {
    depositRequired?: boolean;
    depositType?: 'fixed' | 'percentage' | 'one_month';
    depositFixedAmount?: number;
    depositPercentage?: number;
  };
  onAssignmentChange: () => void;
}

export default function TenantAssignmentManager({
  roomId,
  currentTenant,
  assignmentHistory,
  roomMonthlyRate,
  room,
  onAssignmentChange
}: TenantAssignmentManagerProps) {
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showUnassignForm, setShowUnassignForm] = useState(false);
  const [showAddOccupantModal, setShowAddOccupantModal] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();
  const [assignFormData, setAssignFormData] = useState({
    tenantId: '',
    startDate: new Date().toISOString().split('T')[0],
    monthlyRate: roomMonthlyRate.toString(),
    depositPaid: '',
    advanceAmount: '',
    utilityDepositAmount: '',
    notes: ''
  });
  const [buildingConfig, setBuildingConfig] = useState<any>(null);
  const [requiredDeposit, setRequiredDeposit] = useState(0);
  const [requiredAdvance, setRequiredAdvance] = useState(0);
  const [requiredUtility, setRequiredUtility] = useState(0);
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

  // Fetch occupants for this room
  const fetchOccupants = async () => {
    try {
      const response = await fetch(`/api/occupants?roomId=${roomId}&activeOnly=true`);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setOccupants(result.data);
      } else {
        // Ensure occupants is always an array, even on error
        setOccupants([]);
      }
    } catch (error) {
      console.error('Error fetching occupants:', error);
      // Ensure occupants is always an array, even on error
      setOccupants([]);
    }
  };

  useEffect(() => {
    if (showAssignForm) {
      fetchAvailableTenants();
    }
    fetchOccupants();
  }, [showAssignForm, roomId]);

  // Fetch building deposit config when roomId is available
  useEffect(() => {
    if (roomId) {
      fetchRoomBuildingId();
    } else {
      setBuildingConfig(null);
      setRequiredDeposit(0);
      setRequiredAdvance(0);
      setRequiredUtility(0);
    }
  }, [roomId]);

  // Recalculate when monthly rate changes
  useEffect(() => {
    if (buildingConfig && assignFormData.monthlyRate) {
      const monthlyRate = parseFloat(assignFormData.monthlyRate) || roomMonthlyRate;
      if (monthlyRate > 0 && buildingConfig.buildingId) {
        calculateRequiredAmounts(buildingConfig.buildingId, monthlyRate);
      }
    }
  }, [assignFormData.monthlyRate, buildingConfig]);

  // Fetch room's building ID
  const fetchRoomBuildingId = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      const result = await response.json();
      
      if (result.success && result.data?.buildingId) {
        fetchBuildingDepositConfig(result.data.buildingId);
      } else {
        setBuildingConfig(null);
        setRequiredDeposit(0);
        setRequiredAdvance(0);
        setRequiredUtility(0);
      }
    } catch (error) {
      console.error('Error fetching room building ID:', error);
      setBuildingConfig(null);
    }
  };

  // Fetch building deposit config
  const fetchBuildingDepositConfig = async (buildingId: string) => {
    try {
      const response = await fetch(`/api/building-deposit-config?buildingId=${buildingId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setBuildingConfig({ ...result.data, buildingId });
        const monthlyRate = parseFloat(assignFormData.monthlyRate) || roomMonthlyRate;
        if (monthlyRate > 0) {
          calculateRequiredAmounts(buildingId, monthlyRate);
        }
      } else {
        setBuildingConfig(null);
        // Fall back to room-level calculation
        if (room) {
          const deposit = calculateRequiredDeposit();
          setRequiredDeposit(deposit);
          setRequiredAdvance(0);
          setRequiredUtility(0);
        }
      }
    } catch (error) {
      console.error('Error fetching building deposit config:', error);
      setBuildingConfig(null);
    }
  };
  
  // Calculate required amounts based on building config
  const calculateRequiredAmounts = async (buildingId: string, monthlyRate: number) => {
    try {
      const response = await fetch(
        `/api/building-deposit-config/${buildingId}?action=calculate&monthlyRate=${monthlyRate}`
      );
      const result = await response.json();
      
      if (result.success && result.data) {
        setRequiredDeposit(result.data.requiredDeposit || 0);
        setRequiredAdvance(result.data.requiredAdvance || 0);
        setRequiredUtility(result.data.utilityDeposit || 0);
      }
    } catch (error) {
      console.error('Error calculating required amounts:', error);
    }
  };

  // Calculate required deposit based on room configuration (fallback)
  const calculateRequiredDeposit = (): number => {
    if (buildingConfig) {
      return requiredDeposit; // Use building config value
    }
    if (!room?.depositRequired) return 0;

    const monthlyRate = parseFloat(assignFormData.monthlyRate) || roomMonthlyRate;

    switch (room.depositType) {
      case 'one_month':
        return monthlyRate;
      case 'percentage':
        return room.depositPercentage
          ? (monthlyRate * room.depositPercentage) / 100
          : 0;
      case 'fixed':
        return room.depositFixedAmount || 0;
      default:
        return 0;
    }
  };

  // Handle tenant assignment
  const handleAssignTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate deposit if required
    const currentRequiredDeposit = calculateRequiredDeposit();
    if (currentRequiredDeposit > 0) {
      const depositPaid = assignFormData.depositPaid ? parseFloat(assignFormData.depositPaid) : 0;

      if (depositPaid < currentRequiredDeposit) {
        showError(`Deposit required: ₱${currentRequiredDeposit.toLocaleString()}. Current: ₱${depositPaid.toLocaleString()}`);
        setLoading(false);
        return;
      }
    }

    // Validate advance if provided
    if (assignFormData.advanceAmount && parseFloat(assignFormData.advanceAmount) > 0 && requiredAdvance > 0) {
      const advancePaid = parseFloat(assignFormData.advanceAmount);
      if (advancePaid < requiredAdvance) {
        showError(`Advance required: ₱${requiredAdvance.toLocaleString()}. Current: ₱${advancePaid.toLocaleString()}`);
        setLoading(false);
        return;
      }
    }

    // Validate utility deposit if provided
    if (assignFormData.utilityDepositAmount && parseFloat(assignFormData.utilityDepositAmount) > 0 && requiredUtility > 0) {
      const utilityPaid = parseFloat(assignFormData.utilityDepositAmount);
      if (utilityPaid < requiredUtility) {
        showError(`Utility deposit required: ₱${requiredUtility.toLocaleString()}. Current: ₱${utilityPaid.toLocaleString()}`);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: assignFormData.tenantId,
          startDate: assignFormData.startDate,
          monthlyRate: parseFloat(assignFormData.monthlyRate),
          depositPaid: assignFormData.depositPaid ? parseFloat(assignFormData.depositPaid) : undefined,
          advanceAmount: assignFormData.advanceAmount ? parseFloat(assignFormData.advanceAmount) : undefined,
          utilityDepositAmount: assignFormData.utilityDepositAmount ? parseFloat(assignFormData.utilityDepositAmount) : undefined,
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
          advanceAmount: '',
          utilityDepositAmount: '',
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
                onClick={() => setShowAddOccupantModal(true)}
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
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
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
                    <span className="font-medium text-gray-900">Notes:</span>
                    <p className="mt-1 text-sm text-gray-900">{currentTenant.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-900">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="mt-2">No tenant currently assigned to this room</p>
          </div>
        )}
      </div>

      {/* Occupants Section */}
      {occupants.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Other Occupants</h3>
            <button
              onClick={() => setShowAddOccupantModal(true)}
              className="inline-flex items-center px-3 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Occupant
            </button>
          </div>
          <div className="space-y-3">
            {Array.isArray(occupants) && occupants.map((occupant) => (
              <div key={occupant.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {occupant.first_name || ''} {occupant.last_name || ''}
                    </h4>
                    {occupant.relationship_to_tenant && (
                      <p className="text-sm text-gray-900 capitalize">
                        {String(occupant.relationship_to_tenant)}
                      </p>
                    )}
                    {occupant.phone && (
                      <p className="text-sm text-gray-900">Phone: {occupant.phone}</p>
                    )}
                    {occupant.email && (
                      <p className="text-sm text-gray-900">Email: {occupant.email}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-900">
                    <div>
                      Moved in: {new Date(occupant.move_in_date).toLocaleDateString()}
                    </div>
                    {occupant.move_out_date && (
                      <div>
                        Moved out: {new Date(occupant.move_out_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    <p className="text-sm text-gray-900">{assignment.email}</p>
                  </div>
                  <div className="text-right text-sm text-gray-900">
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
                  <label className="block text-sm font-medium text-gray-900">Select Tenant</label>
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
                  <label className="block text-sm font-medium text-gray-900">Start Date</label>
                  <input
                    type="date"
                    value={assignFormData.startDate}
                    onChange={(e) => setAssignFormData({ ...assignFormData, startDate: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900">Monthly Rate (₱)</label>
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
                  <label className="block text-sm font-medium text-gray-900">
                    Deposit Paid (₱)
                    {room?.depositRequired && (
                      <span className="ml-2 text-red-600">*</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={assignFormData.depositPaid}
                    onChange={(e) => setAssignFormData({ ...assignFormData, depositPaid: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder={room?.depositRequired ? "Required" : "Optional"}
                    required={room?.depositRequired}
                  />
                  {(room?.depositRequired || buildingConfig) && (
                    <p className="mt-1 text-sm text-gray-900">
                      <strong>Required deposit:</strong> ₱{calculateRequiredDeposit().toLocaleString()}
                    </p>
                  )}
                  {assignFormData.depositPaid && parseFloat(assignFormData.depositPaid) < calculateRequiredDeposit() && (
                    <p className="mt-1 text-sm text-red-600">
                      Insufficient deposit. Required: ₱{calculateRequiredDeposit().toLocaleString()}
                    </p>
                  )}
                  {buildingConfig && requiredAdvance > 0 && (
                    <p className="mt-1 text-sm text-gray-600">
                      <strong>Required advance:</strong> ₱{requiredAdvance.toLocaleString()}
                    </p>
                  )}
                  {buildingConfig && requiredUtility > 0 && (
                    <p className="mt-1 text-sm text-gray-600">
                      <strong>Required utility deposit:</strong> ₱{requiredUtility.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Advance Payment */}
                {buildingConfig && requiredAdvance > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900">
                      Advance Payment (₱) (Optional)
                      <span className="ml-2 text-gray-500">(Min: ₱{requiredAdvance.toLocaleString()})</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={assignFormData.advanceAmount}
                      onChange={(e) => setAssignFormData({ ...assignFormData, advanceAmount: e.target.value })}
                      className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Optional"
                    />
                    <p className="mt-1 text-sm text-gray-600">
                      Any advance rent payment made at the start of the lease
                    </p>
                  </div>
                )}

                {/* Utility Deposit */}
                {buildingConfig && requiredUtility > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900">
                      Utility Deposit (₱) (Optional)
                      <span className="ml-2 text-gray-500">(Min: ₱{requiredUtility.toLocaleString()})</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={assignFormData.utilityDepositAmount}
                      onChange={(e) => setAssignFormData({ ...assignFormData, utilityDepositAmount: e.target.value })}
                      className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Optional"
                    />
                    <p className="mt-1 text-sm text-gray-600">
                      Utility deposit amount for this building
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-900">Notes</label>
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
                    className="flex-1 bg-gray-300 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
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
                  <label className="block text-sm font-medium text-gray-900">End Date</label>
                  <input
                    type="date"
                    value={unassignFormData.endDate}
                    onChange={(e) => setUnassignFormData({ ...unassignFormData, endDate: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900">Notes</label>
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
                    className="flex-1 bg-gray-300 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Occupant Modal */}
      <AddOccupantModal
        isOpen={showAddOccupantModal}
        onClose={() => setShowAddOccupantModal(false)}
        roomId={roomId}
        tenantId={currentTenant?.tenant_id}
        onSuccess={() => {
          fetchOccupants();
          onAssignmentChange();
        }}
      />
    </div>
  );
} 