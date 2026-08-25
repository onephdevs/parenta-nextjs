'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useNotifications } from '@/hooks/useNotifications';
import {
  LeasePackageSelect,
  LeasePackageSummary,
  amountsFromLeasePackage,
  useLeasePackageTemplates,
} from '@/components/features/leasing/LeasePackageFields';
import { addMonthsToDate } from '@/components/features/tenants/profile/leaseTemplates';

interface TenantOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  currentRoomId?: string | null;
}

interface BuildingOption {
  id: string;
  name: string;
}

interface RoomOption {
  id: string;
  roomNumber: string;
  buildingId: string;
  monthlyRate: number;
  roomStatus: string;
}

interface NewLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (leaseId: string) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewLeaseModal({ isOpen, onClose, onCreated }: NewLeaseModalProps) {
  const router = useRouter();
  const { showSuccess, showError } = useNotifications();
  const { packages, loading: packagesLoading } = useLeasePackageTemplates();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tenantId, setTenantId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [monthlyRate, setMonthlyRate] = useState('');

  const vacantRooms = useMemo(
    () =>
      rooms.filter(
        (room) =>
          room.buildingId === buildingId &&
          (room.roomStatus === 'vacant' || room.id === roomId)
      ),
    [rooms, buildingId, roomId]
  );

  const selectedPackage = packages.find((pkg) => pkg.id === packageId) || null;
  const rent = Number(monthlyRate) || 0;
  const packageAmounts = amountsFromLeasePackage(selectedPackage, rent);
  const endDate =
    selectedPackage?.termMonths && startDate
      ? addMonthsToDate(startDate, selectedPackage.termMonths)
      : '';

  useEffect(() => {
    if (!isOpen) return;
    setTenantId('');
    setBuildingId('');
    setRoomId('');
    setPackageId('');
    setStartDate(todayIso());
    setMonthlyRate('');

    let cancelled = false;
    const load = async () => {
      setLoadingOptions(true);
      try {
        const [tenantsRes, buildingsRes, roomsRes] = await Promise.all([
          fetch('/api/tenants?limit=1000', { credentials: 'include' }),
          fetch('/api/buildings', { credentials: 'include' }),
          fetch('/api/rooms', { credentials: 'include' }),
        ]);
        const [tenantsJson, buildingsJson, roomsJson] = await Promise.all([
          tenantsRes.json(),
          buildingsRes.json(),
          roomsRes.json(),
        ]);
        if (cancelled) return;

        const tenantRows: unknown[] = Array.isArray(tenantsJson.data?.tenants)
          ? tenantsJson.data.tenants
          : Array.isArray(tenantsJson.data)
            ? tenantsJson.data
            : [];
        setTenants(
          tenantRows
            .map((item) => {
              const row = item as Record<string, unknown>;
              return {
                id: String(row.id),
                firstName: String(row.firstName ?? row.first_name ?? ''),
                lastName: String(row.lastName ?? row.last_name ?? ''),
                email: row.email != null ? String(row.email) : undefined,
                currentRoomId: (row.currentRoomId ?? row.current_room_id ?? null) as
                  | string
                  | null,
              };
            })
            .filter((tenant) => !tenant.currentRoomId)
        );

        const buildingRows =
          buildingsJson.data?.buildings || buildingsJson.buildings || buildingsJson.data || [];
        setBuildings(
          Array.isArray(buildingRows)
            ? buildingRows.map((building: { id: string; name: string }) => ({
                id: building.id,
                name: building.name,
              }))
            : []
        );

        const roomRows = roomsJson.data || roomsJson.rooms || [];
        setRooms(
          Array.isArray(roomRows)
            ? roomRows.map(
                (room: {
                  id: string;
                  roomNumber?: string;
                  room_number?: string;
                  buildingId?: string;
                  building_id?: string;
                  monthlyRate?: number;
                  monthly_rate?: number;
                  roomStatus?: string;
                  room_status?: string;
                }) => ({
                  id: room.id,
                  roomNumber: String(room.roomNumber ?? room.room_number ?? ''),
                  buildingId: String(room.buildingId ?? room.building_id ?? ''),
                  monthlyRate: Number(room.monthlyRate ?? room.monthly_rate ?? 0),
                  roomStatus: String(room.roomStatus ?? room.room_status ?? ''),
                })
              )
            : []
        );
      } catch (error) {
        console.error('Failed to load new-lease options', error);
        showError('Failed to load tenants and vacant rooms');
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, showError]);

  useEffect(() => {
    if (!roomId) {
      setMonthlyRate('');
      return;
    }
    const room = rooms.find((item) => item.id === roomId);
    if (room) setMonthlyRate(String(room.monthlyRate || 0));
  }, [roomId, rooms]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId) {
      showError('Select a tenant');
      return;
    }
    if (!roomId) {
      showError('Select a vacant room');
      return;
    }
    if (!packageId) {
      showError('Select a lease template');
      return;
    }
    if (!startDate) {
      showError('Set the lease start date');
      return;
    }
    if (!(Number(monthlyRate) > 0)) {
      showError('Monthly rent must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          startDate,
          endDate: endDate || null,
          monthlyRate: Number(monthlyRate),
          depositPaid: packageAmounts.depositAmount || undefined,
          advanceAmount: packageAmounts.advanceAmount || undefined,
          leasePackageTemplateId: packageId,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || json.details || 'Failed to create lease');
      }
      const leaseId = String(json.data?.assignment?.id || json.data?.id || '');
      showSuccess(json.message || 'Lease created');
      onClose();
      if (leaseId) {
        onCreated?.(leaseId);
        router.push(`/admin/leasing/${leaseId}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create lease');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="New lease"
      description="Assign an existing tenant to a vacant room. Use New tenant if they are not in the system yet."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="new-lease-form" isLoading={saving} disabled={saving}>
            Create lease
          </Button>
        </>
      }
    >
      <form id="new-lease-form" className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <FormField
          label="Tenant"
          htmlFor="new-lease-tenant"
          required
          hint={
            tenants.length === 0 && !loadingOptions
              ? 'No unassigned tenants. Add a tenant first, or they already have an active lease.'
              : 'Only tenants without a current room are listed.'
          }
        >
          <Select
            id="new-lease-tenant"
            value={tenantId}
            disabled={loadingOptions}
            onChange={(event) => setTenantId(event.target.value)}
            required
          >
            <option value="">{loadingOptions ? 'Loading tenants…' : 'Select tenant'}</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {`${tenant.firstName} ${tenant.lastName}`.trim()}
                {tenant.email ? ` · ${tenant.email}` : ''}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Property" htmlFor="new-lease-building" required>
            <Select
              id="new-lease-building"
              value={buildingId}
              disabled={loadingOptions}
              onChange={(event) => {
                setBuildingId(event.target.value);
                setRoomId('');
              }}
              required
            >
              <option value="">{loadingOptions ? 'Loading…' : 'Select property'}</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Room"
            htmlFor="new-lease-room"
            required
            hint={!buildingId ? 'Select a property first' : undefined}
          >
            <Select
              id="new-lease-room"
              value={roomId}
              disabled={!buildingId}
              onChange={(event) => setRoomId(event.target.value)}
              required
            >
              <option value="">
                {!buildingId
                  ? 'Select a property first'
                  : vacantRooms.length === 0
                    ? 'No vacant rooms'
                    : 'Select room'}
              </option>
              {vacantRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  Room {room.roomNumber} (₱{Number(room.monthlyRate || 0).toLocaleString()}/month)
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Lease template" htmlFor="new-lease-package" required>
          <LeasePackageSelect
            id="new-lease-package"
            value={packageId}
            packages={packages}
            loading={packagesLoading}
            required
            onChange={(id) => setPackageId(id)}
          />
        </FormField>
        <LeasePackageSummary template={selectedPackage} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Start date" htmlFor="new-lease-start" required>
            <Input
              id="new-lease-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </FormField>
          <FormField
            label="End date"
            htmlFor="new-lease-end"
            hint={selectedPackage?.termMonths ? 'From the selected template term' : 'Open-ended'}
          >
            <Input id="new-lease-end" type="date" value={endDate} disabled />
          </FormField>
        </div>

        <FormField label="Monthly rent (₱)" htmlFor="new-lease-rent" required>
          <Input
            id="new-lease-rent"
            type="number"
            min="0"
            step="0.01"
            value={monthlyRate}
            onChange={(event) => setMonthlyRate(event.target.value)}
            required
          />
        </FormField>
      </form>
    </Dialog>
  );
}
