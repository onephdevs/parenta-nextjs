'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, User } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import SectionedFormShell, { SectionedFormSection, SectionCard } from '@/components/ui/SectionedFormShell';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { compareByRoomThenName, compareNatural } from '@/lib/utils/natural-sort';
import { sortPropertiesByName } from '@/lib/format/property-sort';
import ProcessPaymentClient from '@/components/features/payments/ProcessPaymentClient';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  currentRoomId?: string;
  currentRoomNumber?: string;
  currentBuildingId?: string;
  currentBuildingName?: string;
  buildingName?: string;
  roomNumber?: string;
}

interface BuildingOption {
  id: string;
  name: string;
}

interface RoomOption {
  id: string;
  roomNumber: string;
  roomStatus?: string;
  buildingId?: string;
}

function unitLabel(roomNumber: string): string {
  const value = (roomNumber || '').trim();
  if (!value) return 'Unit';
  return /^unit\b/i.test(value) ? value : `Unit ${value}`;
}

function tenantRoomLabel(tenant: Tenant): string {
  const building = tenant.currentBuildingName || tenant.buildingName || '';
  const room = tenant.currentRoomNumber || tenant.roomNumber || '';
  if (building && room) return `${building} · ${unitLabel(room)}`;
  if (room) return unitLabel(room);
  if (building) return building;
  return '';
}

function normalizeTenant(raw: Tenant & Record<string, unknown>): Tenant {
  return {
    ...raw,
    currentRoomId: raw.currentRoomId || (raw.current_room_id as string | undefined),
    currentRoomNumber:
      raw.currentRoomNumber ||
      (raw.current_room_number as string | undefined) ||
      raw.roomNumber,
    currentBuildingId:
      raw.currentBuildingId ||
      (raw.current_building_id as string | undefined) ||
      (raw.buildingId as string | undefined),
    currentBuildingName:
      raw.currentBuildingName ||
      (raw.current_building_name as string | undefined) ||
      raw.buildingName,
    roomNumber:
      raw.roomNumber ||
      raw.currentRoomNumber ||
      (raw.current_room_number as string | undefined),
    buildingName:
      raw.buildingName ||
      raw.currentBuildingName ||
      (raw.current_building_name as string | undefined),
  };
}

function parseBuildings(json: unknown): BuildingOption[] {
  const root = json as {
    data?: { buildings?: BuildingOption[] } | BuildingOption[];
    buildings?: BuildingOption[];
  };
  const list = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.data?.buildings)
      ? root.data.buildings
      : Array.isArray(root.buildings)
        ? root.buildings
        : [];
  return sortPropertiesByName(list.map((b) => ({ id: String(b.id), name: String(b.name || '') })));
}

function parseRooms(json: unknown): RoomOption[] {
  const root = json as { data?: RoomOption[] | { rooms?: RoomOption[] } };
  const list = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.data?.rooms)
      ? root.data.rooms
      : [];
  return [...list]
    .map((r) => ({
      id: String(r.id),
      roomNumber: String(r.roomNumber || (r as { room_number?: string }).room_number || ''),
      roomStatus: r.roomStatus || (r as { room_status?: string }).room_status,
      buildingId: r.buildingId || (r as { building_id?: string }).building_id,
    }))
    .sort((a, b) => compareNatural(a.roomNumber, b.roomNumber));
}

interface PaymentFormProps {
  initialData?: { tenantId?: string; invoiceId?: string; amount?: string };
  onCancel?: () => void;
  onSuccess?: () => void;
  mode?: 'page' | 'modal';
  isOpen?: boolean;
  /** Prefills (and filters) the property dropdown. */
  buildingId?: string;
  /** Prefills the unit dropdown. */
  roomId?: string;
}

type SectionId = 'tenant' | 'payment';

const SECTIONS: SectionedFormSection<SectionId>[] = [
  {
    id: 'tenant',
    label: 'Tenant',
    icon: <User className="h-4 w-4" />,
    title: 'Tenant Selection',
    subtitle: 'Choose the property, unit, and tenant making this payment',
  },
  {
    id: 'payment',
    label: 'Payment Details',
    icon: <CreditCard className="h-4 w-4" />,
    title: 'Process Payment',
    subtitle: 'Select an invoice and confirm payment details',
  },
];

export default function PaymentForm({
  initialData,
  onCancel,
  onSuccess,
  mode = 'page',
  isOpen = true,
  buildingId,
  roomId,
}: PaymentFormProps) {
  const { addNotification } = useNotifications();
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingId || '');
  const [selectedRoomId, setSelectedRoomId] = useState(roomId || '');
  const [tenantId, setTenantId] = useState(initialData?.tenantId || '');
  const [activeSection, setActiveSection] = useState<SectionId>('tenant');

  const selectedTenant = tenants.find((t) => t.id === tenantId) || null;

  useEffect(() => {
    if (mode === 'modal' && !isOpen) return;
    setSelectedBuildingId(buildingId || '');
    setSelectedRoomId(roomId || '');
    setTenantId(initialData?.tenantId || '');
    setActiveSection('tenant');
  }, [mode, isOpen, buildingId, roomId, initialData?.tenantId]);

  useEffect(() => {
    if (mode === 'modal' && !isOpen) return;
    let cancelled = false;
    void (async () => {
      setBuildingsLoading(true);
      try {
        const res = await fetch('/api/buildings', { credentials: 'include' });
        const json = await res.json();
        if (!cancelled) setBuildings(parseBuildings(json));
      } catch {
        if (!cancelled) setBuildings([]);
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode]);

  useEffect(() => {
    if (mode === 'modal' && !isOpen) return;
    if (!selectedBuildingId) {
      setRooms([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setRoomsLoading(true);
      try {
        const res = await fetch(
          `/api/rooms?buildingId=${encodeURIComponent(selectedBuildingId)}`,
          { credentials: 'include' }
        );
        const json = await res.json();
        if (!cancelled) setRooms(parseRooms(json));
      } catch {
        if (!cancelled) setRooms([]);
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedBuildingId, isOpen, mode]);

  useEffect(() => {
    if (mode === 'modal' && !isOpen) return;
    let cancelled = false;
    void (async () => {
      setTenantsLoading(true);
      try {
        const params = new URLSearchParams({
          limit: '300',
          status: 'active',
        });
        if (selectedBuildingId) params.set('buildingId', selectedBuildingId);
        const tenantsRes = await fetch(`/api/tenants?${params.toString()}`, {
          credentials: 'include',
        });

        if (!tenantsRes.ok) {
          if (!cancelled) setTenants([]);
          return;
        }
        const tenantsData = await tenantsRes.json();
        let tenantsList: Tenant[] = [];
        if (tenantsData.success && tenantsData.data) {
          tenantsList = Array.isArray(tenantsData.data.tenants)
            ? tenantsData.data.tenants
            : Array.isArray(tenantsData.data)
              ? tenantsData.data
              : [];
        } else if (Array.isArray(tenantsData.tenants)) {
          tenantsList = tenantsData.tenants;
        } else if (Array.isArray(tenantsData.data)) {
          tenantsList = tenantsData.data;
        }

        let list = (Array.isArray(tenantsList) ? tenantsList : []).map((t) =>
          normalizeTenant(t as Tenant & Record<string, unknown>)
        );
        if (selectedBuildingId) {
          list = list.filter(
            (t) => !t.currentBuildingId || t.currentBuildingId === selectedBuildingId
          );
        }
        if (!cancelled) setTenants([...list].sort(compareByRoomThenName));
      } catch (error) {
        console.error('Error loading tenants:', error);
        if (!cancelled) {
          addNotification('Failed to load tenant data', 'error');
          setTenants([]);
        }
      } finally {
        if (!cancelled) setTenantsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addNotification, selectedBuildingId, isOpen, mode]);

  const visibleTenants = useMemo(() => {
    if (!selectedRoomId) return tenants;
    return tenants.filter((t) => t.currentRoomId === selectedRoomId);
  }, [tenants, selectedRoomId]);

  const handleBuildingChange = (nextBuildingId: string) => {
    setSelectedBuildingId(nextBuildingId);
    setSelectedRoomId('');
    setTenantId('');
    setActiveSection('tenant');
  };

  const handleRoomChange = (nextRoomId: string) => {
    setSelectedRoomId(nextRoomId);
    if (!nextRoomId) {
      setTenantId('');
      return;
    }
    const occupant = tenants.find((t) => t.currentRoomId === nextRoomId);
    setTenantId(occupant?.id || '');
  };

  const handleTenantChange = (nextTenantId: string) => {
    setTenantId(nextTenantId);
    const tenant = tenants.find((t) => t.id === nextTenantId);
    if (tenant?.currentBuildingId) setSelectedBuildingId(tenant.currentBuildingId);
    if (tenant?.currentRoomId) setSelectedRoomId(tenant.currentRoomId);
  };

  const goToPayment = () => {
    if (!tenantId) {
      addNotification('Select a tenant first', 'error');
      setActiveSection('tenant');
      return;
    }
    setActiveSection('payment');
  };

  if (mode === 'modal' && !isOpen) return null;

  const propertyHint = buildingsLoading
    ? 'Loading properties…'
    : `${buildings.length} propert${buildings.length === 1 ? 'y' : 'ies'}`;
  const unitHint = !selectedBuildingId
    ? 'Select a property first'
    : roomsLoading
      ? 'Loading units…'
      : rooms.length === 0
        ? 'No units in this property'
        : `${rooms.length} unit${rooms.length === 1 ? '' : 's'} in this property`;
  const tenantHint = tenantsLoading
    ? selectedBuildingId
      ? 'Loading tenants in this property…'
      : 'Loading tenants…'
    : visibleTenants.length === 0
      ? selectedRoomId
        ? 'No tenant assigned to this unit'
        : selectedBuildingId
          ? 'No active tenants in this property'
          : 'No tenants found'
      : selectedRoomId
        ? `${visibleTenants.length} tenant${visibleTenants.length === 1 ? '' : 's'} in this unit`
        : selectedBuildingId
          ? `${visibleTenants.length} tenant${visibleTenants.length === 1 ? '' : 's'} in this property`
          : `${visibleTenants.length} tenant${visibleTenants.length === 1 ? '' : 's'}`;

  const shellProps = {
    eyebrow: 'Record payment',
    entityLabel: selectedTenant
      ? `${selectedTenant.firstName} ${selectedTenant.lastName}`
      : undefined,
    sections: SECTIONS,
    activeSection,
    onSectionChange: (id: SectionId) => {
      if (id === 'payment' && !tenantId) {
        addNotification('Select a tenant first', 'error');
        setActiveSection('tenant');
        return;
      }
      setActiveSection(id);
    },
    onCancel,
    primaryLabel: 'Continue',
    primaryType: 'button' as const,
    onPrimary: goToPayment,
    hidePrimary: activeSection === 'payment',
    primaryDisabled: !tenantId,
    size: 'wide' as const,
  };

  const body = (
    <div className="space-y-6">
      {activeSection === 'tenant' && (
        <SectionCard title="Tenant Selection">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Property" htmlFor="paymentPropertyId" required hint={propertyHint}>
              <Select
                id="paymentPropertyId"
                name="paymentPropertyId"
                value={selectedBuildingId}
                onChange={(e) => handleBuildingChange(e.target.value)}
              >
                <option value="">Select a property</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Unit" htmlFor="paymentRoomId" required hint={unitHint}>
              <Select
                id="paymentRoomId"
                name="paymentRoomId"
                value={selectedRoomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                isDisabled={!selectedBuildingId || roomsLoading}
              >
                <option value="">Select a unit</option>
                {rooms.map((room) => {
                  const occupant = tenants.find((t) => t.currentRoomId === room.id);
                  return (
                    <option key={room.id} value={room.id}>
                      {unitLabel(room.roomNumber)}
                      {occupant
                        ? ` · ${occupant.firstName} ${occupant.lastName}`
                        : ' · Vacant'}
                    </option>
                  );
                })}
              </Select>
            </FormField>
          </div>

          <FormField label="Tenant" htmlFor="tenantId" required hint={tenantHint} className="mt-4">
            <Select
              id="tenantId"
              name="tenantId"
              value={tenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              isDisabled={!selectedBuildingId}
            >
              <option value="">Select a tenant</option>
              {tenantsLoading ? (
                <option value="" disabled>
                  Loading tenants...
                </option>
              ) : visibleTenants.length > 0 ? (
                visibleTenants.map((tenant) => {
                  const unit = tenantRoomLabel(tenant);
                  return (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName}
                      {unit ? ` (${unit})` : ''}
                    </option>
                  );
                })
              ) : (
                <option value="" disabled>
                  No tenants found
                </option>
              )}
            </Select>
          </FormField>
        </SectionCard>
      )}

      {activeSection === 'payment' &&
        (tenantId ? (
          <ProcessPaymentClient
            key={tenantId}
            embedded
            initialTenantId={tenantId}
            initialInvoiceId={initialData?.invoiceId}
            initialAmount={initialData?.amount}
            onCancel={() => setActiveSection('tenant')}
            onSuccess={() => onSuccess?.()}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
            Select a tenant to load the process payment form.
          </p>
        ))}
    </div>
  );

  return (
    <div className="text-gray-900">
      {mode === 'page' ? (
        <SectionedFormShell mode="page" {...shellProps}>
          {body}
        </SectionedFormShell>
      ) : (
        <SectionedFormShell mode="modal" isOpen={isOpen} {...shellProps}>
          {body}
        </SectionedFormShell>
      )}
    </div>
  );
}
