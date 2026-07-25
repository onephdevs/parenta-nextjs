'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/forms/FormField';
import AddOccupantModal from './AddOccupantModal';
import { Plus, UserPlus, X } from 'lucide-react';

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
  onAssignmentChange,
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
    notes: '',
  });
  const [buildingConfig, setBuildingConfig] = useState<any>(null);
  const [requiredDeposit, setRequiredDeposit] = useState(0);
  const [requiredAdvance, setRequiredAdvance] = useState(0);
  const [requiredUtility, setRequiredUtility] = useState(0);
  const [unassignFormData, setUnassignFormData] = useState({
    endDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

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

  const fetchOccupants = async () => {
    try {
      const response = await fetch(`/api/occupants?roomId=${roomId}&activeOnly=true`);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setOccupants(result.data);
      } else {
        setOccupants([]);
      }
    } catch (error) {
      console.error('Error fetching occupants:', error);
      setOccupants([]);
    }
  };

  useEffect(() => {
    if (showAssignForm) {
      fetchAvailableTenants();
    }
    fetchOccupants();
  }, [showAssignForm, roomId]);

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

  useEffect(() => {
    if (buildingConfig && assignFormData.monthlyRate) {
      const monthlyRate = parseFloat(assignFormData.monthlyRate) || roomMonthlyRate;
      if (monthlyRate > 0 && buildingConfig.buildingId) {
        calculateRequiredAmounts(buildingConfig.buildingId, monthlyRate);
      }
    }
  }, [assignFormData.monthlyRate, buildingConfig]);

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

  const calculateRequiredDeposit = (): number => {
    if (buildingConfig) {
      return requiredDeposit;
    }
    if (!room?.depositRequired) return 0;

    const monthlyRate = parseFloat(assignFormData.monthlyRate) || roomMonthlyRate;

    switch (room.depositType) {
      case 'one_month':
        return monthlyRate;
      case 'percentage':
        return room.depositPercentage ? (monthlyRate * room.depositPercentage) / 100 : 0;
      case 'fixed':
        return room.depositFixedAmount || 0;
      default:
        return 0;
    }
  };

  const handleAssignTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const currentRequiredDeposit = calculateRequiredDeposit();
    if (currentRequiredDeposit > 0) {
      const depositPaid = assignFormData.depositPaid ? parseFloat(assignFormData.depositPaid) : 0;

      if (depositPaid < currentRequiredDeposit) {
        showError(
          `Deposit required: ₱${currentRequiredDeposit.toLocaleString()}. Current: ₱${depositPaid.toLocaleString()}`
        );
        setLoading(false);
        return;
      }
    }

    if (assignFormData.advanceAmount && parseFloat(assignFormData.advanceAmount) > 0 && requiredAdvance > 0) {
      const advancePaid = parseFloat(assignFormData.advanceAmount);
      if (advancePaid < requiredAdvance) {
        showError(
          `Advance required: ₱${requiredAdvance.toLocaleString()}. Current: ₱${advancePaid.toLocaleString()}`
        );
        setLoading(false);
        return;
      }
    }

    if (
      assignFormData.utilityDepositAmount &&
      parseFloat(assignFormData.utilityDepositAmount) > 0 &&
      requiredUtility > 0
    ) {
      const utilityPaid = parseFloat(assignFormData.utilityDepositAmount);
      if (utilityPaid < requiredUtility) {
        showError(
          `Utility deposit required: ₱${requiredUtility.toLocaleString()}. Current: ₱${utilityPaid.toLocaleString()}`
        );
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
          utilityDepositAmount: assignFormData.utilityDepositAmount
            ? parseFloat(assignFormData.utilityDepositAmount)
            : undefined,
          notes: assignFormData.notes,
        }),
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
          notes: '',
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
          notes: unassignFormData.notes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Tenant unassigned successfully!');
        setShowUnassignForm(false);
        setUnassignFormData({
          endDate: new Date().toISOString().split('T')[0],
          notes: '',
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

  const depositInsufficient =
    assignFormData.depositPaid &&
    parseFloat(assignFormData.depositPaid) < calculateRequiredDeposit();

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Current Tenant</h3>
          {currentTenant ? (
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddOccupantModal(true)}
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                Add Occupant
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowUnassignForm(true)}
                leftIcon={<X className="h-4 w-4" />}
              >
                End Assignment
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={() => setShowAssignForm(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Assign Tenant
            </Button>
          )}
        </div>

        {currentTenant ? (
          <Alert variant="success" className="border-green-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
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
                    <span className="font-medium">Move-in Date:</span>{' '}
                    {new Date(currentTenant.start_date).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Monthly Rate:</span> ₱
                    {parseFloat(currentTenant.monthly_rate.toString()).toLocaleString()}
                  </div>
                  {currentTenant.deposit_paid && (
                    <div>
                      <span className="font-medium">Deposit Paid:</span> ₱
                      {parseFloat(currentTenant.deposit_paid.toString()).toLocaleString()}
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
          </Alert>
        ) : (
          <div className="text-center py-8 text-gray-900">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <p className="mt-2">No tenant currently assigned to this room</p>
          </div>
        )}
      </Card>

      {occupants.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Other Occupants</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddOccupantModal(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Occupant
            </Button>
          </div>
          <div className="space-y-3">
            {Array.isArray(occupants) &&
              occupants.map((occupant) => (
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
                      {occupant.phone && <p className="text-sm text-gray-900">Phone: {occupant.phone}</p>}
                      {occupant.email && <p className="text-sm text-gray-900">Email: {occupant.email}</p>}
                    </div>
                    <div className="text-right text-sm text-gray-900">
                      <div>Moved in: {new Date(occupant.move_in_date).toLocaleDateString()}</div>
                      {occupant.move_out_date && (
                        <div>Moved out: {new Date(occupant.move_out_date).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {assignmentHistory.length > 0 && (
        <Card>
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
                    <div className="font-medium">
                      ₱{parseFloat(assignment.monthly_rate.toString()).toLocaleString()}/month
                    </div>
                    <div
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        assignment.assignment_status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {assignment.assignment_status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog
        isOpen={showAssignForm}
        onClose={() => setShowAssignForm(false)}
        title="Assign Tenant to Room"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAssignForm(false)}>
              Cancel
            </Button>
            <Button type="submit" form="assign-tenant-form" variant="primary" isLoading={loading}>
              Assign Tenant
            </Button>
          </>
        }
      >
        <form id="assign-tenant-form" onSubmit={handleAssignTenant} className="space-y-4">
          <FormField htmlFor="tenantId" label="Select Tenant" required>
            <Select
              id="tenantId"
              value={assignFormData.tenantId}
              onChange={(e) => setAssignFormData({ ...assignFormData, tenantId: e.target.value })}
              required
            >
              <option value="">Choose a tenant...</option>
              {availableTenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.first_name} {tenant.last_name} ({tenant.email})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField htmlFor="startDate" label="Start Date" required>
            <Input
              id="startDate"
              type="date"
              value={assignFormData.startDate}
              onChange={(e) => setAssignFormData({ ...assignFormData, startDate: e.target.value })}
              min="2000-01-01"
              max="2099-12-31"
              required
              style={{ colorScheme: 'light' }}
            />
          </FormField>

          <FormField htmlFor="monthlyRate" label="Monthly Rate (₱)" required>
            <Input
              id="monthlyRate"
              type="number"
              step="0.01"
              value={assignFormData.monthlyRate}
              onChange={(e) => setAssignFormData({ ...assignFormData, monthlyRate: e.target.value })}
              required
            />
          </FormField>

          <FormField
            htmlFor="depositPaid"
            label={`Deposit Paid (₱)${room?.depositRequired ? ' *' : ''}`}
            required={room?.depositRequired}
            hint={
              room?.depositRequired || buildingConfig
                ? `Required deposit: ₱${calculateRequiredDeposit().toLocaleString()}${
                    buildingConfig && requiredAdvance > 0
                      ? `. Required advance: ₱${requiredAdvance.toLocaleString()}`
                      : ''
                  }${
                    buildingConfig && requiredUtility > 0
                      ? `. Required utility deposit: ₱${requiredUtility.toLocaleString()}`
                      : ''
                  }`
                : undefined
            }
            error={
              depositInsufficient
                ? `Insufficient deposit. Required: ₱${calculateRequiredDeposit().toLocaleString()}`
                : undefined
            }
          >
            <Input
              id="depositPaid"
              type="number"
              step="0.01"
              value={assignFormData.depositPaid}
              onChange={(e) => setAssignFormData({ ...assignFormData, depositPaid: e.target.value })}
              placeholder={room?.depositRequired ? 'Required' : 'Optional'}
              required={room?.depositRequired}
              isInvalid={Boolean(depositInsufficient)}
            />
          </FormField>

          {buildingConfig && requiredAdvance > 0 && (
            <FormField
              htmlFor="advanceAmount"
              label="Advance Payment (₱) (Optional)"
              hint={`Min: ₱${requiredAdvance.toLocaleString()}. Any advance rent payment made at the start of the lease.`}
            >
              <Input
                id="advanceAmount"
                type="number"
                step="0.01"
                value={assignFormData.advanceAmount}
                onChange={(e) => setAssignFormData({ ...assignFormData, advanceAmount: e.target.value })}
                placeholder="Optional"
              />
            </FormField>
          )}

          {buildingConfig && requiredUtility > 0 && (
            <FormField
              htmlFor="utilityDepositAmount"
              label="Utility Deposit (₱) (Optional)"
              hint={`Min: ₱${requiredUtility.toLocaleString()}. Utility deposit amount for this building.`}
            >
              <Input
                id="utilityDepositAmount"
                type="number"
                step="0.01"
                value={assignFormData.utilityDepositAmount}
                onChange={(e) =>
                  setAssignFormData({ ...assignFormData, utilityDepositAmount: e.target.value })
                }
                placeholder="Optional"
              />
            </FormField>
          )}

          <FormField htmlFor="assignNotes" label="Notes">
            <Textarea
              id="assignNotes"
              value={assignFormData.notes}
              onChange={(e) => setAssignFormData({ ...assignFormData, notes: e.target.value })}
              rows={4}
              placeholder="Optional notes about the assignment..."
            />
          </FormField>
        </form>
      </Dialog>

      {currentTenant && (
        <Dialog
          isOpen={showUnassignForm}
          onClose={() => setShowUnassignForm(false)}
          title="End Tenant Assignment"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowUnassignForm(false)}>
                Cancel
              </Button>
              <Button type="submit" form="unassign-tenant-form" variant="danger" isLoading={loading}>
                End Assignment
              </Button>
            </>
          }
        >
          <Alert variant="warning" className="mb-4">
            This will end the assignment for{' '}
            <strong>
              {currentTenant.first_name} {currentTenant.last_name}
            </strong>{' '}
            and mark the room as vacant.
          </Alert>
          <form id="unassign-tenant-form" onSubmit={handleUnassignTenant} className="space-y-4">
            <FormField htmlFor="endDate" label="End Date" required>
              <Input
                id="endDate"
                type="date"
                value={unassignFormData.endDate}
                onChange={(e) => setUnassignFormData({ ...unassignFormData, endDate: e.target.value })}
                min={unassignFormData.startDate || '2000-01-01'}
                max="2099-12-31"
                required
                style={{ colorScheme: 'light' }}
              />
            </FormField>

            <FormField htmlFor="unassignNotes" label="Notes">
              <Textarea
                id="unassignNotes"
                value={unassignFormData.notes}
                onChange={(e) => setUnassignFormData({ ...unassignFormData, notes: e.target.value })}
                rows={4}
                placeholder="Reason for ending assignment..."
              />
            </FormField>
          </form>
        </Dialog>
      )}

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
